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
import { MOUSE, Vector3, Plane } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { easing } from 'maath'
import ThalamusPlaceholder from './components/ThalamusPlaceholder'
import TargetOrganPlaceholder from './components/TargetOrganPlaceholder'
import ConnectionLine from './components/ConnectionLine'
import ModelLoader from './components/ModelLoader'
import CameraControls from './components/CameraControls'
import connectionsData from '../data/connections.json'
import type { ConnectionWithType, ConnectionsSchema, Vec3, ViewSettings } from './types/connections'
import './Scene.css'

const connections = connectionsData as ConnectionsSchema

// Cambia esta linea cuando llegue el archivo real del cliente.
const THALAMUS_MODEL_URL = ''

const CONNECTION_NODE_MAP: Record<string, string> = {
  'ef-corteza-prefrontal': 'ef-corteza-prefrontal',
  'ef-corteza-motora': 'ef-corteza-motora',
  'ef-corteza-somatosensorial': 'ef-corteza-somatosensorial',
  'ef-corteza-visual': 'ef-corteza-visual',
  'af-medula-espinal': 'af-medula-espinal',
  'af-tronco-encefalico': 'af-tronco-encefalico',
  'af-cerebelo': 'af-cerebelo',
  'af-ganglios-basales': 'af-ganglios-basales',
}

type CameraGoal = {
  target: Vec3
  position: Vec3
}

const HOME_TARGET: Vec3 = [0, 0, 0]
const HOME_POSITION: Vec3 = [3, 2, 4]

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

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
  return CONNECTION_NODE_MAP[connectionId] ?? connectionId
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
}

export default function Scene({ selectedConnection, onSelectConnection, viewSettings }: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [cameraGoal, setCameraGoal] = useState<CameraGoal | null>(null)
  const [isAutoRotate, setIsAutoRotate] = useState(false)
  const [activeView, setActiveView] = useState<string | null>(null)

  // Clipping plane: horizontal plane (normal pointing up) with offset from slider
  const clippingPlane = useMemo(() => {
    const plane = new Plane(new Vector3(0, 1, 0), 0)
    plane.constant = -viewSettings.clippingOffset
    return plane
  }, [viewSettings.clippingOffset])

  useEffect(() => {
    if (selectedConnection) {
      return
    }

    setActiveView(null)

    // Return camera to home position when selection is cleared
    if (!controlsRef.current) {
      return
    }

    setCameraGoal({
      target: HOME_TARGET,
      position: HOME_POSITION,
    })
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
    setCameraGoal({
      target: HOME_TARGET,
      position: HOME_POSITION,
    })
  }

  const handleStepZoom = (factor: number) => {
    if (!controlsRef.current) {
      return
    }

    const controls = controlsRef.current
    const target = controls.target.clone()
    const direction = controls.object.position.clone().sub(target)
    const currentDistance = direction.length()
    const nextDistance = Math.min(14, Math.max(1.25, currentDistance * factor))

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
        camera={{ position: [3, 2, 4], fov: 60 }}
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
          position={connections.nodoCentral.posicion}
          scale={0.95}
          highlightedNodeName={selectedConnection ? getNodeNameFromConnection(selectedConnection.id) : null}
          highlightColor="#FB923C"
          clippingPlane={clippingPlane}
          xrayMode={viewSettings.xrayMode}
          fallback={
            <ThalamusPlaceholder
              position={connections.nodoCentral.posicion}
              clippingPlane={clippingPlane}
              xrayMode={viewSettings.xrayMode}
              showLabel={viewSettings.layers.showLabels}
            />
          }
        />

        {allConnections.map((connection) => {
          const startPoint = addVec3(connections.nodoCentral.posicion, connection.posicionLocal)
          const isActive = selectedConnection?.id === connection.id
          const organPosition = connection.posicionDestino
          const opacity = activeView && !isActive ? dimOpacity : 1

          return (
            <group key={connection.id}>
              {viewSettings.layers.showTargetOrgans && (
                <TargetOrganPlaceholder
                  position={organPosition}
                  color={connection.tipo === 'eferencia' ? '#FB923C' : '#93C5FD'}
                  isActive={isActive}
                  opacity={opacity}
                  clippingPlane={clippingPlane}
                  xrayMode={viewSettings.xrayMode}
                  showLabel={viewSettings.layers.showLabels}
                  label={connection.nombre}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleSelectConnection(connection, organPosition)
                  }}
                />
              )}

              {viewSettings.layers.showNerves && (
                <ConnectionLine
                  start={startPoint}
                  end={organPosition}
                  color={connection.colorLinea}
                  isActive={isActive}
                  opacity={opacity}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleSelectConnection(connection, organPosition)
                  }}
                />
              )}
            </group>
          )
        })}

        <OrbitControls
          ref={controlsRef}
          {...orbitControlsProps}
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