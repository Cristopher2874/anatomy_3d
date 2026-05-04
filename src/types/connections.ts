export type Vec3 = [number, number, number]

export type Connection = {
  id: string
  nombre: string
  posicionLocal: Vec3
  posicionDestino: Vec3
  colorLinea: string
  infoText: string
  mappedNodes?: string[]
  externalTargets?: string[]
  missingAssets?: string[]
  pin?: boolean
  pinImage?: string
}

export type ConnectionWithType = Connection & {
  tipo: 'eferencia' | 'aferencia'
}

export type ConnectionsSchema = {
  nodoCentral: {
    id: string
    nombre: string
    posicion: Vec3
    descripcion: string
  }
  eferencias: Connection[]
  aferencias: Connection[]
}

export type VisibilityLayers = {
  showNerves: boolean
  showTargetOrgans: boolean
}

export type ConnectionVisibilityMode = 'both' | 'aferencia' | 'eferencia' | 'none'

export type ViewSettings = {
  layers: VisibilityLayers
  connectionVisibilityMode: ConnectionVisibilityMode
  clippingOffset: number
  clippingOffsetX?: number
  xrayMode: boolean
}
