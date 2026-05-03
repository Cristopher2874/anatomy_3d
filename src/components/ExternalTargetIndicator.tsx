import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import { Box3, Object3D, Vector3 } from 'three'

type ExternalTargetIndicatorProps = {
  nodeNames?: string[]
  fallbackPosition: [number, number, number]
  modelCenter?: [number, number, number]
  label: string
  details: string[]
}

const toCanonical = (value: string) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const buildNameVariants = (value: string) => {
  const raw = value || ''
  const withoutExt = raw.replace(/\.(obj|stl|mtl)$/i, '')
  const tokens = withoutExt.split(/[.\-_ ]+/).map((part) => part.toLowerCase()).filter(Boolean)
  const region = tokens.length > 0 ? tokens[tokens.length - 1] : withoutExt.toLowerCase()
  return [raw, withoutExt, region]
}

export default function ExternalTargetIndicator({
  nodeNames,
  fallbackPosition,
  modelCenter,
  label,
  details,
}: ExternalTargetIndicatorProps) {
  const { scene } = useThree()
  const [position, setPosition] = useState<[number, number, number]>(fallbackPosition)
  const [hovered, setHovered] = useState(false)

  const targetSet = useMemo(() => {
    const set = new Set<string>()
    ;(nodeNames || []).forEach((name) => {
      buildNameVariants(name).forEach((variant) => set.add(toCanonical(variant)))
      set.add(toCanonical(name))
      set.add(toCanonical((name || '').replace(/\.(obj|stl|mtl)$/i, '')))
    })
    return set
  }, [nodeNames])

  useFrame(() => {
    if (!nodeNames || nodeNames.length === 0 || targetSet.size === 0) {
      setPosition(fallbackPosition)
      return
    }

    const matched: Object3D[] = []
    scene.traverse((obj) => {
      if (!obj.name) return
      const matches = buildNameVariants(obj.name).some((variant) => targetSet.has(toCanonical(variant)))
      if (matches) {
        matched.push(obj)
      }
    })

    if (matched.length === 0) {
      setPosition(fallbackPosition)
      return
    }

    const centers = matched.map((obj) => {
      try {
        const c = new Box3().setFromObject(obj).getCenter(new Vector3())
        if (Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z)) {
          return c
        }
      } catch {
        // fallback
      }
      const wp = new Vector3()
      obj.getWorldPosition(wp)
      return wp
    })

    const avg = centers.reduce((acc, value) => acc.add(value), new Vector3()).divideScalar(centers.length)
    if (modelCenter) {
      const center = new Vector3(modelCenter[0], modelCenter[1], modelCenter[2])
      const outward = avg.clone().sub(center)
      if (outward.lengthSq() > 0.000001) {
        avg.add(outward.normalize().multiplyScalar(0.34))
      }
    }
    setPosition([avg.x, avg.y, avg.z])
  })

  return (
    <group position={position}>
      <mesh
        onPointerOver={() => {
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[0.11, 18, 18]} />
        <meshStandardMaterial color="#ef4444" emissive="#7f1d1d" emissiveIntensity={1.15} />
      </mesh>

      {hovered && (
        <Html center distanceFactor={6} transform occlude>
          <div
            style={{
              width: 240,
              background: 'rgba(255,255,255,0.96)',
              border: '1px solid rgba(239,68,68,0.45)',
              borderRadius: 10,
              padding: 10,
              boxShadow: '0 8px 20px rgba(15,23,42,0.2)',
              color: '#1f2937',
              pointerEvents: 'none',
            }}
          >
            <strong style={{ color: '#b91c1c', display: 'block', marginBottom: 6 }}>{label}</strong>
            {details.map((item) => (
              <div key={item} style={{ fontSize: 12, lineHeight: 1.35 }}>
                • {item}
              </div>
            ))}
          </div>
        </Html>
      )}
    </group>
  )
}

