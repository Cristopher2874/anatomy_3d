import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Box3, Object3D, Vector3 } from 'three'

type NodePinProps = {
  nodeNames: string[]
  modelCenter?: [number, number, number]
  outwardOffset?: number
  isActive?: boolean
  onClick?: (event: ThreeEvent<MouseEvent>) => void
}

const toCanonical = (value: string) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const buildNameVariants = (value: string) => {
  const raw = value || ''
  const withoutExt = raw.replace(/\.(obj|stl|mtl)$/i, '')
  const tokens = withoutExt.split(/[.\-_ ]+/).map((part) => part.toLowerCase()).filter(Boolean)
  const region = tokens.length > 0 ? tokens[tokens.length - 1] : withoutExt.toLowerCase()
  return [raw, withoutExt, region]
}

export default function NodePin({
  nodeNames,
  modelCenter,
  outwardOffset = 0.22,
  isActive = false,
  onClick,
}: NodePinProps) {
  const { scene } = useThree()
  const [position, setPosition] = useState<[number, number, number] | null>(null)

  const strictSet = useMemo(() => {
    const set = new Set<string>()
    nodeNames.forEach((name) => {
      const withoutExt = (name || '').replace(/\.(obj|stl|mtl)$/i, '')
      set.add(toCanonical(name))
      set.add(toCanonical(withoutExt))
    })
    return set
  }, [nodeNames])

  const fuzzySet = useMemo(() => {
    const set = new Set<string>()
    nodeNames.forEach((name) => {
      buildNameVariants(name).forEach((variant) => set.add(toCanonical(variant)))
    })
    return set
  }, [nodeNames])

  useFrame(() => {
    const strictMatches: Object3D[] = []
    const found: Object3D[] = []
    scene.traverse((obj) => {
      if (!obj.name) return
      const raw = toCanonical(obj.name)
      const noExt = toCanonical(obj.name.replace(/\.(obj|stl|mtl)$/i, ''))
      if (strictSet.has(raw) || strictSet.has(noExt)) {
        strictMatches.push(obj)
      } else {
        const matches = buildNameVariants(obj.name).some((variant) => fuzzySet.has(toCanonical(variant)))
        if (matches) {
          found.push(obj)
        }
      }
    })

    const picked = strictMatches.length > 0 ? strictMatches : found

    if (picked.length === 0) {
      setPosition(null)
      return
    }

    const centers = picked.map((obj) => {
      try {
        const box = new Box3().setFromObject(obj)
        const c = box.getCenter(new Vector3())
        if (Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z)) {
          return c
        }
      } catch {
        // fallback below
      }
      const worldPos = new Vector3()
      obj.getWorldPosition(worldPos)
      return worldPos
    })

    const avg = centers.reduce((acc, value) => acc.add(value), new Vector3()).divideScalar(centers.length)
    if (modelCenter) {
      const center = new Vector3(modelCenter[0], modelCenter[1], modelCenter[2])
      const outward = avg.clone().sub(center)
      if (outward.lengthSq() > 0.000001) {
        avg.add(outward.normalize().multiplyScalar(outwardOffset))
      }
    }

    setPosition([avg.x, avg.y, avg.z])
  })

  if (!position) return null

  return (
    <mesh
      position={position}
      onClick={onClick}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'default' }}
    >
      <sphereGeometry args={[isActive ? 0.12 : 0.09, 16, 16]} />
      <meshStandardMaterial
        color={isActive ? '#ef4444' : '#f87171'}
        emissive={isActive ? '#7f1d1d' : '#991b1b'}
        emissiveIntensity={isActive ? 1.05 : 0.85}
      />
    </mesh>
  )
}
