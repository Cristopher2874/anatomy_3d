import { useState } from 'react'
import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { Plane } from 'three'

type TargetOrganPlaceholderProps = {
  position: [number, number, number]
  color?: string
  isActive?: boolean
  opacity?: number
  clippingPlane?: Plane
  xrayMode?: boolean
  showLabel?: boolean
  label?: string
  onClick?: (event: ThreeEvent<MouseEvent>) => void
}

export default function TargetOrganPlaceholder({
  position,
  color = '#ffb703',
  isActive = false,
  opacity = 1,
  clippingPlane,
  xrayMode = false,
  showLabel = false,
  label = '',
  onClick,
}: TargetOrganPlaceholderProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <group>
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
        <meshPhysicalMaterial
          color={color}
          roughness={0.15}
          metalness={0.1}
          transmission={xrayMode ? 0.95 : 0.6}
          thickness={xrayMode ? 0.5 : 0.8}
          transparent={opacity < 1 || xrayMode}
          opacity={xrayMode ? Math.min(opacity, 0.45) : opacity}
          wireframe={xrayMode}
          emissive={isActive || isHovered ? color : '#000000'}
          emissiveIntensity={isActive ? 0.26 : isHovered ? 0.12 : 0}
          clippingPlanes={clippingPlane ? [clippingPlane] : []}
        />
      </mesh>
      {showLabel && label && (
        <Text
          position={[position[0], position[1] + 0.35, position[2]]}
          fontSize={0.12}
          color="#1e293b"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#ffffff"
        >
          {label}
        </Text>
      )}
    </group>
  )
}