import { useState } from 'react'
import AboutProjectModal from './components/AboutProjectModal'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Scene from './Scene'
import ThalamusScene from './ThalamusScene'
import type { ThalamusSelectionInfo } from './data/thalamusData'
import type { ConnectionVisibilityMode, ConnectionWithType, ViewSettings } from './types/connections'
import type { SelectedPieceInfo } from './types/pieceInfo'
import './App.css'

function canShowConnectionType(mode: ConnectionVisibilityMode, tipo: ConnectionWithType['tipo']): boolean {
  if (mode === 'none') return false
  if (mode === 'both') return true
  return mode === tipo
}

type SceneKey = 'brain' | 'thalamus'

type SceneBounds = {
  halfHeight: number
  halfWidth: number
  initialized: boolean
}

function createDefaultViewSettings(): ViewSettings {
  return {
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
  }
}

function createDefaultBounds(): SceneBounds {
  return {
    halfHeight: 2.5,
    halfWidth: 2.5,
    initialized: false,
  }
}

function App() {
  const [activeScene, setActiveScene] = useState<SceneKey>('brain')

  // Brain scene selection state (kept isolated from thalamus scene)
  const [brainSelectedConnection, setBrainSelectedConnection] = useState<ConnectionWithType | null>(null)
  const [brainSelectedPieceInfo, setBrainSelectedPieceInfo] = useState<SelectedPieceInfo | null>(null)
  const [thalamusSelectedInfo, setThalamusSelectedInfo] = useState<ThalamusSelectionInfo | null>(null)
  const [thalamusClearSignal, setThalamusClearSignal] = useState(0)

  // Per-scene independent view states
  const [brainViewSettings, setBrainViewSettings] = useState<ViewSettings>(createDefaultViewSettings)
  const [thalamusViewSettings, setThalamusViewSettings] = useState<ViewSettings>(createDefaultViewSettings)

  // Per-scene independent clipping bounds
  const [brainBounds, setBrainBounds] = useState<SceneBounds>(createDefaultBounds)
  const [thalamusBounds, setThalamusBounds] = useState<SceneBounds>(createDefaultBounds)

  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const BOUNDS_SYNC_EPSILON = 0.08

  const activeViewSettings = activeScene === 'brain' ? brainViewSettings : thalamusViewSettings
  const activeBounds = activeScene === 'brain' ? brainBounds : thalamusBounds

  const updateActiveViewSettings = (updater: (current: ViewSettings) => ViewSettings) => {
    if (activeScene === 'brain') {
      setBrainViewSettings(updater)
      return
    }
    setThalamusViewSettings(updater)
  }

  const applyBoundsUpdate = (
    scene: SceneKey,
    bounds: { halfHeight: number; halfWidth: number },
  ) => {
    const setBounds = scene === 'brain' ? setBrainBounds : setThalamusBounds
    const setViewSettings = scene === 'brain' ? setBrainViewSettings : setThalamusViewSettings

    setBounds((previousBounds) => {
      setViewSettings((current) => {
        if (!previousBounds.initialized) {
          return {
            ...current,
            clippingYMin: -bounds.halfHeight,
            clippingYMax: bounds.halfHeight,
            clippingXMin: -bounds.halfWidth,
            clippingXMax: bounds.halfWidth,
          }
        }

        const yWasFull = Math.abs(current.clippingYMin + previousBounds.halfHeight) < BOUNDS_SYNC_EPSILON
          && Math.abs(current.clippingYMax - previousBounds.halfHeight) < BOUNDS_SYNC_EPSILON
        const xWasFull = Math.abs(current.clippingXMin + previousBounds.halfWidth) < BOUNDS_SYNC_EPSILON
          && Math.abs(current.clippingXMax - previousBounds.halfWidth) < BOUNDS_SYNC_EPSILON

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

      return {
        halfHeight: bounds.halfHeight,
        halfWidth: bounds.halfWidth,
        initialized: true,
      }
    })
  }

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
            selectedConnection={activeScene === 'brain' ? brainSelectedConnection : null}
            selectedPieceInfo={activeScene === 'brain' ? brainSelectedPieceInfo : null}
            selectedThalamusInfo={activeScene === 'thalamus' ? thalamusSelectedInfo : null}
            viewSettings={activeViewSettings}
            clippingRange={{ min: -activeBounds.halfHeight, max: activeBounds.halfHeight }}
            clippingRangeX={{ min: -activeBounds.halfWidth, max: activeBounds.halfWidth }}
            onToggleLayer={(layerKey) => {
              updateActiveViewSettings((current) => ({
                ...current,
                layers: {
                  ...current.layers,
                  [layerKey]: !current.layers[layerKey],
                },
              }))
            }}
            onChangeClippingYMin={(nextValue) => {
              updateActiveViewSettings((current) => ({
                ...current,
                clippingYMin: Math.min(nextValue, current.clippingYMax),
              }))
            }}
            onChangeClippingYMax={(nextValue) => {
              updateActiveViewSettings((current) => ({
                ...current,
                clippingYMax: Math.max(nextValue, current.clippingYMin),
              }))
            }}
            onChangeClippingXMin={(nextValue) => {
              updateActiveViewSettings((current) => ({
                ...current,
                clippingXMin: Math.min(nextValue, current.clippingXMax),
              }))
            }}
            onChangeClippingXMax={(nextValue) => {
              updateActiveViewSettings((current) => ({
                ...current,
                clippingXMax: Math.max(nextValue, current.clippingXMin),
              }))
            }}
            onChangeExplodeAmount={(nextAmount) => {
              updateActiveViewSettings((current) => ({
                ...current,
                explodeAmount: Math.max(0, Math.min(1, nextAmount)),
              }))
            }}
            onChangeConnectionVisibilityMode={(nextMode) => {
              // Connection filtering is only relevant in brain scene.
              setBrainViewSettings((current) => ({
                ...current,
                connectionVisibilityMode: nextMode,
              }))
              setBrainSelectedConnection((currentConnection) => {
                if (!currentConnection) return null
                return canShowConnectionType(nextMode, currentConnection.tipo) ? currentConnection : null
              })
              setBrainSelectedPieceInfo((currentPieceInfo) => (currentPieceInfo?.tier === 'no_mapeada' ? currentPieceInfo : null))
            }}
            onToggleXray={() => {
              updateActiveViewSettings((current) => ({
                ...current,
                xrayMode: !current.xrayMode,
              }))
            }}
            onClearSelection={() => {
              if (activeScene === 'brain') {
                setBrainSelectedConnection(null)
                setBrainSelectedPieceInfo(null)
                return
              }
              setThalamusSelectedInfo(null)
              setThalamusClearSignal((prev) => prev + 1)
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
                selectedConnection={brainSelectedConnection}
                onSelectConnection={setBrainSelectedConnection}
                onSelectedPieceInfoChange={setBrainSelectedPieceInfo}
                viewSettings={brainViewSettings}
                clippingEnabled={brainBounds.initialized}
                onModelBoundsComputed={(bounds: { halfHeight: number; halfWidth: number }) => {
                  applyBoundsUpdate('brain', bounds)
                }}
              />
            </div>
          )}

          {activeScene === 'thalamus' && (
            <div className="canvas-content">
              <ThalamusScene
                viewSettings={thalamusViewSettings}
                clippingEnabled={thalamusBounds.initialized}
                clearSelectionSignal={thalamusClearSignal}
                onSelectedNucleusChange={setThalamusSelectedInfo}
                onModelBoundsComputed={(bounds: { halfHeight: number; halfWidth: number }) => {
                  applyBoundsUpdate('thalamus', bounds)
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
