import { Component, Suspense, forwardRef, useEffect, useMemo, type ReactNode } from 'react'
import { useLoader } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { Color, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, type Material, type Object3D, type Plane, Box3, Sphere, Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

type MeshClickInfo = {
  name: string
  center: [number, number, number]
  radius: number
}

type ModelLoaderProps = ThreeElements['group'] & {
  url?: string
  fallback: ReactNode
  highlightedNodeNames?: string[] | null
  highlightColor?: string
  clippingPlanes?: Plane[]
  xrayMode?: boolean
  onMeshClick?: (info: MeshClickInfo) => void
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
  if (!(material instanceof MeshStandardMaterial || material instanceof MeshPhysicalMaterial)) {
    return
  }

  const originalColorHex = material.userData.__originalEmissiveHex as number | undefined
  const originalIntensity = material.userData.__originalEmissiveIntensity as number | undefined

  if (originalColorHex === undefined) {
    if ((material as any).emissive?.getHex) {
      material.userData.__originalEmissiveHex = (material as any).emissive.getHex()
    } else {
      material.userData.__originalEmissiveHex = 0x000000
    }
    material.userData.__originalEmissiveIntensity = (material as any).emissiveIntensity ?? 0
  }

  if (isHighlighted) {
    ;(material as any).emissive = new Color(highlightColor)
    ;(material as any).emissiveIntensity = 0.72
    return
  }

  ;(material as any).emissive = new Color(originalColorHex ?? 0x000000)
  ;(material as any).emissiveIntensity = originalIntensity ?? 0
}

function applyNodeHighlight(
  root: Object3D,
  highlightedNodeNames: string[] | null | undefined,
  highlightColor: string,
) {
  const set = new Set((highlightedNodeNames || []).filter(Boolean))

  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) {
      return
    }

    const isHighlighted = set.size > 0 ? set.has(obj.name) : false

    if (Array.isArray(obj.material)) {
      obj.material.forEach((mat) => setMaterialHighlight(mat, isHighlighted, highlightColor))
      return
    }

    setMaterialHighlight(obj.material, isHighlighted, highlightColor)
  })
}

// Mapping from connection IDs to cortex node names inside the combined model.
export const CONNECTION_NODE_MAP: Record<string, string[]> = {
  'ef-corteza-prefrontal': ['isthmuscingulate', 'rostralanteriorcingulate'],
  'ef-corteza-motora': ['precentral'],
  'ef-corteza-somatosensorial': ['postcentral'],
  'ef-corteza-visual': ['pericalcarine', 'lateraloccipital'],
  // Additional mappings for clinical table
  'ef-dorsomedial': ['superiorfrontal', 'rostralmiddlefrontal', 'medialorbitofrontal'],
  'ef-dorsallateral-pulvinar': ['superiorparietal', 'inferiorparietal'],
  'ef-geniculado-medial': ['superiortemporal'],
  // Suggested mappings from requirements table
  'eferencia_anterior': ['isthmuscingulate', 'rostralanteriorcingulate'],
  'eferencia_dorsomedial': ['superiorfrontal', 'rostralmiddlefrontal'],
  'eferencia_visual': ['pericalcarine', 'lateraloccipital'],
}

