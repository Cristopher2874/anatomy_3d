import { useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3, MathUtils, Raycaster, Box3, Sphere } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { easing } from 'maath'
import type { Vec3 } from '../types/connections'

export type CameraGoal = {
  target: Vec3
  position: Vec3
}

export type QuickViewPreset = 'isometric' | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'

/**
 * Computes a stable camera goal that frames the given organ position.
 * Preserves the current viewing direction while adjusting distance based on piece radius.
 */
export function buildFocusGoal(
  controls: OrbitControlsImpl,
  organPosition: Vec3,
  pieceRadius?: number,
): CameraGoal {
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
    const nearbySelectionThreshold = Math.max(0.45, pieceRadius * 4)
    const shouldPreserveLocalZoom = targetShift <= nearbySelectionThreshold
    const nextDistance = shouldPreserveLocalZoom ? Math.min(distance, safeDistance) : safeDistance
    const nextPosition = nextTarget.clone().add(direction.multiplyScalar(nextDistance))
    return {
      target: organPosition,
      position: [nextPosition.x, nextPosition.y, nextPosition.z],
    }
  }

  const desiredDistance = Math.min(4.2, Math.max(1.7, distance * 0.58))
  const nextPosition = new Vector3(organPosition[0], organPosition[1], organPosition[2]).add(
    direction.multiplyScalar(desiredDistance),
  )

  return {
    target: organPosition,
    position: [nextPosition.x, nextPosition.y, nextPosition.z],
  }
}

/**
 * Component for animating camera position and target to a goal using damping.
 * Must be used inside a Canvas component.
 */
export function CameraAnimator({
  controlsRef,
  goal,
  onSettled,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  goal: CameraGoal | null
  onSettled?: () => void
}) {
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
      onSettled?.()
    }
  })

  return null
}

/**
 * Hook for handling pointer events on canvas to detect clicks.
 */
export function useCanvasPointerManager(
  onPointerMissed: () => void,
) {
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
      } catch (err) {
        // ignore
      }
    }

    gl.domElement.addEventListener('pointerdown', handler, false)
    return () => {
      gl.domElement.removeEventListener('pointerdown', handler, false)
    }
  }, [gl, camera, scene, onPointerMissed])
}

/**
 * Hook that detects when user manually controls the camera (rotate/zoom/pan)
 * and calls a callback to clear camera animation goals, allowing free exploration.
 */
export function useCameraInteractionClearing(
  controlsRef: React.RefObject<OrbitControlsImpl | null>,
  onUserInteraction: () => void,
) {
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    const handleChange = () => {
      onUserInteraction()
    }

    controls.addEventListener('change', handleChange)
    return () => {
      controls.removeEventListener('change', handleChange)
    }
  }, [controlsRef, onUserInteraction])
}

/**
 * Computes a quick view preset camera goal.
 */
export function getQuickViewGoal(
  modelGroup: any,
  view: QuickViewPreset,
  multiplier: number = 0.85,
): CameraGoal | null {
  if (!modelGroup) return null

  try {
    const brainNode = modelGroup.getObjectByName('Brain_Model') ?? modelGroup
    const box = new Box3().setFromObject(brainNode)
    const center = box.getCenter(new Vector3())
    const sphere = box.getBoundingSphere(new Sphere())

    const fovDeg = 48
    const fovRad = MathUtils.degToRad(fovDeg)
    const safeDistance = (sphere.radius / Math.sin(fovRad / 2)) * multiplier

    const directions: Record<QuickViewPreset, Vector3> = {
      isometric: new Vector3(1, 1, 1).normalize(),
      front: new Vector3(0, 0, 1),
      back: new Vector3(0, 0, -1),
      left: new Vector3(-1, 0, 0),
      right: new Vector3(1, 0, 0),
      top: new Vector3(0, 1, 0),
      bottom: new Vector3(0, -1, 0),
    }

    const direction = directions[view] ?? directions.isometric
    const nextPosition = center.clone().add(direction.multiplyScalar(safeDistance))

    return {
      target: [center.x, center.y, center.z],
      position: [nextPosition.x, nextPosition.y, nextPosition.z],
    }
  } catch (err) {
    return null
  }
}
