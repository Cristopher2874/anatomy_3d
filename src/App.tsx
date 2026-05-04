import { useState } from 'react'
import AboutProjectModal from './components/AboutProjectModal'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Scene from './Scene'
import ThalamusScene from './ThalamusScene'
import type { ConnectionVisibilityMode, ConnectionWithType, ViewSettings } from './types/connections'
import type { SelectedPieceInfo } from './types/pieceInfo'
import './App.css'

function canShowConnectionType(mode: ConnectionVisibilityMode, tipo: ConnectionWithType['tipo']): boolean {
  if (mode === 'none') return false
  if (mode === 'both') return true
  return mode === tipo
}

function App() {
  const [activeScene, setActiveScene] = useState<'brain' | 'thalamus'>('brain')
  const [selectedConnection, setSelectedConnection] = useState<ConnectionWithType | null>(null)
  const [selectedPieceInfo, setSelectedPieceInfo] = useState<SelectedPieceInfo | null>(null)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    layers: {
      showNerves: true,
      showTargetOrgans: true,
    },
    connectionVisibilityMode: 'both',
    explodeAmount: 0,
    clippingYMin: -999,
    clippingYMax: 999,
    clippingXMin: -999,
    clippingXMax: 999,
    xrayMode: false,
  })
  const [modelHalfHeight, setModelHalfHeight] = useState<number>(2.5)
  const [modelHalfWidth, setModelHalfWidth] = useState<number>(2.5)
  const [boundsInitialized, setBoundsInitialized] = useState(false)
  const BOUNDS_SYNC_EPSILON = 0.08

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
            activeScene={activeScene}
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
            onChangeClippingYMin={(nextValue) => {
              setViewSettings((current) => ({
                ...current,
                clippingYMin: Math.min(nextValue, current.clippingYMax),
              }))
            }}
            onChangeClippingYMax={(nextValue) => {
              setViewSettings((current) => ({
                ...current,
                clippingYMax: Math.max(nextValue, current.clippingYMin),
              }))
            }}
            onChangeClippingXMin={(nextValue) => {
              setViewSettings((current) => ({
                ...current,
                clippingXMin: Math.min(nextValue, current.clippingXMax),
              }))
            }}
            onChangeClippingXMax={(nextValue) => {
              setViewSettings((current) => ({
                ...current,
                clippingXMax: Math.max(nextValue, current.clippingXMin),
              }))
            }}
            onChangeExplodeAmount={(nextAmount) => {
              setViewSettings((current) => ({
                ...current,
                explodeAmount: Math.max(0, Math.min(1, nextAmount)),
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
          <div className="scene-tabs">
            <button
              className={`scene-tab ${activeScene === 'brain' ? 'active' : ''}`}
              onClick={() => setActiveScene('brain')}
            >
              Brain
            </button>
            <button
              className={`scene-tab ${activeScene === 'thalamus' ? 'active' : ''}`}
              onClick={() => setActiveScene('thalamus')}
            >
              Thalamus
            </button>
          </div>

          {activeScene === 'brain' && (
            <div className="canvas-content">
              <Scene
                selectedConnection={selectedConnection}
                onSelectConnection={setSelectedConnection}
                onSelectedPieceInfoChange={setSelectedPieceInfo}
                viewSettings={viewSettings}
                clippingEnabled={boundsInitialized}
                onModelBoundsComputed={(bounds: { halfHeight: number; halfWidth: number }) => {
                  setModelHalfHeight((current) => (
                    Math.abs(current - bounds.halfHeight) < 0.0001 ? current : bounds.halfHeight
                  ))
                  setModelHalfWidth((current) => (
                    Math.abs(current - bounds.halfWidth) < 0.0001 ? current : bounds.halfWidth
                  ))

                  // Initialize clipping to full model bounds on first mount.
                  if (!boundsInitialized) {
                    setBoundsInitialized(true)
                    setViewSettings((current) => ({
                      ...current,
                      clippingYMin: -bounds.halfHeight,
                      clippingYMax: bounds.halfHeight,
                      clippingXMin: -bounds.halfWidth,
                      clippingXMax: bounds.halfWidth,
                    }))
                    return
                  }

                  // Keep clipping/explode consistent:
                  // if user is currently at (or very near) full range, follow updated explode bounds.
                  // otherwise only clamp to prevent invalid out-of-range values.
                  setViewSettings((current) => {
                    const yWasFull = Math.abs(current.clippingYMin + modelHalfHeight) < BOUNDS_SYNC_EPSILON
                      && Math.abs(current.clippingYMax - modelHalfHeight) < BOUNDS_SYNC_EPSILON
                    const xWasFull = Math.abs(current.clippingXMin + modelHalfWidth) < BOUNDS_SYNC_EPSILON
                      && Math.abs(current.clippingXMax - modelHalfWidth) < BOUNDS_SYNC_EPSILON

                    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

                    let nextYMin = yWasFull ? -bounds.halfHeight : clamp(current.clippingYMin, -bounds.halfHeight, bounds.halfHeight)
                    let nextYMax = yWasFull ? bounds.halfHeight : clamp(current.clippingYMax, -bounds.halfHeight, bounds.halfHeight)
                    if (nextYMin > nextYMax) {
                      nextYMin = nextYMax
                    }

                    let nextXMin = xWasFull ? -bounds.halfWidth : clamp(current.clippingXMin, -bounds.halfWidth, bounds.halfWidth)
                    let nextXMax = xWasFull ? bounds.halfWidth : clamp(current.clippingXMax, -bounds.halfWidth, bounds.halfWidth)
                    if (nextXMin > nextXMax) {
                      nextXMin = nextXMax
                    }

                    if (
                      nextYMin === current.clippingYMin
                      && nextYMax === current.clippingYMax
                      && nextXMin === current.clippingXMin
                      && nextXMax === current.clippingXMax
                    ) {
                      return current
                    }

                    return {
                      ...current,
                      clippingYMin: nextYMin,
                      clippingYMax: nextYMax,
                      clippingXMin: nextXMin,
                      clippingXMax: nextXMax,
                    }
                  })
                }}
              />
            </div>
          )}

          {activeScene === 'thalamus' && (
            <div className="canvas-content">
              <ThalamusScene
                viewSettings={viewSettings}
                clippingEnabled={boundsInitialized}
                onModelBoundsComputed={(bounds: { halfHeight: number; halfWidth: number }) => {
                  setModelHalfHeight((current) => (
                    Math.abs(current - bounds.halfHeight) < 0.0001 ? current : bounds.halfHeight
                  ))
                  setModelHalfWidth((current) => (
                    Math.abs(current - bounds.halfWidth) < 0.0001 ? current : bounds.halfWidth
                  ))

                  if (!boundsInitialized) {
                    setBoundsInitialized(true)
                    setViewSettings((current) => ({
                      ...current,
                      clippingYMin: -bounds.halfHeight,
                      clippingYMax: bounds.halfHeight,
                      clippingXMin: -bounds.halfWidth,
                      clippingXMax: bounds.halfWidth,
                    }))
                    return
                  }

                  setViewSettings((current) => {
                    const yWasFull = Math.abs(current.clippingYMin + modelHalfHeight) < BOUNDS_SYNC_EPSILON
                      && Math.abs(current.clippingYMax - modelHalfHeight) < BOUNDS_SYNC_EPSILON
                    const xWasFull = Math.abs(current.clippingXMin + modelHalfWidth) < BOUNDS_SYNC_EPSILON
                      && Math.abs(current.clippingXMax - modelHalfWidth) < BOUNDS_SYNC_EPSILON

                    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

                    let nextYMin = yWasFull ? -bounds.halfHeight : clamp(current.clippingYMin, -bounds.halfHeight, bounds.halfHeight)
                    let nextYMax = yWasFull ? bounds.halfHeight : clamp(current.clippingYMax, -bounds.halfHeight, bounds.halfHeight)
                    if (nextYMin > nextYMax) {
                      nextYMin = nextYMax
                    }

                    let nextXMin = xWasFull ? -bounds.halfWidth : clamp(current.clippingXMin, -bounds.halfWidth, bounds.halfWidth)
                    let nextXMax = xWasFull ? bounds.halfWidth : clamp(current.clippingXMax, -bounds.halfWidth, bounds.halfWidth)
                    if (nextXMin > nextXMax) {
                      nextXMin = nextXMax
                    }

                    if (
                      nextYMin === current.clippingYMin
                      && nextYMax === current.clippingYMax
                      && nextXMin === current.clippingXMin
                      && nextXMax === current.clippingXMax
                    ) {
                      return current
                    }

                    return {
                      ...current,
                      clippingYMin: nextYMin,
                      clippingYMax: nextYMax,
                      clippingXMin: nextXMin,
                      clippingXMax: nextXMax,
                    }
                  })
                }}
              />
            </div>
          )}
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
