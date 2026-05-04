import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Center,
  Html,
  QuadraticBezierLine,
  ContactShadows,
  Environment,
  OrbitControls,
  type OrbitControlsProps,
} from '@react-three/drei'
import { Box3, MOUSE, Vector3, Plane } from 'three'
import type { Material } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import ModelLoader from './components/ModelLoader'
import CameraControls from './components/CameraControls'
import ThalamusPlaceholder from './components/ThalamusPlaceholder'
import {
  buildFocusGoal,
  CameraAnimator,
  useCanvasPointerManager,
  useCameraInteractionClearing,
  getQuickViewGoal,
  type CameraGoal,
  type QuickViewPreset,
} from './utils/sceneUtils'
import { THALAMUS_NUCLEI, MESH_NAME_TO_NUCLEUS_ID } from './data/thalamusData'
import type { ViewSettings } from './types/connections'
import './Scene.css'

const THALAMUS_MODEL_URL = '/models/talamus.glb'
const FLOATING_PANEL_OFFSET_X = 6
const FLOATING_PANEL_Y = 0.6
const IMAGE_PLACEHOLDER_SRC = 'https://placehold.co/280x120/e2e8f0/1e293b?text=Referencia+2D'

const normalizeMeshName = (value: string) => value.toLowerCase().replace(/[^a-z0-9_]/g, '')

function resolveNucleusKey(meshName: string | null): string | null {
  if (!meshName) return null
  const direct = MESH_NAME_TO_NUCLEUS_ID[meshName]
  if (direct) return direct

  const normalized = normalizeMeshName(meshName)
  if (MESH_NAME_TO_NUCLEUS_ID[normalized]) return MESH_NAME_TO_NUCLEUS_ID[normalized]

  const match = Object.keys(MESH_NAME_TO_NUCLEUS_ID).find((key) => normalized.includes(key))
  return match ?? null
}

type ThalamusSceneProps = {
  viewSettings: ViewSettings
  clippingEnabled?: boolean
  onModelBoundsComputed?: (bounds: { halfHeight: number; halfWidth: number }) => void
}

function CanvasPointerManagerComponent({ onPointerMissed }: { onPointerMissed: () => void }) {
  useCanvasPointerManager(onPointerMissed)
  return null
}

function CameraInteractionComponent({ 
  controlsRef, 
  onCameraInteraction 
}: { 
  controlsRef: React.RefObject<any>
  onCameraInteraction: () => void 
}) {
  useCameraInteractionClearing(controlsRef, onCameraInteraction)
  return null
}

function DiagramLines({
  modelGroup,
  activeNucleus,
}: {
  modelGroup: any
  activeNucleus: string | null
}) {
  const [centerPoint, setCenterPoint] = useState<[number, number, number] | null>(null)
  const affLineRef = useRef<any>(null)
  const effLineRef = useRef<any>(null)

  useEffect(() => {
    if (!modelGroup || !activeNucleus) {
      setCenterPoint(null)
      return
    }

    let activeMesh: any = null
    modelGroup.traverse((child: any) => {
      if (activeMesh || !child?.isMesh) return
      const key = resolveNucleusKey(child.name || null)
      if (key === activeNucleus) {
        activeMesh = child
      }
    })

    if (!activeMesh) {
      setCenterPoint(null)
      return
    }

    const center = new Box3().setFromObject(activeMesh).getCenter(new Vector3())
    setCenterPoint([center.x, center.y, center.z])
  }, [activeNucleus, modelGroup])

  useFrame((_, delta) => {
    ;[affLineRef.current, effLineRef.current].forEach((line, idx) => {
      const material = line?.material
      if (!material || typeof material.dashOffset !== 'number') return
      const direction = idx === 0 ? -1 : 1
      material.dashOffset += delta * direction * 0.55
    })
  })

  if (!activeNucleus || !centerPoint) return null

  const leftStart: [number, number, number] = [-FLOATING_PANEL_OFFSET_X + 0.95, FLOATING_PANEL_Y, 0]
  const rightStart: [number, number, number] = [FLOATING_PANEL_OFFSET_X - 0.95, FLOATING_PANEL_Y, 0]

  const leftMid: [number, number, number] = [
    (leftStart[0] + centerPoint[0]) / 2,
    Math.max(leftStart[1], centerPoint[1]) + 1.15,
    (leftStart[2] + centerPoint[2]) / 2,
  ]

  const rightMid: [number, number, number] = [
    (rightStart[0] + centerPoint[0]) / 2,
    Math.max(rightStart[1], centerPoint[1]) + 1.15,
    (rightStart[2] + centerPoint[2]) / 2,
  ]

  return (
    <>
      <QuadraticBezierLine
        ref={affLineRef}
        start={leftStart}
        mid={leftMid}
        end={centerPoint}
        color="#2563eb"
        lineWidth={1.8}
        transparent
        opacity={0.95}
        dashed
        dashScale={26}
        gapSize={0.6}
      />
      <QuadraticBezierLine
        ref={effLineRef}
        start={rightStart}
        mid={rightMid}
        end={centerPoint}
        color="#dc2626"
        lineWidth={1.8}
        transparent
        opacity={0.95}
        dashed
        dashScale={26}
        gapSize={0.6}
      />
    </>
  )
}

