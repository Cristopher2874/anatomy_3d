import { QuadraticBezierLine } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { Box3, Vector3, Object3D } from 'three'

type ConnectionLineProps = {
  // Option A: explicit coordinates
  start?: [number, number, number]
  end?: [number, number, number]
  // Option B: object names inside the scene (will compute bounding-box centers)
  startName?: string
  endName?: string | string[]
  anchorCenter?: [number, number, number]
  startSurfaceOffset?: number
  endSurfaceOffset?: number
  arcHeight?: number
  color: string
  isActive?: boolean
  opacity?: number
  onClick?: (event: ThreeEvent<MouseEvent>) => void
}

// Midpoint computation is handled from computed centers when needed.

export default function ConnectionLine({
  start,
  end,
  startName,
  endName,
  anchorCenter,
  startSurfaceOffset = 0,
  endSurfaceOffset = 0,
  arcHeight = 0.45,
  color,
  isActive = false,
  opacity = 1,
  onClick,
}: ConnectionLineProps) {
  const { scene } = useThree()
  const [computedStart, setComputedStart] = useState<[number, number, number] | null>(null)
  const [computedEnd, setComputedEnd] = useState<[number, number, number] | null>(null)

  const toCanonical = (value: string) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const buildNameVariants = (value: string) => {
    const raw = value || ''
    const withoutExt = raw.replace(/\.(obj|stl|mtl)$/i, '')
    const tokens = withoutExt.split(/[.\-_ ]+/).map((part) => part.toLowerCase()).filter(Boolean)
    const region = tokens.length > 0 ? tokens[tokens.length - 1] : withoutExt.toLowerCase()
    return [raw, withoutExt, region]
  }

  const findObjectByNameFlexible = (name: string) => {
    const exact = scene.getObjectByName(name)
    if (exact) return exact

    const withoutExt = name.replace(/\.(obj|stl|mtl)$/i, '')
    const exactNoExt = scene.getObjectByName(withoutExt)
    if (exactNoExt) return exactNoExt

    const strictSet = new Set([toCanonical(name), toCanonical(withoutExt)])
    let strictFound: Object3D | null = null
    scene.traverse((obj) => {
      if (strictFound || !obj.name) return
      const direct = toCanonical(obj.name)
      const directNoExt = toCanonical(obj.name.replace(/\.(obj|stl|mtl)$/i, ''))
      if (strictSet.has(direct) || strictSet.has(directNoExt)) {
        strictFound = obj
      }
    })
    if (strictFound) return strictFound

    const targetSet = new Set(buildNameVariants(name).map((candidate) => toCanonical(candidate)))
    let found: Object3D | null = null
    scene.traverse((obj) => {
      if (found || !obj.name) return
      const matches = buildNameVariants(obj.name).some((candidate) => targetSet.has(toCanonical(candidate)))
      if (matches) {
        found = obj
      }
    })
    return found
  }

  const adjustedCurve = useMemo(() => {
    if (!computedStart || !computedEnd) {
      return null
    }

    const center = anchorCenter
      ? new Vector3(anchorCenter[0], anchorCenter[1], anchorCenter[2])
      : new Vector3(0, 0, 0)

    const startV = new Vector3(computedStart[0], computedStart[1], computedStart[2])
    const endV = new Vector3(computedEnd[0], computedEnd[1], computedEnd[2])
    const chordDistance = startV.distanceTo(endV)
    if (chordDistance <= 0.0001) {
      return null
    }

    if (startSurfaceOffset > 0) {
      let dir = startV.clone().sub(center)
      if (dir.lengthSq() <= 0.000001) {
        dir = endV.clone().sub(center)
      }
      if (dir.lengthSq() > 0.000001) {
        startV.add(dir.normalize().multiplyScalar(startSurfaceOffset))
      }
    }
    if (endSurfaceOffset > 0) {
      const dir = endV.clone().sub(center)
      if (dir.lengthSq() > 0.000001) {
        endV.add(dir.normalize().multiplyScalar(endSurfaceOffset))
      }
    }

    const mid = startV.clone().add(endV).multiplyScalar(0.5)
    const bulgeDir = mid.clone().sub(center)
    const effectiveArc = Math.min(arcHeight, Math.max(0.12, chordDistance * 0.7))
    if (bulgeDir.lengthSq() > 0.000001) {
      mid.add(bulgeDir.normalize().multiplyScalar(effectiveArc))
    } else {
      mid.y += effectiveArc
    }

    return {
      start: [startV.x, startV.y, startV.z] as [number, number, number],
      end: [endV.x, endV.y, endV.z] as [number, number, number],
      mid: [mid.x, mid.y, mid.z] as [number, number, number],
    }
  }, [computedStart, computedEnd, anchorCenter, startSurfaceOffset, endSurfaceOffset, arcHeight])

  function centerOf(obj: Object3D | null) {
    if (!obj) return new Vector3()
    // Imported meshes often keep origins away from anatomy; use bbox centers.
    try {
      const box = new Box3().setFromObject(obj)
      const c = new Vector3()
      box.getCenter(c)
      if (Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z)) {
        return c
      }
    } catch (e) {
      // fallback below
    }
    const worldPos = new Vector3()
    obj.getWorldPosition(worldPos)
    return worldPos
  }

  useEffect(() => {
    if (startName) {
      const sObj = findObjectByNameFlexible(startName) as Object3D | undefined
      const c = centerOf(sObj ?? null)
      setComputedStart([c.x, c.y, c.z])
    } else if (start) {
      setComputedStart(start)
    }

    if (endName) {
      const names = Array.isArray(endName) ? endName : [endName]
      const centers = names
        .map((n) => findObjectByNameFlexible(n))
        .filter(Boolean)
        .map((o) => centerOf(o as Object3D))

      if (centers.length === 0 && end) {
        setComputedEnd(end)
      } else if (centers.length === 1) {
        const c = centers[0]
        setComputedEnd([c.x, c.y, c.z])
      } else if (centers.length > 1) {
        // average centers
        const avg = centers.reduce((acc, v) => acc.add(v), new Vector3())
        avg.divideScalar(centers.length)
        setComputedEnd([avg.x, avg.y, avg.z])
      }
    } else if (end) {
      setComputedEnd(end)
    }
  }, [scene, startName, endName, start, end])

  // Keep updating in case model moves
  useFrame(() => {
    if (startName) {
      const sObj = findObjectByNameFlexible(startName) as Object3D | undefined
      const c = centerOf(sObj ?? null)
      setComputedStart([c.x, c.y, c.z])
    }
    if (endName) {
      const names = Array.isArray(endName) ? endName : [endName]
      const centers = names.map((n) => findObjectByNameFlexible(n)).filter(Boolean).map((o) => centerOf(o as Object3D))
      if (centers.length === 1) {
        const c = centers[0]
        setComputedEnd([c.x, c.y, c.z])
      } else if (centers.length > 1) {
        const avg = centers.reduce((acc, v) => acc.add(v), new Vector3())
        avg.divideScalar(centers.length)
        setComputedEnd([avg.x, avg.y, avg.z])
      }
    }
  })

  if (!adjustedCurve) return null

  return (
    <QuadraticBezierLine
      start={adjustedCurve.start}
      end={adjustedCurve.end}
      mid={adjustedCurve.mid}
      color={color}
      lineWidth={isActive ? 4.4 : 2.8}
      transparent={opacity < 1}
      opacity={opacity}
      depthTest={false}
      renderOrder={20}
      onClick={onClick}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
    />
  )
}
