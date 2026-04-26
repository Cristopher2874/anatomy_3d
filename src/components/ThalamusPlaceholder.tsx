type ThalamusPlaceholderProps = {
  position?: [number, number, number]
}

export default function ThalamusPlaceholder({
  position = [0, 0, 0],
}: ThalamusPlaceholderProps) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.45, 48, 48]} />
      <meshStandardMaterial color="#8ecae6" roughness={0.35} metalness={0.1} />
    </mesh>
  )
}