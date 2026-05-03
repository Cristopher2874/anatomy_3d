import { useEffect, useState } from 'react'
import type { ConnectionWithType, ViewSettings, VisibilityLayers } from '../types/connections'

type SelectedPieceInfo = {
  name: string
  infoText: string
}

type SidebarProps = {
  selectedConnection: ConnectionWithType | null
  selectedPieceInfo?: SelectedPieceInfo | null
  viewSettings: ViewSettings
  clippingRange?: { min: number; max: number }
  clippingRangeX?: { min: number; max: number }
  onToggleLayer: (layerKey: keyof VisibilityLayers) => void
  onChangeClipping: (nextOffset: number) => void
  onChangeClippingX?: (nextOffset: number) => void
  onToggleXray: () => void
  onClearSelection: () => void
}

export default function Sidebar({
  selectedConnection,
  selectedPieceInfo,
  viewSettings,
  clippingRange,
  clippingRangeX,
  onToggleLayer,
  onChangeClipping,
  onChangeClippingX,
  onToggleXray,
  onClearSelection,
}: SidebarProps) {
  const [shareMessage, setShareMessage] = useState('')
  const hasSelection = Boolean(selectedConnection || selectedPieceInfo)

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
      <p className="eyebrow">Explorador</p>
      <p className={`view-state ${hasSelection ? 'focus' : 'free'}`}>
        {hasSelection ? 'Vista enfocada' : 'Vista libre'}
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
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Corte superior-inferior</label>
          <input
            className="clip-slider"
            type="range"
            min={clippingRange ? clippingRange.min : -3}
            max={clippingRange ? clippingRange.max : 2}
            step={0.01}
            value={Math.max(clippingRange ? clippingRange.min : -3, Math.min(clippingRange ? clippingRange.max : 2, viewSettings.clippingOffset))}
            onChange={(event) => {
              onChangeClipping(Number(event.target.value))
            }}
          />
          <p className="tool-caption">Desplazamiento: {viewSettings.clippingOffset.toFixed(2)}</p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Corte izquierda-derecha</label>
          <input
            className="clip-slider"
            type="range"
            min={clippingRangeX ? clippingRangeX.min : -3}
            max={clippingRangeX ? clippingRangeX.max : 2}
            step={0.01}
            value={Math.max(clippingRangeX ? clippingRangeX.min : -3, Math.min(clippingRangeX ? clippingRangeX.max : 2, viewSettings.clippingOffsetX ?? 0))}
            onChange={(event) => {
              onChangeClippingX?.(Number(event.target.value))
            }}
          />
          <p className="tool-caption">Desplazamiento X: {(viewSettings.clippingOffsetX ?? 0).toFixed(2)}</p>
        </div>

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
          {selectedPieceInfo?.name ? <p className="connection-type">Pieza: {selectedPieceInfo.name}</p> : null}
          <p className="connection-type">
            Tipo: {selectedConnection.tipo === 'eferencia' ? 'Eferencia' : 'Aferencia'}
          </p>

          <p>{selectedPieceInfo?.infoText || selectedConnection.infoText}</p>

          {Array.isArray(selectedConnection.externalTargets) && selectedConnection.externalTargets.length > 0 ? (
            <div className="tools-card" aria-label="Estructuras relacionadas no modeladas">
              <h3>Estructuras Relacionadas (No Modeladas)</h3>
              {selectedConnection.externalTargets.map((target: string) => (
                <p key={target} className="tool-caption">• {target}</p>
              ))}
            </div>
          ) : null}

          {Array.isArray(selectedConnection.missingAssets) && selectedConnection.missingAssets.length > 0 ? (
            <div className="tools-card" aria-label="Recursos faltantes">
              <h3>Recursos Faltantes</h3>
              {selectedConnection.missingAssets.map((item: string) => (
                <p key={item} className="tool-caption">• {item}</p>
              ))}
            </div>
          ) : null}

          <button type="button" className="share-button" onClick={handleShare}>
            Compartir esta conexion
          </button>

          {shareMessage ? <p className="share-feedback">{shareMessage}</p> : null}

          <button type="button" className="clear-button" onClick={onClearSelection}>
            Limpiar seleccion
          </button>
        </>
      ) : (
        <>
          {selectedPieceInfo ? (
            <>
              <h2>{selectedPieceInfo.name}</h2>
              <p className="connection-type">Pieza del modelo 3D</p>
              <p>{selectedPieceInfo.infoText}</p>
            </>
          ) : (
            <>
              <h2>Bienvenido al laboratorio colaborativo</h2>
              <p>
                Selecciona una conexion para explorar. Emplea los controles para personalizar tu vista.
              </p>
              <p>
                Click derecho en la escena para rotar, scroll para zoom y click medio para desplazar.
              </p>
              <p>
                Puedes ajustar los controles de visibilidad para enfocarte en lo que mas te interese.
              </p>
            </>
          )}
        </>
      )}
    </aside>
  )
}
