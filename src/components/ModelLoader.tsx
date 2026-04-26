import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { Color, Mesh, MeshStandardMaterial, type Material, type Object3D } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

type ModelLoaderProps = ThreeElements['group'] & {
  url?: string
  fallback: ReactNode
  highlightedNodeName?: string | null
  highlightColor?: string
  onClick?: (event: ThreeEvent<MouseEvent>) => void
}

type ModelRootProps = Omit<ModelLoaderProps, 'fallback'> & {
  url: string
}

class ModelLoadBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  override state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

function setMaterialHighlight(material: Material, isHighlighted: boolean, highlightColor: string) {
  if (!(material instanceof MeshStandardMaterial)) {
    return
  }

  const originalColorHex = material.userData.__originalEmissiveHex as number | undefined
  const originalIntensity = material.userData.__originalEmissiveIntensity as number | undefined

  if (originalColorHex === undefined) {
    material.userData.__originalEmissiveHex = material.emissive.getHex()
    material.userData.__originalEmissiveIntensity = material.emissiveIntensity
  }

  if (isHighlighted) {
    material.emissive = new Color(highlightColor)
    material.emissiveIntensity = 0.72
    return
  }

  material.emissive = new Color(originalColorHex ?? 0x000000)
  material.emissiveIntensity = originalIntensity ?? 0
}

function applyNodeHighlight(
  root: Object3D,
  highlightedNodeName: string | null | undefined,
  highlightColor: string,
) {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) {
      return
    }

    const isHighlighted = highlightedNodeName ? obj.name === highlightedNodeName : false

    if (Array.isArray(obj.material)) {
      obj.material.forEach((mat) => setMaterialHighlight(mat, isHighlighted, highlightColor))
      return
    }

    setMaterialHighlight(obj.material, isHighlighted, highlightColor)
  })
}

function ModelRoot({
  url,
  highlightedNodeName,
  highlightColor = '#ff5a5f',
  onClick,
  ...groupProps
}: ModelRootProps) {
  const { scene } = useGLTF(url)
  const clonedScene = useMemo(() => clone(scene), [scene])

  useEffect(() => {
    applyNodeHighlight(clonedScene, highlightedNodeName, highlightColor)
  }, [clonedScene, highlightedNodeName, highlightColor])

  return (
    <group {...groupProps} onClick={onClick}>
      <primitive object={clonedScene} />
    </group>
  )
}

export default function ModelLoader({ url, fallback, ...props }: ModelLoaderProps) {
  if (!url || url.trim().length === 0) {
    return <>{fallback}</>
  }

  return (
    <ModelLoadBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <ModelRoot url={url} {...props} />
      </Suspense>
    </ModelLoadBoundary>
  )
}