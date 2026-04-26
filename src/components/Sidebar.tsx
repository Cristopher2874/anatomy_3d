import { useEffect, useState } from 'react'
import type { ConnectionWithType, ViewSettings, VisibilityLayers } from '../types/connections'

type SidebarProps = {
  selectedConnection: ConnectionWithType | null
  viewSettings: ViewSettings
  onToggleLayer: (layerKey: keyof VisibilityLayers) => void
  onChangeClipping: (nextOffset: number) => void
  onToggleXray: () => void
  onClearSelection: () => void
}

export default function Sidebar({
  selectedConnection,
  viewSettings,
  onToggleLayer,
  onChangeClipping,
  onToggleXray,
  onClearSelection,
}: SidebarProps) {
  const [shareMessage, setShareMessage] = useState('')

  useEffect(() => {
    setShareMessage('')
  }, [selectedConnection])

  const handleShare = async () => {
    if (!selectedConnection) {
      return
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?connection=${selectedConnection.id}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareMessage('Enlace copiado. Invita a tu companero y revisen juntos esta via.')
    } catch {
      setShareMessage(`No se pudo copiar automaticamente. Comparte este enlace: ${shareUrl}`)
    }
  }

  return (
    <aside className="sidebar" aria-live="polite">
      <p className="eyebrow">Panel academico</p>
      <p className={`view-state ${selectedConnection ? 'focus' : 'free'}`}>
        {selectedConnection ? 'Vista enfocada' : 'Vista libre'}
      </p>

      <section className="tools-card" aria-label="Capas de visibilidad">
        <h3>Capas de Visibilidad</h3>

        <label className="layer-toggle">
          <input
            type="checkbox"
            checked={viewSettings.layers.showNerves}
            onChange={() => onToggleLayer('showNerves')}
          />
          <span>Nervios (Lineas)</span>
        </label>

        <label className="layer-toggle">
          <input
            type="checkbox"
            checked={viewSettings.layers.showTargetOrgans}
            onChange={() => onToggleLayer('showTargetOrgans')}
          />
          <span>Organos destino</span>
        </label>

        <label className="layer-toggle">
          <input
            type="checkbox"
            checked={viewSettings.layers.showGrid}
            onChange={() => onToggleLayer('showGrid')}
          />
          <span>Grid de suelo</span>
        </label>

        <label className="layer-toggle">
          <input
            type="checkbox"
            checked={viewSettings.layers.showLabels}
            onChange={() => onToggleLayer('showLabels')}
          />
          <span>Etiquetas de texto</span>
        </label>
      </section>

      <section className="tools-card" aria-label="Herramientas avanzadas">
        <h3>Plano de Corte</h3>
        <input
          className="clip-slider"
          type="range"
          min={-3}
          max={2}
          step={0.01}
          value={viewSettings.clippingOffset}
          onChange={(event) => {
            onChangeClipping(Number(event.target.value))
          }}
        />
        <p className="tool-caption">Desplazamiento: {viewSettings.clippingOffset.toFixed(2)}</p>

        <button
          type="button"
          className={`xray-button ${viewSettings.xrayMode ? 'active' : ''}`}
          onClick={onToggleXray}
        >
          Modo X-Ray {viewSettings.xrayMode ? 'ON' : 'OFF'}
        </button>
      </section>

      {selectedConnection ? (
        <>
          <h2>{selectedConnection.nombre}</h2>
          <p className="connection-type">
            Tipo: {selectedConnection.tipo === 'eferencia' ? 'Eferencia' : 'Aferencia'}
          </p>

          <p>{selectedConnection.infoText}</p>

          <p className="microcopy">
            Compartir conocimiento fortalece la amistad universitaria y acelera el aprendizaje en
            equipo.
          </p>

          <button type="button" className="share-button" onClick={handleShare}>
            Compartir esta conexion con un companero de estudio
          </button>

          {shareMessage ? <p className="share-feedback">{shareMessage}</p> : null}

          <button type="button" className="clear-button" onClick={onClearSelection}>
            Limpiar seleccion
          </button>
        </>
      ) : (
        <>
          <h2>Bienvenido al laboratorio colaborativo</h2>
          <p>
            Selecciona una conexion para explorar. Recuerda que el conocimiento crece cuando se
            comparte. Mucho exito en tu estudio.
          </p>
        </>
      )}
    </aside>
  )
}