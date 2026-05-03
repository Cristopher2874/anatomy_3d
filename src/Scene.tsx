import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  Grid,
  OrbitControls,
  type OrbitControlsProps,
} from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { MOUSE, Vector3, Plane, Box3, Sphere, MathUtils } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { easing } from 'maath'
import ThalamusPlaceholder from './components/ThalamusPlaceholder'
import ConnectionLine from './components/ConnectionLine'
import ModelLoader, { CONNECTION_NODE_MAP } from './components/ModelLoader'
import Pin from './components/Pin'
import CameraControls from './components/CameraControls'
import connectionsData from '../data/connections.json'
import type { ConnectionWithType, ConnectionsSchema, Vec3, ViewSettings } from './types/connections'
import './Scene.css'

const connections = connectionsData as ConnectionsSchema

// Si aún no se ha subido `brain_final.glb`, usar el GLB existente en `public/models/brain.glb`
const THALAMUS_MODEL_URL = '/models/brain.glb'

// Mapping is provided by `ModelLoader.CONNECTION_NODE_MAP` for cortex node names.

type CameraGoal = {
  target: Vec3
  position: Vec3
}

// Target placeholders removed in favour of dynamic geometry & pins.

function buildFocusGoal(controls: OrbitControlsImpl, organPosition: Vec3): CameraGoal {
  const target = controls.target.clone()
  const cameraPosition = controls.object.position.clone()
  const direction = cameraPosition.sub(target)
  const distance = direction.length()

  if (distance < 0.0001) {
    return {
      target: organPosition,
      position: [organPosition[0] + 1.3, organPosition[1] + 0.85, organPosition[2] + 1.35],
    }
  }

  direction.normalize()

  // Keep relative viewing direction to avoid sudden flips while approaching the selected organ.
  const desiredDistance = Math.min(4.2, Math.max(1.7, distance * 0.58))
  const nextPosition = new Vector3(organPosition[0], organPosition[1], organPosition[2]).add(
    direction.multiplyScalar(desiredDistance),
  )

  return {
    target: organPosition,
    position: [nextPosition.x, nextPosition.y, nextPosition.z],
  }
}

function getNodeNameFromConnection(connectionId: string): string {
  return connectionId
}

type CameraAnimatorProps = {
  controlsRef: RefObject<OrbitControlsImpl | null>
  goal: CameraGoal | null
  onSettled: () => void
}

function CameraAnimator({ controlsRef, goal, onSettled }: CameraAnimatorProps) {
  const { camera } = useThree()
  const targetVec = useMemo(() => new Vector3(), [])
  const positionVec = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    if (!goal || !controlsRef.current) {
      return
    }

    targetVec.set(goal.target[0], goal.target[1], goal.target[2])
    positionVec.set(goal.position[0], goal.position[1], goal.position[2])

    easing.damp3(controlsRef.current.target, goal.target, 0.22, delta)
    easing.damp3(camera.position, goal.position, 0.22, delta)
    controlsRef.current.update()

    if (
      controlsRef.current.target.distanceTo(targetVec) < 0.02 &&
      camera.position.distanceTo(positionVec) < 0.03
    ) {
      onSettled()
    }
  })

  return null
}

type SceneProps = {
  selectedConnection: ConnectionWithType | null
  onSelectConnection: (connection: ConnectionWithType | null) => void
  viewSettings: ViewSettings
  onModelBoundsComputed?: (bounds: { halfHeight: number; halfWidth: number }) => void
}

