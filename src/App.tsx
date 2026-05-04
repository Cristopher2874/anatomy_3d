import { useState } from 'react'
import AboutProjectModal from './components/AboutProjectModal'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Scene from './Scene'
import type { ConnectionVisibilityMode, ConnectionWithType, ViewSettings } from './types/connections'
import type { SelectedPieceInfo } from './types/pieceInfo'
import './App.css'

function canShowConnectionType(mode: ConnectionVisibilityMode, tipo: ConnectionWithType['tipo']): boolean {
  if (mode === 'none') return false
  if (mode === 'both') return true
  return mode === tipo
}

function App() {
  const [selectedConnection, setSelectedConnection] = useState<ConnectionWithType | null>(null)
  const [selectedPieceInfo, setSelectedPieceInfo] = useState<SelectedPieceInfo | null>(null)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    layers: {
      showNerves: true,
      showTargetOrgans: true,
    },
    connectionVisibilityMode: 'both',
    clippingOffset: 0,
    clippingOffsetX: 0,
    xrayMode: false,
  })
  const [modelHalfHeight, setModelHalfHeight] = useState<number>(2.5)
  const [modelHalfWidth, setModelHalfWidth] = useState<number>(2.5)
  const [boundsInitialized, setBoundsInitialized] = useState(false)

  return (
    <div className="app-layout">
      <Header
        onOpenAbout={() => {
          setIsAboutOpen(true)
        }}
      />

      <main className="app-main">
        <section className="sidebar-panel">
          <Sidebar
            selectedConnection={selectedConnection}
            selectedPieceInfo={selectedPieceInfo}
            viewSettings={viewSettings}
            clippingRange={{ min: -modelHalfHeight, max: modelHalfHeight }}
            clippingRangeX={{ min: -modelHalfWidth, max: modelHalfWidth }}
            onToggleLayer={(layerKey) => {
              setViewSettings((current) => ({
                ...current,
                layers: {
                  ...current.layers,
                  [layerKey]: !current.layers[layerKey],
                },
              }))
            }}
            onChangeClipping={(nextOffset) => {
              setViewSettings((current) => ({
                ...current,
                clippingOffset: nextOffset,
              }))
            }}
            onChangeClippingX={(nextOffset) => {
              setViewSettings((current) => ({
                ...current,
                clippingOffsetX: nextOffset,
              }))
            }}
            onChangeConnectionVisibilityMode={(nextMode) => {
              setViewSettings((current) => ({
                ...current,
                connectionVisibilityMode: nextMode,
              }))
              setSelectedConnection((currentConnection) => {
                if (!currentConnection) return null
                return canShowConnectionType(nextMode, currentConnection.tipo) ? currentConnection : null
              })
              setSelectedPieceInfo((currentPieceInfo) => (currentPieceInfo?.tier === 'no_mapeada' ? currentPieceInfo : null))
            }}
            onToggleXray={() => {
              setViewSettings((current) => ({
                ...current,
                xrayMode: !current.xrayMode,
              }))
            }}
            onClearSelection={() => {
              setSelectedConnection(null)
              setSelectedPieceInfo(null)
            }}
          />
        </section>

        <section className="canvas-panel">
          <Scene
            selectedConnection={selectedConnection}
            onSelectConnection={setSelectedConnection}
            onSelectedPieceInfoChange={setSelectedPieceInfo}
            viewSettings={viewSettings}
            onModelBoundsComputed={(bounds: { halfHeight: number; halfWidth: number }) => {
              setModelHalfHeight(bounds.halfHeight)
              setModelHalfWidth(bounds.halfWidth)
              // Initialize clipping offsets to show more than half of the model on first mount
              if (!boundsInitialized) {
                setBoundsInitialized(true)
                setViewSettings((current) => ({
                  ...current,
                  clippingOffset: Math.max(-bounds.halfHeight * 0.25, -bounds.halfHeight),
                  clippingOffsetX: Math.max(-bounds.halfWidth * 0.25, -bounds.halfWidth),
                }))
              }
            }}
          />
        </section>
      </main>

      <AboutProjectModal
        isOpen={isAboutOpen}
        onClose={() => {
          setIsAboutOpen(false)
        }}
      />
    </div>
  )
}

export default App
