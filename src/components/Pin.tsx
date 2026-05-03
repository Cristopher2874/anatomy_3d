import { useState } from 'react'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'

type PinProps = {
  position: [number, number, number]
  label: string
  image?: string
  onClick?: (e: ThreeEvent<MouseEvent>) => void
}

export default function Pin({ position, label, image, onClick }: PinProps) {
  const [open, setOpen] = useState(false)

  return (
    <group position={position}>
      <mesh onClick={(e) => { e.stopPropagation(); setOpen((s) => !s); onClick?.(e) }}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial color="#ffcd00" emissive="#92400e" emissiveIntensity={0.65} />
      </mesh>

      <Html center distanceFactor={6} transform occlude>
        <div style={{ pointerEvents: 'auto' }}>
          {open && (
            <div style={{ background: 'white', padding: 8, borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}>
              <strong style={{ display: 'block', marginBottom: 6 }}>{label}</strong>
              {image ? <img src={image} alt={label} style={{ maxWidth: 220, display: 'block' }} /> : <div style={{ color: '#666' }}>No image</div>}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}
