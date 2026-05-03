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
import { MOUSE, Vector3, Plane, Box3, Sphere, MathUtils, Raycaster } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { easing } from 'maath'
import ThalamusPlaceholder from './components/ThalamusPlaceholder'
import ConnectionLine from './components/ConnectionLine'
import ModelLoader, { CONNECTION_NODE_MAP } from './components/ModelLoader'
import Pin from './components/Pin'
import NodePin from './components/NodePin'
import ExternalTargetIndicator from './components/ExternalTargetIndicator'
import CameraControls from './components/CameraControls'
import connectionsData from '../data/connections.json'
import type { ConnectionWithType, ConnectionsSchema, Vec3, ViewSettings } from './types/connections'
import './Scene.css'

const connections = connectionsData as unknown as ConnectionsSchema

// Si aún no se ha subido `brain_final.glb`, usar el GLB existente en `public/models/brain.glb`
const THALAMUS_MODEL_URL = '/models/brain.glb'

// Mapping is provided by `ModelLoader.CONNECTION_NODE_MAP` for cortex node names.

type CameraGoal = {
  target: Vec3
  position: Vec3
}

// Target placeholders removed in favour of dynamic geometry & pins.

function buildFocusGoal(controls: OrbitControlsImpl, organPosition: Vec3, pieceRadius?: number): CameraGoal {
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

  // If a piece radius is provided, compute a safe distance that frames the piece
  if (pieceRadius && pieceRadius > 0.0001) {
    const cameraObject = controls.object
    const fovDeg = 'fov' in cameraObject ? (cameraObject.fov as number) : 48
    const fovRad = MathUtils.degToRad(fovDeg)
    const safeDistance = (pieceRadius / Math.sin(fovRad / 2)) * 1.75
    const nextTarget = new Vector3(organPosition[0], organPosition[1], organPosition[2])
    const targetShift = target.distanceTo(nextTarget)
    // Preserve zoom context when selecting neighboring pieces to avoid sudden zoom-out.
    const nearbySelectionThreshold = Math.max(0.45, pieceRadius * 4)
    const shouldPreserveLocalZoom = targetShift <= nearbySelectionThreshold
    const nextDistance = shouldPreserveLocalZoom ? Math.min(distance, safeDistance) : safeDistance
    const nextPosition = nextTarget.clone().add(direction.multiplyScalar(nextDistance))
    return {
      target: organPosition,
      position: [nextPosition.x, nextPosition.y, nextPosition.z],
    }
  }

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

function CanvasPointerManager({ onPointerMissed }: { onPointerMissed: () => void }) {
  const { gl, camera, scene } = useThree()

  useEffect(() => {
    if (!gl || !camera) return

    const rc = new Raycaster()

    const handler = (ev: PointerEvent) => {
      try {
        const rect = gl.domElement.getBoundingClientRect()
        const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
        const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
        rc.setFromCamera({ x, y } as any, camera)
        const intersects = rc.intersectObjects(scene.children, true)
        if (!intersects || intersects.length === 0) {
          onPointerMissed()
        }
      } catch (e) {
        // ignore
      }
    }

    gl.domElement.addEventListener('pointerdown', handler)
    return () => gl.domElement.removeEventListener('pointerdown', handler)
  }, [gl, camera, scene, onPointerMissed])

  return null
}

type SceneProps = {
  selectedConnection: ConnectionWithType | null
  onSelectConnection: (connection: ConnectionWithType | null) => void
  onSelectedPieceInfoChange?: (pieceInfo: { name: string; infoText: string } | null) => void
  viewSettings: ViewSettings
  onModelBoundsComputed?: (bounds: { halfHeight: number; halfWidth: number }) => void
}

const THALAMIC_NUCLEUS_DIRECTIONS: Record<string, Vec3> = {
  anterior: [0.0, 0.16, 0.08],
  dorsomedial: [0.08, 0.1, 0.04],
  dorsal_lateral: [0.12, 0.06, 0.02],
  ventral_anterior: [0.1, -0.04, 0.04],
  ventral_lateral: [0.14, -0.08, 0.02],
  vpm: [0.06, -0.14, 0.08],
  vpl: [0.1, -0.14, 0.04],
  intralaminar: [0.02, 0.04, 0.0],
  geniculado_medial: [0.08, -0.08, -0.12],
  geniculado_lateral: [0.12, -0.06, -0.14],
}

const EFERENT_FALLBACK_NODE_TOKENS: Record<string, string[]> = {
  geniculado_medial: ['superiortemporal', 'transversetemporal', 'middletemporal', 'temporalpole'],
  geniculado_lateral: ['pericalcarine', 'lateraloccipital', 'cuneus', 'lingual'],
  vpm: ['postcentral', 'paracentral'],
  vpl: ['postcentral', 'paracentral'],
  ventral_anterior: ['precentral', 'superiorfrontal'],
  ventral_lateral: ['precentral', 'superiorfrontal'],
}

function canonicalNodeKey(value: string): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function extractMeshNameTokens(rawName: string): string[] {
  if (!rawName) return []

  const baseName = rawName.split('/').pop()?.split('\\').pop() ?? rawName
  const withoutExt = baseName.replace(/\.(obj|stl|mtl)$/i, '')
  const splitTokens = withoutExt
    .split(/[.\-_ ]+/)
    .map((token) => token.toLowerCase().trim())
    .filter(Boolean)

  const ignored = new Set(['lh', 'rh', 'pial', 'dk', 'obj', 'stl', 'mtl'])
  const filteredTokens = splitTokens.filter((token) => !ignored.has(token))
  const regionToken = filteredTokens.length > 0 ? filteredTokens[filteredTokens.length - 1] : withoutExt.toLowerCase()

  return Array.from(new Set([regionToken, ...filteredTokens, withoutExt.toLowerCase()]))
}

function formatPieceName(rawName: string): string {
  const tokens = extractMeshNameTokens(rawName)
  const regionRaw = tokens[0] || 'unknown'
  const hemisphere = rawName.toLowerCase().includes('lh')
    ? 'Hemisferio Izquierdo'
    : rawName.toLowerCase().includes('rh')
      ? 'Hemisferio Derecho'
      : null

  const spaced = regionRaw
    .replace(/^bankssts$/i, 'banks sts')
    .replace(/caudal/gi, ' caudal ')
    .replace(/rostral/gi, ' rostral ')
    .replace(/anterior/gi, ' anterior ')
    .replace(/posterior/gi, ' posterior ')
    .replace(/middle/gi, ' middle ')
    .replace(/superior/gi, ' superior ')
    .replace(/inferior/gi, ' inferior ')
    .replace(/lateral/gi, ' lateral ')
    .replace(/medial/gi, ' medial ')
    .replace(/orbitofrontal/gi, ' orbitofrontal ')
    .replace(/frontal/gi, ' frontal ')
    .replace(/parietal/gi, ' parietal ')
    .replace(/temporal/gi, ' temporal ')
    .replace(/occipital/gi, ' occipital ')
    .replace(/cingulate/gi, ' cingulate ')
    .replace(/calcarine/gi, ' calcarine ')
    .replace(/hippocampal/gi, ' hippocampal ')
    .replace(/central/gi, ' central ')
    .replace(/isthmus/gi, ' isthmus ')
    .replace(/transverse/gi, ' transverse ')
    .replace(/\s+/g, ' ')
    .trim()

  const title = spaced
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  if (!hemisphere) {
    return title || rawName
  }

  return `${title || rawName} (${hemisphere})`
}

function buildAcademicPieceInfo(rawName: string): string {
  const tokens = extractMeshNameTokens(rawName)
  const tokenSet = new Set(tokens.map((token) => token.toLowerCase()))
  const hasAny = (...names: string[]) => names.some((name) => tokenSet.has(name))

  if (hasAny('precentral', 'paracentral')) {
    return 'Region cortical asociada a planificacion y ejecucion motora. En la tabla clinica, se relaciona con circuitos talamicos ventrales (anterior/lateral).'
  }
  if (hasAny('postcentral')) {
    return 'Region somatosensorial primaria. En el esquema clinico se vincula con eferencias de VPM/VPL para relevo sensitivo.'
  }
  if (hasAny('superiortemporal', 'transversetemporal')) {
    return 'Region temporal superior vinculada con procesamiento auditivo; consistente con proyecciones del cuerpo geniculado medial.'
  }
  if (hasAny('pericalcarine', 'lateraloccipital', 'cuneus', 'lingual')) {
    return 'Region occipital/visual; en la tabla corresponde a circuitos del cuerpo geniculado lateral y radiaciones opticas.'
  }
  if (hasAny('rostralanteriorcingulate', 'isthmuscingulate', 'posteriorcingulate')) {
    return 'Region cingulada de asociacion limbica. Se relaciona con circuitos talamicos anteriores implicados en memoria y tono emocional.'
  }
  if (hasAny('superiorfrontal', 'rostralmiddlefrontal', 'medialorbitofrontal', 'caudalmiddlefrontal', 'frontalpole')) {
    return 'Region prefrontal de integracion cognitiva/afectiva, compatible con vias dorsomediales del talamo descritas en la tabla.'
  }
  if (hasAny('superiorparietal', 'inferiorparietal', 'supramarginal', 'precuneus')) {
    return 'Region parietal de asociacion sensoriomotora. Puede participar en circuitos dorsales talamicos de integracion.'
  }
  if (hasAny('insula', 'parahippocampal', 'entorhinal', 'temporalpole')) {
    return 'Region de asociacion multimodal/limbica. Esta pieza no tiene conexion explicita en el mapa clinico actual, pero conserva valor academico de referencia.'
  }

  return 'Pieza detectada en el modelo 3D. No tiene conexion explicita en el mapa clinico actual, pero se mantiene visible para exploracion anatomica academica.'
}

function isLikelyThalamicMesh(rawName: string): boolean {
  const lower = (rawName || '').toLowerCase()
  return lower.includes('thalam') || lower.includes('talam')
}

function resolveConnectionByObjectName(
  objectName: string,
  map: Map<string, ConnectionWithType>,
): ConnectionWithType | null {
  const candidates = extractMeshNameTokens(objectName)
  for (const candidate of candidates) {
    const found = map.get(canonicalNodeKey(candidate))
    if (found) {
      return found
    }
  }

  return null
}

export default function Scene({
  selectedConnection,
  onSelectConnection,
  onSelectedPieceInfoChange,
  viewSettings,
  onModelBoundsComputed,
}: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [modelGroup, setModelGroup] = useState<any>(null)
  const [controlsReady, setControlsReady] = useState(false)
  const [cameraGoal, setCameraGoal] = useState<CameraGoal | null>(null)
  const [modelRadiusLocal, setModelRadiusLocal] = useState<number>(2.5)
  const [isAutoRotate, setIsAutoRotate] = useState(false)
  const [activeView, setActiveView] = useState<string | null>(null)
  const HOME_VIEW_MULTIPLIER = 3.8
  const [manualHighlighted, setManualHighlighted] = useState<string[] | null>(null)
  const [pinsWorld, setPinsWorld] = useState<Record<string, [number, number, number]>>({})
  const [modelCenterWorld, setModelCenterWorld] = useState<Vec3>([0, 0, 0])
  const [thalamusCenterWorld, setThalamusCenterWorld] = useState<Vec3>([0, 0, 0])
  const [thalamusRadiusWorld, setThalamusRadiusWorld] = useState<number>(0.18)
  const [nodeCenterMap, setNodeCenterMap] = useState<Record<string, Vec3>>({})
  const [selectedMeshCenter, setSelectedMeshCenter] = useState<Vec3 | null>(null)
  const [selectedMeshName, setSelectedMeshName] = useState<string | null>(null)
  const MIN_CAMERA_DISTANCE = 0.01

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

  const allConnections = [
    ...connections.eferencias.map((item) => ({ ...item, tipo: 'eferencia' as const })),
    ...connections.aferencias.map((item) => ({ ...item, tipo: 'aferencia' as const })),
  ]

  // Compute model bounds once the model group is available and notify parent for slider range.
  useEffect(() => {
    if (!modelGroup) return

    try {
      // Ensure world matrices are up-to-date before computing bounds
      modelGroup.updateMatrixWorld(true)

      const box = new Box3().setFromObject(modelGroup)
      const size = box.getSize(new Vector3())
      const sphere = box.getBoundingSphere(new Sphere())
      const center = box.getCenter(new Vector3())
      // report half height and half width for clipping sliders
      const halfHeight = Math.max(0.001, size.y * 0.58)
      const halfWidth = Math.max(0.001, size.x * 0.5)
      setModelRadiusLocal(Math.max(0.001, sphere.radius))
      setModelCenterWorld([center.x, center.y, center.z])
      onModelBoundsComputed?.({ halfHeight, halfWidth })
    } catch (err) {
      // ignore
    }
  }, [modelGroup, onModelBoundsComputed])

  // When model is available, update its world matrices and precompute pin world positions
  useEffect(() => {
    // debug: indicate modelGroup change
    // eslint-disable-next-line no-console
    console.info('[Scene] modelGroup changed:', modelGroup)
    if (!modelGroup) return
    try {
      modelGroup.updateMatrixWorld(true)

      const next: Record<string, [number, number, number]> = {}
      const nodeAccum = new Map<string, { sum: Vector3; count: number }>()
      allConnections.forEach((c) => {
        if (c.pin) {
          const local = new Vector3(c.posicionDestino[0], c.posicionDestino[1], c.posicionDestino[2])
          const world = local.clone().applyMatrix4(modelGroup.matrixWorld)
          next[c.id] = [world.x, world.y, world.z]
        }
      })

      modelGroup.traverse((obj: any) => {
        const rawName = obj?.name || ''
        if (!rawName) return
        try {
          const center = new Box3().setFromObject(obj).getCenter(new Vector3())
          if (!Number.isFinite(center.x) || !Number.isFinite(center.y) || !Number.isFinite(center.z)) return
          const keys = new Set<string>()
          keys.add(canonicalNodeKey(rawName))
          keys.add(canonicalNodeKey(rawName.replace(/\.(obj|stl|mtl)$/i, '')))
          extractMeshNameTokens(rawName).forEach((token) => keys.add(canonicalNodeKey(token)))
          keys.forEach((key) => {
            if (!key) return
            const prev = nodeAccum.get(key)
            if (!prev) {
              nodeAccum.set(key, { sum: center.clone(), count: 1 })
            } else {
              prev.sum.add(center)
              prev.count += 1
            }
          })
        } catch {
          // ignore malformed mesh
        }
      })

      // Build thalamus envelope from clinical nucleus anchors in data.
      const eferentPoints: Vector3[] = []
      allConnections.forEach((c) => {
        if (c.tipo !== 'eferencia') return
        const w = new Vector3(c.posicionLocal[0], c.posicionLocal[1], c.posicionLocal[2]).applyMatrix4(modelGroup.matrixWorld)
        eferentPoints.push(w)
      })

      if (eferentPoints.length > 0) {
        const avg = eferentPoints.reduce((acc, value) => acc.add(value), new Vector3()).divideScalar(eferentPoints.length)
        const maxDist = eferentPoints.reduce((acc, value) => Math.max(acc, value.distanceTo(avg)), 0)
        setThalamusCenterWorld([avg.x, avg.y, avg.z])
        setThalamusRadiusWorld(Math.max(0.08, maxDist + modelRadiusLocal * 0.03))
      } else {
        setThalamusCenterWorld(modelCenterWorld)
        setThalamusRadiusWorld(Math.max(0.08, modelRadiusLocal * 0.08))
      }

      const nextNodeMap: Record<string, Vec3> = {}
      nodeAccum.forEach((entry, key) => {
        const avg = entry.sum.clone().divideScalar(Math.max(1, entry.count))
        nextNodeMap[key] = [avg.x, avg.y, avg.z]
      })
      setNodeCenterMap(nextNodeMap)

      setPinsWorld(next)
      // eslint-disable-next-line no-console
      console.info('[Scene] pinsWorld:', next)

      // dev: dump node names once for mapping verification
      try {
        const names: string[] = []
        modelGroup.traverse((obj: any) => {
          if (obj.name) names.push(obj.name)
        })
        // eslint-disable-next-line no-console
        console.info('[Scene] Model node names:', names.slice(0, 400))
      } catch (e) {
        // ignore
      }
    } catch (err) {
      // ignore
    }
  }, [modelGroup, allConnections, modelCenterWorld, modelRadiusLocal])

  // Build a reverse map from node name (lowercased) -> connection id for quick lookup on mesh click
  const nodeNameToConnection = useMemo(() => {
    const map = new Map<string, ConnectionWithType>()
    allConnections.forEach((c) => {
      const nodes: string[] | undefined = c.tipo === 'eferencia' ? ((c as any).mappedNodes as string[] | undefined) : undefined
      const mapped = nodes ?? (CONNECTION_NODE_MAP[c.id] as string[] | undefined)
      if (mapped && mapped.length > 0) {
        mapped.forEach((n) => {
          extractMeshNameTokens(n || '').forEach((candidate) => {
            map.set(canonicalNodeKey(candidate), c)
          })
          map.set(canonicalNodeKey(n || ''), c)
          map.set(canonicalNodeKey((n || '').replace(/\.(obj|stl|mtl)$/i, '')), c)
        })
      }
    })
    return map
  }, [allConnections])

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
    setManualHighlighted(null)
  }, [selectedConnection])


  const handleSelectConnection = (
    connection: ConnectionWithType,
    organPosition: Vec3,
    pieceRadius?: number,
    pieceName?: string | null,
  ) => {
    const hasApproxAnchor = connection.tipo === 'eferencia'
    onSelectConnection(connection)
    setActiveView(connection.id)
    onSelectedPieceInfoChange?.({
      name: pieceName ?? connection.nombre,
      infoText: hasApproxAnchor
        ? `${connection.infoText} Origen talamico mostrado de forma aproximada sobre el modelo para representar la via eferente.`
        : connection.infoText,
    })

    if (!controlsRef.current) {
      return
    }

    setCameraGoal(buildFocusGoal(controlsRef.current, organPosition, pieceRadius))
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
    setSelectedMeshCenter(null)
    setSelectedMeshName(null)
    onSelectedPieceInfoChange?.(null)
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
    const minDistance = MIN_CAMERA_DISTANCE
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

  const clearSelection = () => {
    onSelectConnection(null)
    setActiveView(null)
    setManualHighlighted(null)
    setSelectedMeshCenter(null)
    setSelectedMeshName(null)
    onSelectedPieceInfoChange?.(null)
  }

  const toWorld = (position: Vec3): Vec3 => {
    if (!modelGroup) {
      return position
    }
    const local = new Vector3(position[0], position[1], position[2])
    const world = local.clone().applyMatrix4(modelGroup.matrixWorld)
    return [world.x, world.y, world.z]
  }

  const getThalamusOriginForConnection = (connection: ConnectionWithType): Vec3 => {
    const center = new Vector3(thalamusCenterWorld[0], thalamusCenterWorld[1], thalamusCenterWorld[2])
    const base = new Vector3(...toWorld(connection.posicionLocal))
    const fine = THALAMIC_NUCLEUS_DIRECTIONS[connection.id]
    const fineVec = fine ? new Vector3(fine[0], fine[1], fine[2]).multiplyScalar(Math.max(0.01, thalamusRadiusWorld * 0.35)) : new Vector3()
    const candidate = base.clone().add(fineVec)

    let dir = candidate.clone().sub(center)
    if (dir.lengthSq() <= 0.000001) {
      dir = base.clone().sub(center)
    }
    if (dir.lengthSq() <= 0.000001) {
      return [candidate.x, candidate.y, candidate.z]
    }

    // Keep starts on thalamus shell (not random internal points or superior drift).
    const radius = Math.max(0.08, thalamusRadiusWorld * 0.82)
    const point = center.clone().add(dir.normalize().multiplyScalar(radius))
    return [point.x, point.y, point.z]
  }

  const getConnectionTargetForLine = (connection: ConnectionWithType): Vec3 => {
    const mapped = connection.tipo === 'eferencia'
      ? (((connection as any).mappedNodes as string[] | undefined) ?? CONNECTION_NODE_MAP[connection.id])
      : undefined

    if (!mapped || mapped.length === 0) {
      const pinned = pinsWorld[connection.id]
      return pinned ?? toWorld(connection.posicionDestino)
    }

    const centers: Vector3[] = []
    mapped.forEach((name) => {
      const keys = new Set<string>()
      keys.add(canonicalNodeKey(name))
      keys.add(canonicalNodeKey((name || '').replace(/\.(obj|stl|mtl)$/i, '')))
      extractMeshNameTokens(name || '').forEach((token) => keys.add(canonicalNodeKey(token)))
      keys.forEach((key) => {
        const c = nodeCenterMap[key]
        if (c) centers.push(new Vector3(c[0], c[1], c[2]))
      })
    })

    if (centers.length === 0) {
      const fallbackTokens = EFERENT_FALLBACK_NODE_TOKENS[connection.id] ?? []
      fallbackTokens.forEach((token) => {
        const c = nodeCenterMap[canonicalNodeKey(token)]
        if (c) centers.push(new Vector3(c[0], c[1], c[2]))
      })
    }

    if (centers.length === 0) {
      const pinned = pinsWorld[connection.id]
      return pinned ?? toWorld(connection.posicionDestino)
    }

    const avg = centers.reduce((acc, value) => acc.add(value), new Vector3()).divideScalar(centers.length)
    return [avg.x, avg.y, avg.z]
  }

  const dimOpacity = activeView ? 0.1 : 1

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
          onMeshClick={(info) => {
            if (!info) return
            try {
              if (controlsRef.current) {
                const name = info.name
                setManualHighlighted(name ? [name] : null)
                setSelectedMeshName(name || null)
                const formattedPieceName = formatPieceName(name || '')
                // `ModelLoader` returns piece center in world space.
                const pieceCenter: Vec3 = [info.center[0], info.center[1], info.center[2]]
                setSelectedMeshCenter(pieceCenter)

                // map mesh name to connection and select it if available
                const conn = resolveConnectionByObjectName(info.name || '', nodeNameToConnection)
                if (conn) {
                  handleSelectConnection(conn, pieceCenter, info.radius, formattedPieceName)
                } else {
                  setActiveView(null)
                  onSelectConnection(null)
                  onSelectedPieceInfoChange?.({
                    name: formattedPieceName,
                    infoText: buildAcademicPieceInfo(name || ''),
                  })
                  setCameraGoal(buildFocusGoal(controlsRef.current, pieceCenter, info.radius))
                }
              }
            } catch (err) {
              // ignore
            }
          }}
          position={connections.nodoCentral.posicion}
          scale={0.95}
          highlightedNodeNames={
            selectedConnection
              ? ((selectedConnection as any).mappedNodes as string[] | undefined) ?? CONNECTION_NODE_MAP[selectedConnection.id] ?? null
              : manualHighlighted
          }
          highlightColor={selectedConnection?.tipo === 'eferencia' ? '#ef4444' : '#FB923C'}
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

          // For eferencias, use explicit mapped nodes or clinical map.
          const mapped = connection.tipo === 'eferencia'
            ? ((connection as any).mappedNodes as string[] | undefined) ?? CONNECTION_NODE_MAP[connection.id]
            : undefined

          return (
            <group key={connection.id}>
              {connection.pin && viewSettings.layers.showTargetOrgans && (() => {
                // Use precomputed pin world positions when available
                const worldPos = pinsWorld[connection.id]
                const pos = worldPos ? new Vector3(worldPos[0], worldPos[1], worldPos[2]) : new Vector3(connection.posicionDestino[0], connection.posicionDestino[1], connection.posicionDestino[2])

                return (
                  <Pin
                    position={[pos.x, pos.y, pos.z]}
                    label={connection.nombre}
                    image={(connection as any).pinImage}
                    onClick={() => {
                      handleSelectConnection(connection, [pos.x, pos.y, pos.z])
                    }}
                  />
                )
              })()}

              {viewSettings.layers.showNerves && connection.tipo === 'eferencia' && (
                <ConnectionLine
                  start={
                    selectedConnection?.id === connection.id && selectedMeshCenter && isLikelyThalamicMesh(selectedMeshName || '')
                      ? selectedMeshCenter
                      : getThalamusOriginForConnection(connection)
                  }
                  end={getConnectionTargetForLine(connection)}
                  anchorCenter={modelCenterWorld}
                  startSurfaceOffset={0}
                  endSurfaceOffset={Math.max(0.02, modelRadiusLocal * 0.01)}
                  arcHeight={isActive ? Math.max(0.72, modelRadiusLocal * 0.28) : Math.max(0.52, modelRadiusLocal * 0.22)}
                  color={connection.colorLinea}
                  isActive={isActive}
                  opacity={opacity}
                  onClick={(event) => {
                    event.stopPropagation()
                    const world = pinsWorld[connection.id]
                    handleSelectConnection(connection, world ?? connection.posicionDestino)
                  }}
                />
              )}

              {viewSettings.layers.showTargetOrgans && connection.tipo === 'eferencia' && mapped && mapped.length > 0 && (
                <NodePin
                  nodeNames={mapped}
                  modelCenter={modelCenterWorld}
                  outwardOffset={Math.max(0.22, modelRadiusLocal * 0.06)}
                  isActive={isActive}
                  onClick={(event) => {
                    event.stopPropagation()
                    const world = pinsWorld[connection.id]
                    handleSelectConnection(connection, world ?? connection.posicionDestino)
                  }}
                />
              )}

              {connection.tipo === 'eferencia'
                && selectedConnection?.id === connection.id
                && Array.isArray((connection as any).externalTargets)
                && (connection as any).externalTargets.length > 0 && (
                <ExternalTargetIndicator
                  nodeNames={mapped}
                  modelCenter={modelCenterWorld}
                  fallbackPosition={
                    selectedMeshCenter
                    ?? (pinsWorld[connection.id] as [number, number, number] | undefined)
                    ?? toWorld(connection.posicionDestino)
                  }
                  label="Conexiones No Modeladas"
                  details={((connection as any).externalTargets as string[]).map((target) => `Relacionado con: ${target}`)}
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
          minDistance={MIN_CAMERA_DISTANCE}
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
        {/* DOM-based pointer handler: raycast on pointerdown to detect clicks in empty space */}
        <CanvasPointerManager onPointerMissed={() => {
          // eslint-disable-next-line no-console
          console.info('[Scene] pointer missed (DOM raycast)')
          clearSelection()
        }} />
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
