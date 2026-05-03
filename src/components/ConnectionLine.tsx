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
  color,
  isActive = false,
  opacity = 1,
  onClick,
}: ConnectionLineProps) {
  const { scene } = useThree()
  const [computedStart, setComputedStart] = useState<[number, number, number] | null>(null)
  const [computedEnd, setComputedEnd] = useState<[number, number, number] | null>(null)

  const mid = useMemo(() => {
    if (computedStart && computedEnd) {
      const x = (computedStart[0] + computedEnd[0]) / 2
      const y = (computedStart[1] + computedEnd[1]) / 2 + 0.45
      const z = (computedStart[2] + computedEnd[2]) / 2
      return [x, y, z] as [number, number, number]
    }
    return [0, 0.45, 0] as [number, number, number]
  }, [computedStart, computedEnd])

  function centerOf(obj: Object3D | null) {
    if (!obj) return new Vector3()
    const box = new Box3().setFromObject(obj)
    const c = new Vector3()
    box.getCenter(c)
    return c
  }

  useEffect(() => {
    if (startName) {
      const sObj = scene.getObjectByName(startName) as Object3D | undefined
      const c = centerOf(sObj ?? null)
      setComputedStart([c.x, c.y, c.z])
    } else if (start) {
      setComputedStart(start)
    }

    if (endName) {
      const names = Array.isArray(endName) ? endName : [endName]
      const centers = names
        .map((n) => scene.getObjectByName(n))
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
      const sObj = scene.getObjectByName(startName) as Object3D | undefined
      const c = centerOf(sObj ?? null)
      setComputedStart([c.x, c.y, c.z])
    }
    if (endName) {
      const names = Array.isArray(endName) ? endName : [endName]
      const centers = names.map((n) => scene.getObjectByName(n)).filter(Boolean).map((o) => centerOf(o as Object3D))
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

  if (!computedStart || !computedEnd) return null

  return (
    <QuadraticBezierLine
      start={computedStart}
      end={computedEnd}
      mid={mid}
      color={color}
      lineWidth={isActive ? 3.4 : 2.2}
      transparent={opacity < 1}
      opacity={opacity}
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