export default function Scene({ selectedConnection, onSelectConnection, viewSettings }: SceneProps) {
  const { onModelBoundsComputed } = (arguments[0] as SceneProps)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [modelGroup, setModelGroup] = useState<any>(null)
  const [controlsReady, setControlsReady] = useState(false)
  const [cameraGoal, setCameraGoal] = useState<CameraGoal | null>(null)
  const [modelRadiusLocal, setModelRadiusLocal] = useState<number>(2.5)
  const [isAutoRotate, setIsAutoRotate] = useState(false)
  const [activeView, setActiveView] = useState<string | null>(null)
  const HOME_VIEW_MULTIPLIER = 3.8

  // Clipping planes: Y (horizontal/top-bottom) and X (left-right)
  const clippingPlaneY = useMemo(() => {
    const plane = new Plane(new Vector3(0, 1, 0), 0)
    plane.constant = -viewSettings.clippingOffset
    return plane
  }, [viewSettings.clippingOffset])

  const clippingPlaneX = useMemo(() => {
    const plane = new Plane(new Vector3(1, 0, 0), 0)
    plane.constant = -(viewSettings.clippingOffsetX ?? 0)
    return plane
  }, [viewSettings.clippingOffsetX])

  // Compute model bounds once the model group is available and notify parent for slider range.
  useEffect(() => {
    if (!modelGroup) return

    try {
      const box = new Box3().setFromObject(modelGroup)
      const size = box.getSize(new Vector3())
      const sphere = box.getBoundingSphere(new Sphere())
      // report half height and half width for clipping sliders
      const halfHeight = Math.max(0.001, size.y * 0.58)
      const halfWidth = Math.max(0.001, size.x * 0.5)
      setModelRadiusLocal(Math.max(0.001, sphere.radius))
      onModelBoundsComputed?.({ halfHeight, halfWidth })
    } catch (err) {
      // ignore
    }
  }, [modelGroup, onModelBoundsComputed])

  // Set an initial camera position relative to the model bounds once both model and controls are ready.
  const initialPositionSetRef = useRef(false)

  function applyHomeView(multiplier = HOME_VIEW_MULTIPLIER) {
    if (!controlsRef.current || !modelGroup) return

    try {
      const brainNode = modelGroup.getObjectByName('Brain_Model') ?? modelGroup
      const box = new Box3().setFromObject(brainNode)
      const center = box.getCenter(new Vector3())
      const sphere = box.getBoundingSphere(new Sphere())

      const cameraObject = controlsRef.current.object
      const fovDeg = 'fov' in cameraObject ? (cameraObject.fov as number) : 48
      const fovRad = MathUtils.degToRad(fovDeg)
      const safeDistance = (sphere.radius / Math.sin(fovRad / 2)) * multiplier

      const controls = controlsRef.current
      controls.object.position.set(center.x, center.y, center.z + safeDistance)
      controls.target.set(center.x, center.y, center.z)
      controls.update()
      controls.saveState()

      setCameraGoal({
        target: [center.x, center.y, center.z],
        position: [center.x, center.y, center.z + safeDistance],
      })
    } catch (err) {
      // ignore
    }
  }

  useEffect(() => {
    if (initialPositionSetRef.current) return
    if (!modelGroup || !controlsReady || !controlsRef.current) return
    if (selectedConnection) return

    applyHomeView(HOME_VIEW_MULTIPLIER)
    initialPositionSetRef.current = true
  }, [modelGroup, controlsReady, selectedConnection])

  useEffect(() => {
    if (selectedConnection) {
      return
    }

    setActiveView(null)
  }, [selectedConnection])

  const allConnections = [
    ...connections.eferencias.map((item) => ({ ...item, tipo: 'eferencia' as const })),
    ...connections.aferencias.map((item) => ({ ...item, tipo: 'aferencia' as const })),
  ]

  const handleSelectConnection = (connection: ConnectionWithType, organPosition: Vec3) => {
    onSelectConnection(connection)
    setActiveView(connection.id)

    if (!controlsRef.current) {
      return
    }

    setCameraGoal(buildFocusGoal(controlsRef.current, organPosition))
  }

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
    makeDefault: false,
  }

  const handleGoHome = () => {
    onSelectConnection(null)
    setActiveView(null)
    setCameraGoal(null)
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
    const minDistance = Math.max(0.05, modelRadiusLocal * 0.1)
    const maxDistance = Math.max(minDistance + 0.1, modelRadiusLocal * 7)

    const unclamped = currentDistance * factor
    const nextDistance = Math.max(minDistance, Math.min(maxDistance, unclamped))

    direction.normalize().multiplyScalar(nextDistance)
    const nextPosition = target.clone().add(direction)

    setCameraGoal({
      target: [target.x, target.y, target.z],
      position: [nextPosition.x, nextPosition.y, nextPosition.z],
    })
  }

  const dimOpacity = activeView ? 0.1 : 1

  return (
    <div className="scene-shell">
        <Canvas
          camera={{ position: [0, 2, 10], fov: 48, near: 0.1, far: 1000 }}
        onPointerMissed={() => onSelectConnection(null)}
        gl={{ localClippingEnabled: true }}
      >
        <color attach="background" args={['#f1f3f6']} />

        <Environment preset="city" />

        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 7, 3]} intensity={1.1} />

        {viewSettings.layers.showGrid && (
          <Grid
            position={[0, -0.56, 0]}
            args={[16, 16]}
            cellSize={0.45}
            cellThickness={0.55}
            cellColor="#8ea7b7"
            sectionSize={1.8}
            sectionThickness={1.15}
            sectionColor="#67829a"
            fadeDistance={22}
            fadeStrength={1.2}
            infiniteGrid
          />
        )}

        <ContactShadows
          position={[0, -0.54, 0]}
          opacity={0.42}
          blur={2.3}
          far={8.5}
          resolution={1024}
          scale={10}
          color="#4d5f70"
        />

        <ModelLoader
          url={THALAMUS_MODEL_URL}
          ref={setModelGroup}
          position={connections.nodoCentral.posicion}
          scale={0.95}
          highlightedNodeNames={
            selectedConnection ? CONNECTION_NODE_MAP[selectedConnection.id] ?? [getNodeNameFromConnection(selectedConnection.id)] : null
          }
          highlightColor="#FB923C"
          clippingPlanes={[clippingPlaneY, clippingPlaneX]}
          xrayMode={viewSettings.xrayMode}
          fallback={
            <ThalamusPlaceholder
              position={connections.nodoCentral.posicion}
              clippingPlanes={[clippingPlaneY, clippingPlaneX]}
              xrayMode={viewSettings.xrayMode}
              showLabel={viewSettings.layers.showLabels}
            />
          }
        />

        {allConnections.map((connection) => {
          const isActive = selectedConnection?.id === connection.id
          const opacity = activeView && !isActive ? dimOpacity : 1

          // For eferencias, try to use mapped cortex node names if available
          const mapped = connection.tipo === 'eferencia' ? (connection as any).mappedNodes as string[] | undefined : undefined

          return (
            <group key={connection.id}>
              {connection.pin && viewSettings.layers.showTargetOrgans && (
                <Pin
                  position={connection.posicionDestino}
                  label={connection.nombre}
                  image={(connection as any).pinImage}
                  onClick={() => {
                    handleSelectConnection(connection, connection.posicionDestino)
                  }}
                />
              )}

              {viewSettings.layers.showNerves && connection.tipo === 'eferencia' && (
                <ConnectionLine
                  startName={connections.nodoCentral.id}
                  endName={mapped ?? CONNECTION_NODE_MAP[connection.id] ?? [getNodeNameFromConnection(connection.id)]}
                  color={connection.colorLinea}
                  isActive={isActive}
                  opacity={opacity}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleSelectConnection(connection, connection.posicionDestino)
                  }}
                />
              )}
            </group>
          )
        })}

        <OrbitControls
          ref={(instance) => {
            controlsRef.current = instance
            setControlsReady(Boolean(instance))
          }}
          {...orbitControlsProps}
          minDistance={Math.max(0.05, modelRadiusLocal * 0.5)}
          maxDistance={Math.max(Math.max(0.05, modelRadiusLocal * 0.5) + 0.1, modelRadiusLocal * 5)}
          onStart={() => {
            setCameraGoal(null)
          }}
        />
        <CameraAnimator
          controlsRef={controlsRef}
          goal={cameraGoal}
          onSettled={() => {
            setCameraGoal(null)
          }}
        />
      </Canvas>

      <CameraControls
        isAutoRotate={isAutoRotate}
        onGoHome={handleGoHome}
        onZoomIn={() => {
          handleStepZoom(0.82)
        }}
        onZoomOut={() => {
          handleStepZoom(1.2)
        }}
        onToggleAutoRotate={() => {
          setIsAutoRotate((currentValue) => !currentValue)
        }}
      />
    </div>
  )
}