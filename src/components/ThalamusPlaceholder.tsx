import { Text } from '@react-three/drei'
import type { Plane } from 'three'

type ThalamusPlaceholderProps = {
  position?: [number, number, number]
  clippingPlane?: Plane
  xrayMode?: boolean
  showLabel?: boolean
}

export default function ThalamusPlaceholder({
  position = [0, 0, 0],
  clippingPlane,
  xrayMode = false,
  showLabel = false,
}: ThalamusPlaceholderProps) {
  return (
    <group>
      <mesh position={position}>
        <sphereGeometry args={[0.45, 48, 48]} />
        <meshPhysicalMaterial
          color="#8ecae6"
          roughness={0.15}
          metalness={0.1}
          transmission={xrayMode ? 0.92 : 0.55}
          thickness={xrayMode ? 0.65 : 0.9}
          transparent={xrayMode}
          opacity={xrayMode ? 0.42 : 1}
          wireframe={xrayMode}
          clippingPlanes={clippingPlane ? [clippingPlane] : []}
        />
      </mesh>
      {showLabel && (
        <Text
          position={[position[0], position[1] + 0.55, position[2]]}
          fontSize={0.14}
          color="#1e293b"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#ffffff"
        >
          Talamo
        </Text>
      )}
    </group>
  )
}