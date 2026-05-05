import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas } from '@react-three/fiber'
import {
  Center,
  Html,
  Line,
  ContactShadows,
  Environment,
  OrbitControls,
  type OrbitControlsProps,
} from '@react-three/drei'
import { Box3, MOUSE, Vector3, Plane, Sphere } from 'three'
import type { Material } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import ModelLoader from './components/ModelLoader'
import CameraControls from './components/CameraControls'
import ThalamusPlaceholder from './components/ThalamusPlaceholder'
import {
  buildFocusGoal,
  CameraAnimator,
  useCanvasPointerManager,
  getQuickViewGoal,
  type CameraGoal,
  type QuickViewPreset,
} from './utils/sceneUtils'
import {
  THALAMUS_NUCLEI,
  getThalamusMeshColor,
  MESH_NAME_TO_NUCLEUS_ID,
  getThalamusSelectionInfoFromMesh,
  type ThalamusSelectionInfo,
} from './data/thalamusData'
import type { ViewSettings } from './types/connections'
import './Scene.css'

const THALAMUS_MODEL_URL = '/models/talamus.glb'
const PANEL_HALF_WIDTH_WORLD = 1.9
const PANEL_ANCHOR_INSET_WORLD = 0.12
const PANEL_MIN_DISTANCE_X = 5.8
const PANEL_DISTANCE_FACTOR_X = 0.62
const PANEL_HEIGHT_FACTOR = 0.1
const PANEL_MIN_HEIGHT_OFFSET = 0.65
const SELECTION_FOCUS_RADIUS_MULTIPLIER = 1.55
const PANEL_GRID_ROW_GAP_Y = 12
const PANEL_GRID_COL_GAP_X = 12
const PANEL_GRID_ROWS = 2
const THALAMUS_SELECTED_COLOR = '#1d4ed8'
const THALAMUS_SELECTED_EMISSIVE = '#93c5fd'
const THALAMUS_CONTEXT_IDLE_COLOR = '#b8b0a1'
const THALAMUS_CONTEXT_ACTIVE_COLOR = '#9d9485'
type Vec3Tuple = [number, number, number]

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
  onSelectedNucleusChange?: (info: ThalamusSelectionInfo | null) => void
  clearSelectionSignal?: number
}

function CanvasPointerManagerComponent({ onPointerMissed }: { onPointerMissed: () => void }) {
  useCanvasPointerManager(onPointerMissed)
  return null
}

