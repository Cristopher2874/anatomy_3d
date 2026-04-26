import { QuadraticBezierLine } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'

type ConnectionLineProps = {
  start: [number, number, number]
  end: [number, number, number]
  color: string
  isActive?: boolean
  opacity?: number
  onClick?: (event: ThreeEvent<MouseEvent>) => void
}

function buildMidPoint(
  start: [number, number, number],
  end: [number, number, number],
): [number, number, number] {
  const x = (start[0] + end[0]) / 2
  const y = (start[1] + end[1]) / 2 + 0.45
  const z = (start[2] + end[2]) / 2
  return [x, y, z]
}

export default function ConnectionLine({
  start,
  end,
  color,
  isActive = false,
  opacity = 1,
  onClick,
}: ConnectionLineProps) {
  return (
    <QuadraticBezierLine
      start={start}
      end={end}
      mid={buildMidPoint(start, end)}
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