const ModelRoot = forwardRef<any, ModelRootProps>(function ModelRoot({
  url,
  highlightedNodeNames,
  highlightColor = '#ff5a5f',
  clippingPlanes,
  xrayMode = false,
  onClick,
  ...groupProps
}: ModelRootProps, ref) {
  // Attach a pointer handler that reports the mesh name when clicked.
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const obj = (e as any).object as Object3D | undefined
    if (!obj) return

    try {
      obj.updateMatrixWorld(true)
      const box = new Box3().setFromObject(obj)
      const centerV = box.getCenter(new Vector3())
      const sphere = box.getBoundingSphere(new Sphere())
      const meshName = obj.name || (obj.parent && obj.parent.name) || ''

      ;(groupProps as any).onMeshClick?.({
        name: meshName,
        center: [centerV.x, centerV.y, centerV.z],
        radius: sphere.radius || 0.001,
      })
    } catch (err) {
      const meshName = (e as any).object?.name || ''
      ;(groupProps as any).onMeshClick?.({ name: meshName, center: [0, 0, 0], radius: 0.001 })
    }
  }

  // Configure DRACO decoder and load via GLTFLoader so Draco-compressed files load correctly.
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    const draco = new DRACOLoader()
    draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
    loader.setDRACOLoader(draco)
  })

  const scene = gltf.scene
  const clonedScene = useMemo(() => clone(scene), [scene])

  useEffect(() => {
    // First apply hierarchical material injection: try to detect 'corteza' (cortex) and 'tálamo' (thalamus)
    clonedScene.traverse((obj) => {
      if (!(obj instanceof Mesh)) return

      // Ensure each mesh has its own material instance to avoid shared-material side-effects
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map((m) => (m && typeof (m as any).clone === 'function' ? (m as any).clone() : m)) as any
      } else if (obj.material && typeof (obj.material as any).clone === 'function') {
        obj.material = (obj.material as any).clone()
      }

      const rawName = obj.name || ''
      const lname = rawName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const isCortex = lname.includes('corteza') || lname.includes('cortex') || lname.includes('cortical')
      const isThalamus = lname.includes('talamo') || lname.includes('thalamus') || lname.includes('talamus')

      if (isCortex) {
        // Preserve original material reference for potential restoration/highlight
        if (!obj.userData.__originalMaterial) obj.userData.__originalMaterial = obj.material

        const baseMat = Array.isArray(obj.material) ? obj.material[0] : obj.material
        const baseColor = baseMat && (baseMat as any).color ? (baseMat as any).color.getHex() : 0xffffff

        const phys = new MeshPhysicalMaterial({
          color: baseColor,
          transmission: 0.6,
          transparent: true,
          opacity: 0.72,
          roughness: 0.25,
          metalness: 0,
          clearcoat: 0.05,
        })

        obj.material = phys
        return
      }

      if (isThalamus) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((mat) => {
          if (mat instanceof MeshPhysicalMaterial || mat instanceof MeshStandardMaterial) {
            mat.transparent = false
            mat.opacity = 1
            mat.wireframe = false
          }
        })
      }
    })

    // debug: report scene node count
    try {
      // eslint-disable-next-line no-console
      console.info('[ModelLoader] clonedScene children:', clonedScene.children.length)
    } catch (e) {
      // ignore
    }

    applyNodeHighlight(clonedScene, highlightedNodeNames, highlightColor)

    // Apply clipping plane and xray settings to all materials
    clonedScene.traverse((obj) => {
      if (!(obj instanceof Mesh)) {
        return
      }

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
      materials.forEach((mat) => {
        if (!(mat instanceof MeshStandardMaterial || mat instanceof MeshPhysicalMaterial)) return

        if (clippingPlanes && clippingPlanes.length > 0) {
          mat.clippingPlanes = clippingPlanes
        }
        if (xrayMode) {
          mat.transparent = true
          mat.opacity = Math.min(mat.opacity || 1, 0.45)
          mat.wireframe = true
        }
      })
    })
  }, [clonedScene, highlightedNodeNames, highlightColor, clippingPlanes, xrayMode])

  return (
    <group ref={ref} {...groupProps} onClick={onClick} onPointerDown={handlePointerDown}>
      <primitive object={clonedScene} />
    </group>
  )
})

const ModelLoader = forwardRef<any, ModelLoaderProps>(function ModelLoader({ url, fallback, ...props }, ref) {
  if (!url || url.trim().length === 0) {
    return <>{fallback}</>
  }

  return (
    <ModelLoadBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <ModelRoot ref={ref} url={url} {...props} />
      </Suspense>
    </ModelLoadBoundary>
  )
})

export default ModelLoader
