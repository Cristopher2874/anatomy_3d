import { useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'

type TargetOrganPlaceholderProps = {
  position: [number, number, number]
  color?: string
  isActive?: boolean
  opacity?: number
  onClick?: (event: ThreeEvent<MouseEvent>) => void
}

export default function TargetOrganPlaceholder({
  position,
  color = '#ffb703',
  isActive = false,
  opacity = 1,
  onClick,
}: TargetOrganPlaceholderProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <mesh
      position={position}
      scale={isActive ? 1.18 : isHovered ? 1.05 : 1}
      onClick={onClick}
      onPointerOver={() => {
        setIsHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setIsHovered(false)
        document.body.style.cursor = 'default'
      }}
    >
      <boxGeometry args={[0.35, 0.35, 0.35]} />
      <meshStandardMaterial
        color={color}
        roughness={0.45}
        metalness={0.05}
        transparent={opacity < 1}
        opacity={opacity}
        emissive={isActive || isHovered ? color : '#000000'}
        emissiveIntensity={isActive ? 0.26 : isHovered ? 0.12 : 0}
      />
    </mesh>
  )
}