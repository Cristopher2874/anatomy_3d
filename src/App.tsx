import { useState } from 'react'
import AboutProjectModal from './components/AboutProjectModal'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Scene from './Scene'
import type { ConnectionWithType, ViewSettings } from './types/connections'
import './App.css'

function App() {
  const [selectedConnection, setSelectedConnection] = useState<ConnectionWithType | null>(null)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    layers: {
      showNerves: true,
      showTargetOrgans: true,
      showGrid: true,
      showLabels: true,
    },
    clippingOffset: 0,
    xrayMode: false,
  })

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
            viewSettings={viewSettings}
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
            onToggleXray={() => {
              setViewSettings((current) => ({
                ...current,
                xrayMode: !current.xrayMode,
              }))
            }}
            onClearSelection={() => {
              setSelectedConnection(null)
            }}
          />
        </section>

        <section className="canvas-panel">
          <Scene
            selectedConnection={selectedConnection}
            onSelectConnection={setSelectedConnection}
            viewSettings={viewSettings}
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
