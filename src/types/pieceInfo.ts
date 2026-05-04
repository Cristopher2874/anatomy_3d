export type PieceTier = 'eferencia' | 'aferencia' | 'no_mapeada'

export type SelectedPieceInfo = {
  name: string
  infoText: string
  tier: PieceTier
  learningPoints?: string[]
}
