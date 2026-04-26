import { useState } from 'react'
import AboutProjectModal from './components/AboutProjectModal'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Scene from './Scene'
import type { ConnectionWithType } from './types/connections'
import './App.css'

function App() {
  const [selectedConnection, setSelectedConnection] = useState<ConnectionWithType | null>(null)
  const [isAboutOpen, setIsAboutOpen] = useState(false)

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
            onClearSelection={() => {
              setSelectedConnection(null)
            }}
          />
        </section>

        <section className="canvas-panel">
          <Scene selectedConnection={selectedConnection} onSelectConnection={setSelectedConnection} />
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