export default function ThalamusScene({
  viewSettings,
  clippingEnabled = true,
  onModelBoundsComputed,
}: ThalamusSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [modelGroup, setModelGroup] = useState<any>(null)
  const [cameraGoal, setCameraGoal] = useState<CameraGoal | null>(null)
  const [isAutoRotate, setIsAutoRotate] = useState(false)
  const [manualHighlighted, setManualHighlighted] = useState<string[] | null>(null)
  const [activeQuickView, setActiveQuickView] = useState<QuickViewPreset | null>(null)
  const [modelColor, setModelColor] = useState('#ced8e6')
  const [activeNucleus, setActiveNucleus] = useState<string | null>(null)
  const activeNucleusData = activeNucleus ? THALAMUS_NUCLEI[activeNucleus] : null

  const BASE_VIEW_CLOSER_FACTOR = 1.2
  const HOME_VIEW_MULTIPLIER = 5 * BASE_VIEW_CLOSER_FACTOR
  const QUICK_VIEW_MULTIPLIER = 2.35 * BASE_VIEW_CLOSER_FACTOR
  const MIN_CAMERA_DISTANCE = 0.01
  const controlsReadyRef = useRef(false)
  const initialPositionSetRef = useRef(false)
  const onModelBoundsComputedRef = useRef(onModelBoundsComputed)

  // Update callback reference
  useEffect(() => {
    onModelBoundsComputedRef.current = onModelBoundsComputed
  }, [onModelBoundsComputed])

  // Apply selected nucleus emphasis: selected mesh glows, others fade.
  useEffect(() => {
    if (!modelGroup) return

    modelGroup.traverse((child: any) => {
      if (!child?.isMesh || !child.material) return

      const materials: Material[] = Array.isArray(child.material)
        ? (child.material as Material[])
        : [child.material as Material]

      const isSelected = Boolean(activeNucleus) && child.name === activeNucleus
      const hasSelection = Boolean(activeNucleus)

      materials.forEach((material) => {
        const anyMat = material as any
        const hasEmissive = anyMat?.emissive && typeof anyMat.emissive.setHex === 'function'
        const canFade = typeof anyMat?.opacity === 'number' && typeof anyMat?.transparent === 'boolean'

        if (hasEmissive && anyMat.userData.__nucleusBaseEmissiveHex === undefined) {
          anyMat.userData.__nucleusBaseEmissiveHex = anyMat.emissive.getHex()
        }
        if (typeof anyMat?.emissiveIntensity === 'number' && anyMat.userData.__nucleusBaseEmissiveIntensity === undefined) {
          anyMat.userData.__nucleusBaseEmissiveIntensity = anyMat.emissiveIntensity
        }
        if (canFade && anyMat.userData.__nucleusBaseOpacity === undefined) {
          anyMat.userData.__nucleusBaseOpacity = anyMat.opacity
          anyMat.userData.__nucleusBaseTransparent = anyMat.transparent
        }

        if (!hasSelection) {
          if (hasEmissive) {
            anyMat.emissive.setHex(anyMat.userData.__nucleusBaseEmissiveHex ?? 0x000000)
          }
          if (typeof anyMat?.emissiveIntensity === 'number') {
            anyMat.emissiveIntensity = anyMat.userData.__nucleusBaseEmissiveIntensity ?? 0
          }
          if (canFade) {
            anyMat.opacity = anyMat.userData.__nucleusBaseOpacity ?? 1
            anyMat.transparent = Boolean(anyMat.userData.__nucleusBaseTransparent)
          }
          material.needsUpdate = true
          return
        }

        if (isSelected) {
          if (hasEmissive) {
            anyMat.emissive.setHex(0x4a90e2)
          }
          if (typeof anyMat?.emissiveIntensity === 'number') {
            anyMat.emissiveIntensity = 0.7
          }
          if (canFade) {
            anyMat.opacity = 1
            anyMat.transparent = true
          }
        } else if (canFade) {
          if (hasEmissive) {
            anyMat.emissive.setHex(anyMat.userData.__nucleusBaseEmissiveHex ?? 0x000000)
          }
          if (typeof anyMat?.emissiveIntensity === 'number') {
            anyMat.emissiveIntensity = anyMat.userData.__nucleusBaseEmissiveIntensity ?? 0
          }
          anyMat.opacity = 0.22
          anyMat.transparent = true
        }

        material.needsUpdate = true
      })
    })
  }, [activeNucleus, modelGroup, viewSettings.xrayMode])

  const handleControlsRef = (instance: OrbitControlsImpl | null) => {
    controlsRef.current = instance
    const nextReady = Boolean(instance)
    if (controlsReadyRef.current === nextReady) return
    controlsReadyRef.current = nextReady
  }

  // Clipping planes for cross-section analysis
  const clippingPlaneYMaxRef = useRef(new Plane(new Vector3(0, -1, 0), 0))
  const clippingPlaneYMinRef = useRef(new Plane(new Vector3(0, 1, 0), 0))
  const clippingPlaneXMaxRef = useRef(new Plane(new Vector3(-1, 0, 0), 0))
  const clippingPlaneXMinRef = useRef(new Plane(new Vector3(1, 0, 0), 0))

  const clippingPlanes = clippingEnabled
    ? [
        clippingPlaneYMaxRef.current,
        clippingPlaneYMinRef.current,
        clippingPlaneXMaxRef.current,
        clippingPlaneXMinRef.current,
      ]
    : []

  // Update clipping planes
  if (clippingEnabled) {
    clippingPlaneYMaxRef.current.constant = viewSettings.clippingYMax
    clippingPlaneYMinRef.current.constant = -viewSettings.clippingYMin
    clippingPlaneXMaxRef.current.constant = viewSettings.clippingXMax
    clippingPlaneXMinRef.current.constant = -viewSettings.clippingXMin
  }

  // Apply home view
  const applyHomeView = (multiplier: number) => {
    const goal = getQuickViewGoal(modelGroup, 'isometric', multiplier)
    if (goal) {
      setCameraGoal(goal)
    }
  }

  // Apply quick view preset
  const applyQuickView = (view: QuickViewPreset) => {
    const goal = getQuickViewGoal(modelGroup, view, QUICK_VIEW_MULTIPLIER)
    if (goal) {
      setCameraGoal(goal)
      setActiveQuickView(view)
      setIsAutoRotate(false)
    }
  }

  // Set initial camera position when model first loads
  useEffect(() => {
    if (initialPositionSetRef.current) return
    if (!modelGroup || !controlsReadyRef.current) return

    applyHomeView(HOME_VIEW_MULTIPLIER)
    initialPositionSetRef.current = true
  }, [modelGroup])

  const orbitControlsProps: OrbitControlsProps = {
    enableDamping: true,
    dampingFactor: 0.08,
    enablePan: true,
    enableZoom: true,
    screenSpacePanning: true,
    mouseButtons: {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    },
    autoRotate: isAutoRotate,
    autoRotateSpeed: 0.8,
    makeDefault: true,
  }

  const handleGoHome = () => {
    setManualHighlighted(null)
    setCameraGoal(null)
    setActiveQuickView(null)
    applyHomeView(HOME_VIEW_MULTIPLIER)
  }

  const handleStepZoom = (factor: number) => {
    if (!controlsRef.current) {
      return
    }

    const controls = controlsRef.current
    const target = controls.target.clone()
    const direction = controls.object.position.clone().sub(target)
    const currentDistance = direction.length()
    const minDistance = MIN_CAMERA_DISTANCE
    const maxDistance = 20

    const unclamped = currentDistance * factor
    const nextDistance = Math.max(minDistance, Math.min(maxDistance, unclamped))

    direction.normalize().multiplyScalar(nextDistance)
    const nextPosition = target.clone().add(direction)

    setCameraGoal({
      target: [target.x, target.y, target.z],
      position: [nextPosition.x, nextPosition.y, nextPosition.z],
    })
  }

  const clearSelection = () => {
    setManualHighlighted(null)
    setActiveNucleus(null)
  }

  return (
    <div className="scene-shell">
      <Canvas
        camera={{ position: [0, 2, 10], fov: 48, near: 0.1, far: 1000 }}
        onPointerMissed={clearSelection}
        gl={{ localClippingEnabled: true }}
      >
        <color attach="background" args={['#f1f3f6']} />

        <Environment preset="city" />

        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 7, 3]} intensity={1.1} />

        <ContactShadows
          position={[0, -0.54, 0]}
          opacity={0.42}
          blur={2.3}
          far={8.5}
          resolution={1024}
          scale={10}
          color="#4d5f70"
        />

        <OrbitControls ref={handleControlsRef} {...orbitControlsProps} />

        <CameraAnimator
          controlsRef={controlsRef}
          goal={cameraGoal}
          onSettled={() => {
            // Optional: call when animation settles
          }}
        />

        <CanvasPointerManagerComponent onPointerMissed={clearSelection} />

        <CameraInteractionComponent 
          controlsRef={controlsRef}
          onCameraInteraction={() => setCameraGoal(null)}
        />

        <Center>
          <DiagramLines modelGroup={modelGroup} activeNucleus={activeNucleus} />

          <ModelLoader
            url={THALAMUS_MODEL_URL}
            ref={setModelGroup}
            modelColor={modelColor}
            explodeAmount={viewSettings.explodeAmount}
            onMeshClick={(info) => {
              if (!info) return
              try {
                if (controlsRef.current) {
                  const name = info.name
                  setActiveNucleus(resolveNucleusKey(name))
                  setManualHighlighted(name ? [name] : null)

                  const pieceCenter: [number, number, number] = [info.center[0], info.center[1], info.center[2]]
                  setCameraGoal(buildFocusGoal(controlsRef.current, pieceCenter, info.radius))
                }
              } catch (err) {
                // ignore
              }
            }}
            position={[0, 0, 0]}
            scale={0.95}
            highlightedNodeNames={manualHighlighted}
            highlightColor="#2563eb"
            clippingPlanes={clippingPlanes}
            xrayMode={viewSettings.xrayMode}
            fallback={
              <ThalamusPlaceholder
                position={[0, 0, 0]}
                clippingPlanes={clippingPlanes}
                xrayMode={viewSettings.xrayMode}
              />
            }
          />

          {activeNucleusData && (
            <>
              <Html position={[-FLOATING_PANEL_OFFSET_X, FLOATING_PANEL_Y, 0]} transform distanceFactor={1.05}>
                <section className="thalamus-floating-panel afference" aria-label="Aferencias">
                  <h3 className="thalamus-panel-title">Aferencias</h3>
                  <p className="thalamus-panel-subtitle">{activeNucleusData.name}</p>
                  {activeNucleusData.afferences.map((item, idx) => (
                    <article key={`aff-${idx}`} className="thalamus-panel-item">
                      <p className="thalamus-panel-text">{item.text}</p>
                      {item.requiresImage && (
                        <img
                          className="thalamus-panel-image"
                          src={IMAGE_PLACEHOLDER_SRC}
                          alt={`Referencia visual aferente ${idx + 1}`}
                        />
                      )}
                      {item.imageConcept && <p className="thalamus-panel-meta">Concepto: {item.imageConcept}</p>}
                      {item.pins && <p className="thalamus-panel-meta">Pins: {item.pins}</p>}
                    </article>
                  ))}
                </section>
              </Html>

              <Html position={[FLOATING_PANEL_OFFSET_X, FLOATING_PANEL_Y, 0]} transform distanceFactor={1.05}>
                <section className="thalamus-floating-panel efference" aria-label="Eferencias">
                  <h3 className="thalamus-panel-title">Eferencias</h3>
                  <p className="thalamus-panel-subtitle">{activeNucleusData.name}</p>
                  {activeNucleusData.efferences.map((item, idx) => (
                    <article key={`eff-${idx}`} className="thalamus-panel-item">
                      <p className="thalamus-panel-text">{item.text}</p>
                      {item.requiresImage && (
                        <img
                          className="thalamus-panel-image"
                          src={IMAGE_PLACEHOLDER_SRC}
                          alt={`Referencia visual eferente ${idx + 1}`}
                        />
                      )}
                      {item.imageConcept && <p className="thalamus-panel-meta">Concepto: {item.imageConcept}</p>}
                      {item.missingPiecesInfo && <p className="thalamus-panel-meta">Piezas: {item.missingPiecesInfo}</p>}
                    </article>
                  ))}
                </section>
              </Html>
            </>
          )}
        </Center>
      </Canvas>

      <CameraControls
        onGoHome={handleGoHome}
        onZoomIn={() => handleStepZoom(0.7)}
        onZoomOut={() => handleStepZoom(1.43)}
        onToggleAutoRotate={() => setIsAutoRotate((prev) => !prev)}
        isAutoRotate={isAutoRotate}
        activeQuickView={activeQuickView}
        modelColor={modelColor}
        onModelColorChange={setModelColor}
        onQuickView={applyQuickView}
      />
    </div>
  )
}