function DiagramLines({
  modelGroup,
  activeNucleus,
  activeNucleusCenter,
  activeNucleusRadius,
  hoverLabelPos,
  affStartAnchors,
  effStartAnchors,
  affPinOffsets,
  effPinOffsets,
  openAfferenceIndex,
  openEfferenceIndex,
  onSelectAfference,
  onSelectEfference,
}: {
  modelGroup: any
  activeNucleus: string | null
  activeNucleusCenter: Vec3Tuple | null
  activeNucleusRadius: number | null
  hoverLabelPos: Vec3Tuple | null
  affStartAnchors: Vec3Tuple[]
  effStartAnchors: Vec3Tuple[]
  affPinOffsets: (Vec3Tuple | null)[]
  effPinOffsets: (Vec3Tuple | null)[]
  openAfferenceIndex: number | null
  openEfferenceIndex: number | null
  onSelectAfference: (index: number) => void
  onSelectEfference: (index: number) => void
}) {
  const [centerPoint, setCenterPoint] = useState<Vec3Tuple | null>(null)
  const [surfaceRadius, setSurfaceRadius] = useState(0.45)

  useEffect(() => {
    if (activeNucleusCenter && activeNucleusRadius && activeNucleusRadius > 0.001) {
      setCenterPoint(activeNucleusCenter)
      setSurfaceRadius(activeNucleusRadius)
      return
    }

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

    const box = new Box3().setFromObject(activeMesh)
    const center = box.getCenter(new Vector3())
    const sphere = box.getBoundingSphere(new Sphere())
    const nextRadius = Math.max(0.15, sphere.radius)
    setCenterPoint([center.x, center.y, center.z])
    setSurfaceRadius(nextRadius)
  }, [activeNucleus, activeNucleusCenter, modelGroup])

  if (!activeNucleus || !centerPoint) return null

  const buildTopPins = (side: 'left' | 'right', count: number, offsets: (Vec3Tuple | null)[]) => {
    const safeCount = Math.max(1, count)
    const radius = Math.max(0.15, surfaceRadius)
    const topSurfaceY = centerPoint[1] + radius * 0.92
    const anchorY = hoverLabelPos ? Math.min(hoverLabelPos[1] - 0.12, topSurfaceY + 0.08) : topSurfaceY
    const anchorX = hoverLabelPos ? hoverLabelPos[0] : centerPoint[0]
    const anchorZ = hoverLabelPos ? hoverLabelPos[2] : centerPoint[2]
    const sideBias = side === 'left' ? -1 : 1

    return Array.from({ length: safeCount }, (_, idx) => {
      const custom = offsets[idx] ?? null
      if (custom) {
        const clampedX = Math.max(-radius * 0.44, Math.min(radius * 0.44, custom[0]))
        const clampedY = Math.max(-0.04, Math.min(0.16, custom[1]))
        const clampedZ = Math.max(-radius * 0.44, Math.min(radius * 0.44, custom[2]))
        return [anchorX + clampedX, anchorY + clampedY, anchorZ + clampedZ] as Vec3Tuple
      }

      const t = safeCount === 1 ? 0 : idx - (safeCount - 1) / 2
      const xOffset = sideBias * (0.14 + Math.abs(t) * 0.06)
      const zOffset = t * 0.11
      // Keep pins on top band near label and away from lateral faces.
      const clampedX = Math.max(-radius * 0.42, Math.min(radius * 0.42, xOffset))
      const clampedZ = Math.max(-radius * 0.42, Math.min(radius * 0.42, zOffset))
      return [
        anchorX + clampedX,
        anchorY + (idx % 2 === 0 ? 0.015 : -0.015),
        anchorZ + clampedZ,
      ] as Vec3Tuple
    })
  }

  const affStarts = affStartAnchors.length > 0 ? affStartAnchors : [centerPoint]
  const effStarts = effStartAnchors.length > 0 ? effStartAnchors : [centerPoint]
  const affEnds = buildTopPins('left', affStarts.length, affPinOffsets)
  const effEnds = buildTopPins('right', effStarts.length, effPinOffsets)

  return (
    <>
      {affStarts.map((start, idx) => {
        const pin = affEnds[idx] ?? centerPoint
        const isActive = openAfferenceIndex === idx
        const needleTop: [number, number, number] = [pin[0], pin[1] + 0.26, pin[2]]
        const airRailY = Math.max(start[1], needleTop[1]) + 0.35 + idx * 0.02
        const curveMid: [number, number, number] = [
          (start[0] + needleTop[0]) / 2,
          airRailY,
          (start[2] + needleTop[2]) / 2,
        ]
        return (
          <group key={`aff-line-${idx}`}>
            <Line
              points={[start, curveMid, needleTop]}
              color="#2563eb"
              lineWidth={2.2}
              transparent={false}
              opacity={1}
              depthTest={false}
              renderOrder={11}
            />
            <Line
              points={[needleTop, pin]}
              color="#2563eb"
              lineWidth={2.8}
              transparent={false}
              opacity={1}
              depthTest={false}
              renderOrder={12}
            />
            <mesh position={pin} renderOrder={13}>
              <sphereGeometry args={[isActive ? 0.07 : 0.052, 16, 16]} />
              <meshBasicMaterial color={isActive ? '#1d4ed8' : '#2563eb'} depthTest={false} />
            </mesh>
            <mesh
              position={pin}
              renderOrder={14}
              onClick={(event) => {
                event.stopPropagation()
                onSelectAfference(idx)
              }}
            >
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial transparent opacity={0} depthTest={false} />
            </mesh>
          </group>
        )
      })}
      {effStarts.map((start, idx) => {
        const pin = effEnds[idx] ?? centerPoint
        const isActive = openEfferenceIndex === idx
        const needleTop: [number, number, number] = [pin[0], pin[1] + 0.26, pin[2]]
        const airRailY = Math.max(start[1], needleTop[1]) + 0.35 + idx * 0.02
        const curveMid: [number, number, number] = [
          (start[0] + needleTop[0]) / 2,
          airRailY,
          (start[2] + needleTop[2]) / 2,
        ]
        return (
          <group key={`eff-line-${idx}`}>
            <Line
              points={[start, curveMid, needleTop]}
              color="#dc2626"
              lineWidth={2.2}
              transparent={false}
              opacity={1}
              depthTest={false}
              renderOrder={11}
            />
            <Line
              points={[needleTop, pin]}
              color="#dc2626"
              lineWidth={2.8}
              transparent={false}
              opacity={1}
              depthTest={false}
              renderOrder={12}
            />
            <mesh position={pin} renderOrder={13}>
              <sphereGeometry args={[isActive ? 0.07 : 0.052, 16, 16]} />
              <meshBasicMaterial color={isActive ? '#b91c1c' : '#dc2626'} depthTest={false} />
            </mesh>
            <mesh
              position={pin}
              renderOrder={14}
              onClick={(event) => {
                event.stopPropagation()
                onSelectEfference(idx)
              }}
            >
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial transparent opacity={0} depthTest={false} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

export default function ThalamusScene({
  viewSettings,
  clippingEnabled = true,
  onModelBoundsComputed,
  onSelectedNucleusChange,
  clearSelectionSignal = 0,
}: ThalamusSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [controlsReady, setControlsReady] = useState(false)
  const [modelGroup, setModelGroup] = useState<any>(null)
  const [cameraGoal, setCameraGoal] = useState<CameraGoal | null>(null)
  const [isAutoRotate, setIsAutoRotate] = useState(false)
  const [manualHighlighted, setManualHighlighted] = useState<string[] | null>(null)
  const [activeQuickView, setActiveQuickView] = useState<QuickViewPreset | null>(null)
  const [modelColor, setModelColor] = useState('#ced8e6')
  const [activeNucleus, setActiveNucleus] = useState<string | null>(null)
  const [activeNucleusCenter, setActiveNucleusCenter] = useState<[number, number, number] | null>(null)
  const [activeNucleusRadius, setActiveNucleusRadius] = useState<number | null>(null)
  const [openAfferenceIndex, setOpenAfferenceIndex] = useState<number | null>(null)
  const [openEfferenceIndex, setOpenEfferenceIndex] = useState<number | null>(null)
  const [modelFrame, setModelFrame] = useState<{
    center: [number, number, number]
    size: [number, number, number]
  }>({
    center: [0, 0, 0],
    size: [12, 12, 12],
  })
  const activeNucleusData = activeNucleus ? THALAMUS_NUCLEI[activeNucleus] : null
  const affCount = activeNucleusData?.afferences.length ?? 0
  const effCount = activeNucleusData?.efferences.length ?? 0
  const thalamusModelColor = useMemo(() => undefined, [])

  const HOME_VIEW_MULTIPLIER = 1
  const QUICK_VIEW_MULTIPLIER = 2
  const MIN_CAMERA_DISTANCE = 0.01
  const initialPositionSetRef = useRef(false)
  const onModelBoundsComputedRef = useRef(onModelBoundsComputed)

  useEffect(() => {
    onModelBoundsComputedRef.current = onModelBoundsComputed
  }, [onModelBoundsComputed])

  useEffect(() => {
    if (!modelGroup) return

    modelGroup.traverse((child: any) => {
      if (!child?.isMesh || !child.material) return

      const materials: Material[] = Array.isArray(child.material)
        ? (child.material as Material[])
        : [child.material as Material]

      const nucleusKey = resolveNucleusKey(child.name || null)
      const isSelected = Boolean(activeNucleus) && nucleusKey === activeNucleus
      const hasSelection = Boolean(activeNucleus)

      materials.forEach((material) => {
        const anyMat = material as any
        const hasEmissive = anyMat?.emissive && typeof anyMat.emissive.setHex === 'function'
        const canFade = typeof anyMat?.opacity === 'number' && typeof anyMat?.transparent === 'boolean'
        const isContextMesh = anyMat.userData.__thalamusRole === 'context' || !anyMat.userData.__nucleusPieceColor

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
        if (anyMat.color?.set && anyMat.userData.__nucleusPieceColor === undefined) {
          anyMat.userData.__nucleusPieceColor = getThalamusMeshColor(child.name || null)
        }
        if (!hasSelection) {
          if (anyMat.color?.set && anyMat.userData.__nucleusPieceColor) {
            anyMat.color.set(anyMat.userData.__nucleusPieceColor)
          } else if (anyMat.color?.set) {
            anyMat.color.set(THALAMUS_CONTEXT_IDLE_COLOR)
          }
          if (hasEmissive) {
            anyMat.emissive.setHex(
              isContextMesh
                ? (anyMat.userData.__nucleusBaseEmissiveHex ?? 0xe7edf5)
                : (anyMat.userData.__nucleusBaseEmissiveHex ?? 0x000000),
            )
          }
          if (typeof anyMat?.emissiveIntensity === 'number') {
            anyMat.emissiveIntensity = isContextMesh
              ? Math.max(anyMat.userData.__nucleusBaseEmissiveIntensity ?? 0, 0.05)
              : (anyMat.userData.__nucleusBaseEmissiveIntensity ?? 0)
          }
          if (canFade) {
            anyMat.opacity = isContextMesh
              ? 1
              : (anyMat.userData.__nucleusBaseOpacity ?? 1)
            anyMat.transparent = isContextMesh ? false : Boolean(anyMat.userData.__nucleusBaseTransparent)
          }
          material.needsUpdate = true
          return
        }

        if (isSelected) {
          if (anyMat.color?.set) {
            anyMat.color.set(THALAMUS_SELECTED_COLOR)
          }
          if (hasEmissive) {
            anyMat.emissive.set(THALAMUS_SELECTED_EMISSIVE)
          }
          if (typeof anyMat?.emissiveIntensity === 'number') {
            anyMat.emissiveIntensity = 1.25
          }
          if (canFade) {
            anyMat.opacity = 1
            anyMat.transparent = false
          }
        } else if (canFade) {
          if (anyMat.color?.set && anyMat.userData.__nucleusPieceColor) {
            anyMat.color.set(anyMat.userData.__nucleusPieceColor)
          } else if (anyMat.color?.set) {
            anyMat.color.set(THALAMUS_CONTEXT_ACTIVE_COLOR)
          }
          if (hasEmissive) {
            anyMat.emissive.setHex(
              isContextMesh
                ? (anyMat.userData.__nucleusBaseEmissiveHex ?? 0xe7edf5)
                : (anyMat.userData.__nucleusBaseEmissiveHex ?? 0x000000),
            )
          }
          if (typeof anyMat?.emissiveIntensity === 'number') {
            anyMat.emissiveIntensity = isContextMesh
              ? Math.max(anyMat.userData.__nucleusBaseEmissiveIntensity ?? 0, 0.04)
              : (anyMat.userData.__nucleusBaseEmissiveIntensity ?? 0)
          }
          anyMat.opacity = isContextMesh ? 0.82 : 0.14
          anyMat.transparent = false
        }

        material.needsUpdate = true
      })
    })
  }, [activeNucleus, modelGroup, viewSettings.xrayMode])

  const handleControlsRef = useCallback((instance: OrbitControlsImpl | null) => {
    controlsRef.current = instance
    setControlsReady(Boolean(instance))
  }, [])

  const clippingPlaneYMaxRef = useRef(new Plane(new Vector3(0, -1, 0), 0))
  const clippingPlaneYMinRef = useRef(new Plane(new Vector3(0, 1, 0), 0))
  const clippingPlaneXMaxRef = useRef(new Plane(new Vector3(-1, 0, 0), 0))
  const clippingPlaneXMinRef = useRef(new Plane(new Vector3(1, 0, 0), 0))
  const clippingCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const clippingPlanes = clippingEnabled
    ? [clippingPlaneYMaxRef.current, clippingPlaneYMinRef.current, clippingPlaneXMaxRef.current, clippingPlaneXMinRef.current]
    : []

  useEffect(() => {
    if (!clippingEnabled) return
    const offsetX = clippingCenterRef.current.x
    const offsetY = clippingCenterRef.current.y
    clippingPlaneYMaxRef.current.constant = offsetY + viewSettings.clippingYMax
    clippingPlaneYMinRef.current.constant = -(offsetY + viewSettings.clippingYMin)
    clippingPlaneXMaxRef.current.constant = offsetX + viewSettings.clippingXMax
    clippingPlaneXMinRef.current.constant = -(offsetX + viewSettings.clippingXMin)
  }, [
    clippingEnabled,
    viewSettings.clippingYMax,
    viewSettings.clippingYMin,
    viewSettings.clippingXMax,
    viewSettings.clippingXMin,
  ])

  const applyHomeView = (multiplier: number) => {
    const goal = getQuickViewGoal(modelGroup, 'isometric', multiplier)
    if (goal) {
      setCameraGoal(goal)
      setActiveQuickView('isometric')
      setIsAutoRotate(false)
    }
  }

  const applyQuickView = (view: QuickViewPreset) => {
    const goal = getQuickViewGoal(modelGroup, view, QUICK_VIEW_MULTIPLIER)
    if (goal) {
      setCameraGoal(goal)
      setActiveQuickView(view)
      setIsAutoRotate(false)
    }
  }

  useEffect(() => {
    if (initialPositionSetRef.current) return
    if (!modelGroup || !controlsReady) return

    applyHomeView(HOME_VIEW_MULTIPLIER)
    initialPositionSetRef.current = true
  }, [modelGroup, controlsReady])

  useEffect(() => {
    if (!modelGroup) return

    try {
      modelGroup.updateMatrixWorld(true)
      const box = new Box3().setFromObject(modelGroup)
      const size = box.getSize(new Vector3())
      const center = box.getCenter(new Vector3())
      if (size.length() < 0.05) return

      clippingCenterRef.current = { x: center.x, y: center.y }
      setModelFrame({
        center: [center.x, center.y, center.z],
        size: [size.x, size.y, size.z],
      })
      const halfHeight = Math.max(0.001, size.y * 0.58)
      const halfWidth = Math.max(0.001, size.x * 0.5)
      onModelBoundsComputedRef.current?.({ halfHeight, halfWidth })

      if (clippingEnabled) {
        clippingPlaneYMaxRef.current.constant = center.y + viewSettings.clippingYMax
        clippingPlaneYMinRef.current.constant = -(center.y + viewSettings.clippingYMin)
        clippingPlaneXMaxRef.current.constant = center.x + viewSettings.clippingXMax
        clippingPlaneXMinRef.current.constant = -(center.x + viewSettings.clippingXMin)
      }
    } catch (err) {
      // ignore
    }
  }, [
    clippingEnabled,
    modelGroup,
    viewSettings.explodeAmount,
    viewSettings.clippingYMax,
    viewSettings.clippingYMin,
    viewSettings.clippingXMax,
    viewSettings.clippingXMin,
  ])

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
    setManualHighlighted(null)
    setCameraGoal(null)
    setActiveQuickView(null)
    applyHomeView(HOME_VIEW_MULTIPLIER)
  }

  const handleStepZoom = (factor: number) => {
    if (!controlsRef.current) return

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

  const clearSelection = useCallback(() => {
    setManualHighlighted(null)
    setActiveNucleus(null)
    setActiveNucleusCenter(null)
    setActiveNucleusRadius(null)
    setOpenAfferenceIndex(null)
    setOpenEfferenceIndex(null)
    onSelectedNucleusChange?.(null)
  }, [onSelectedNucleusChange])

  useEffect(() => {
    clearSelection()
  }, [clearSelectionSignal, clearSelection])

  useEffect(() => {
    setOpenAfferenceIndex(null)
    setOpenEfferenceIndex(null)
  }, [activeNucleus])

  const panelDistanceX = Math.max(modelFrame.size[0] * PANEL_DISTANCE_FACTOR_X, PANEL_MIN_DISTANCE_X)
  const panelDistanceAdjusted = Math.max(
    4.9,
    panelDistanceX + (Math.max(affCount, effCount) > 1 ? 0.6 : 0),
  )
  const panelY = modelFrame.center[1] + Math.max(modelFrame.size[1] * PANEL_HEIGHT_FACTOR, PANEL_MIN_HEIGHT_OFFSET)
  const leftPanelPos: [number, number, number] = [modelFrame.center[0] - panelDistanceAdjusted, panelY, modelFrame.center[2]]
  const rightPanelPos: [number, number, number] = [modelFrame.center[0] + panelDistanceAdjusted, panelY, modelFrame.center[2]]
  const hoverLabelPos: [number, number, number] | null = activeNucleusCenter
    ? [
        activeNucleusCenter[0],
        activeNucleusCenter[1] + Math.max(modelFrame.size[1] * 0.08, 0.35),
        activeNucleusCenter[2],
      ]
    : null
  const buildCardPositions = (base: Vec3Tuple, count: number, side: 'left' | 'right'): Vec3Tuple[] => {
    const safeCount = Math.max(1, count)
    const rows = safeCount > 1 ? Math.min(PANEL_GRID_ROWS, safeCount) : 1
    const columns = Math.max(1, Math.ceil(safeCount / PANEL_GRID_ROWS))
    const halfRows = (rows - 1) / 2
    const stackHalfHeight = halfRows * PANEL_GRID_ROW_GAP_Y
    const topLimit = modelFrame.center[1] + Math.max(modelFrame.size[1] * 0.42, 2.4)
    const bottomLimit = modelFrame.center[1] - Math.max(modelFrame.size[1] * 0.42, 2.4)
    const minCenter = bottomLimit + stackHalfHeight
    const maxCenter = topLimit - stackHalfHeight
    const centeredY = Math.max(minCenter, Math.min(maxCenter, base[1]))
    const sideDir = side === 'left' ? -1 : 1
    const columnOrigin = side === 'left'
      ? columns - 1
      : 0

    return Array.from({ length: safeCount }, (_, idx) => {
      const col = Math.floor(idx / PANEL_GRID_ROWS)
      const row = idx % PANEL_GRID_ROWS
      const rowT = row - halfRows
      const outwardCol = side === 'left' ? columnOrigin - col : col
      const colOffset = sideDir * outwardCol * PANEL_GRID_COL_GAP_X
      return [
        base[0] + colOffset,
        centeredY - rowT * PANEL_GRID_ROW_GAP_Y,
        base[2],
      ]
    })
  }
  const affCardPositions = buildCardPositions(leftPanelPos, affCount, 'left')
  const effCardPositions = buildCardPositions(rightPanelPos, effCount, 'right')
  const affCompact = affCount > 1
  const effCompact = effCount > 1
  const affStartAnchors = affCardPositions.map((pos) => [
    pos[0] + PANEL_HALF_WIDTH_WORLD - PANEL_ANCHOR_INSET_WORLD,
    pos[1],
    pos[2],
  ] as Vec3Tuple)
  const effStartAnchors = effCardPositions.map((pos) => [
    pos[0] - PANEL_HALF_WIDTH_WORLD + PANEL_ANCHOR_INSET_WORLD,
    pos[1],
    pos[2],
  ] as Vec3Tuple)
  const affPinOffsets = activeNucleusData?.afferences.map((item: any) => item.originOffset ?? null) ?? []
  const effPinOffsets = activeNucleusData?.efferences.map((item: any) => item.originOffset ?? null) ?? []

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

        <OrbitControls
          ref={handleControlsRef}
          {...orbitControlsProps}
          onStart={() => {
            setCameraGoal(null)
            setActiveQuickView(null)
          }}
        />

        <CameraAnimator
          controlsRef={controlsRef}
          goal={cameraGoal}
          onSettled={() => {
            setCameraGoal(null)
          }}
        />

        <CanvasPointerManagerComponent onPointerMissed={clearSelection} />

        <Center>
          <DiagramLines
            modelGroup={modelGroup}
            activeNucleus={activeNucleus}
            activeNucleusCenter={activeNucleusCenter}
            activeNucleusRadius={activeNucleusRadius}
            hoverLabelPos={hoverLabelPos}
            affStartAnchors={affStartAnchors}
            effStartAnchors={effStartAnchors}
            affPinOffsets={affPinOffsets}
            effPinOffsets={effPinOffsets}
            openAfferenceIndex={openAfferenceIndex}
            openEfferenceIndex={openEfferenceIndex}
            onSelectAfference={(idx) => {
              setOpenAfferenceIndex((current) => (current === idx ? null : idx))
            }}
            onSelectEfference={(idx) => {
              setOpenEfferenceIndex((current) => (current === idx ? null : idx))
            }}
          />

          <ModelLoader
            url={THALAMUS_MODEL_URL}
            ref={setModelGroup}
            modelColor={thalamusModelColor}
            explodeAmount={viewSettings.explodeAmount}
            onMeshClick={(info) => {
              if (!info) return
              try {
                if (controlsRef.current) {
                  const nucleusKey = resolveNucleusKey(info.name)
                  setActiveNucleus(nucleusKey)
                  setManualHighlighted(info.name ? [info.name] : null)
                  onSelectedNucleusChange?.(getThalamusSelectionInfoFromMesh(info.name ?? null))

                  const pieceCenter: [number, number, number] = [info.center[0], info.center[1], info.center[2]]
                  setActiveNucleusCenter(pieceCenter)
                  setActiveNucleusRadius(info.radius ?? null)
                  const focusRadius = Math.max(
                    (info.radius ?? 0.25) * SELECTION_FOCUS_RADIUS_MULTIPLIER,
                    info.radius ?? 0.25,
                  )
                  setCameraGoal(buildFocusGoal(controlsRef.current, pieceCenter, focusRadius))
                }
              } catch (err) {
                // ignore
              }
            }}
            position={[0, 0, 0]}
            scale={0.95}
            highlightedNodeNames={manualHighlighted}
            highlightColor="#60a5fa"
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
              {hoverLabelPos && (
                <Html position={hoverLabelPos} center occlude={false}>
                  <div className="thalamus-hover-tag" role="note">
                    {activeNucleusData.name}
                  </div>
                </Html>
              )}

              {activeNucleusData.afferences.map((item, idx) => {
                const isOpen = openAfferenceIndex === idx
                return (
                  <Html key={`aff-card-${idx}`} position={affCardPositions[idx] ?? leftPanelPos} center occlude={false}>
                    <section
                      className={`thalamus-floating-panel thalamus-connection-card afference${affCompact ? ' compact' : ''}${isOpen ? ' expanded' : ' collapsed'}`}
                      aria-label={`Aferencia ${idx + 1}`}
                      onPointerDown={(event) => {
                        event.stopPropagation()
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      <button
                        type="button"
                        className={`thalamus-card-trigger ${isOpen ? 'open' : ''}`}
                        aria-expanded={isOpen}
                        onPointerDown={(event) => {
                          event.stopPropagation()
                        }}
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenAfferenceIndex((current) => (current === idx ? null : idx))
                        }}
                      >
                        <span className="thalamus-card-trigger-title">Aferencias</span>
                        <span className="thalamus-card-trigger-label">{item.label}</span>
                        <span className="thalamus-card-trigger-icon">{isOpen ? '−' : '+'}</span>
                      </button>

                      {isOpen && (
                        <>
                          <p className="thalamus-panel-subtitle">{activeNucleusData.name}</p>
                          <article className="thalamus-panel-item">
                            <p className="thalamus-panel-meta">{item.main}</p>
                            <p className="thalamus-panel-meta"><strong>Rol:</strong> {item.functionRole}</p>
                          </article>
                          <article className="thalamus-panel-item thalamus-panel-function">
                            <p className="thalamus-panel-meta"><strong>{'Funci\u00f3n:'}</strong> {activeNucleusData.functionCore}</p>
                          </article>
                        </>
                      )}
                    </section>
                  </Html>
                )
              })}

              {activeNucleusData.efferences.map((item, idx) => {
                const isOpen = openEfferenceIndex === idx
                return (
                  <Html key={`eff-card-${idx}`} position={effCardPositions[idx] ?? rightPanelPos} center occlude={false}>
                    <section
                      className={`thalamus-floating-panel thalamus-connection-card efference${effCompact ? ' compact' : ''}${isOpen ? ' expanded' : ' collapsed'}`}
                      aria-label={`Eferencia ${idx + 1}`}
                      onPointerDown={(event) => {
                        event.stopPropagation()
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      <button
                        type="button"
                        className={`thalamus-card-trigger ${isOpen ? 'open' : ''}`}
                        aria-expanded={isOpen}
                        onPointerDown={(event) => {
                          event.stopPropagation()
                        }}
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenEfferenceIndex((current) => (current === idx ? null : idx))
                        }}
                      >
                        <span className="thalamus-card-trigger-title">Eferencias</span>
                        <span className="thalamus-card-trigger-label">{item.label}</span>
                        <span className="thalamus-card-trigger-icon">{isOpen ? '−' : '+'}</span>
                      </button>

                      {isOpen && (
                        <>
                          <p className="thalamus-panel-subtitle">{activeNucleusData.name}</p>
                          <article className="thalamus-panel-item">
                            <p className="thalamus-panel-meta">{item.main}</p>
                            <p className="thalamus-panel-meta"><strong>Rol:</strong> {item.functionRole}</p>
                          </article>
                          <article className="thalamus-panel-item thalamus-panel-function">
                            <p className="thalamus-panel-meta"><strong>{'Funci\u00f3n:'}</strong> {activeNucleusData.functionCore}</p>
                          </article>
                        </>
                      )}
                    </section>
                  </Html>
                )
              })}
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
