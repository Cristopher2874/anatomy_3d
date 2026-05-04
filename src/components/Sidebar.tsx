import { useEffect, useState } from 'react'
import type {
  ConnectionVisibilityMode,
  ConnectionWithType,
  ViewSettings,
  VisibilityLayers,
} from '../types/connections'
import type { SelectedPieceInfo } from '../types/pieceInfo'

type SidebarProps = {
  selectedConnection: ConnectionWithType | null
  selectedPieceInfo?: SelectedPieceInfo | null
  viewSettings: ViewSettings
  clippingRange?: { min: number; max: number }
  clippingRangeX?: { min: number; max: number }
  onToggleLayer: (layerKey: keyof VisibilityLayers) => void
  onChangeClipping: (nextOffset: number) => void
  onChangeClippingX?: (nextOffset: number) => void
  onChangeConnectionVisibilityMode: (nextMode: ConnectionVisibilityMode) => void
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
  onChangeConnectionVisibilityMode,
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
      setShareMessage('Enlace copiado. Invita a tu compañero y revisen juntos esta vía.')
    } catch {
      setShareMessage(`No se pudo copiar automáticamente. Comparte este enlace: ${shareUrl}`)
    }
  }

  const connectionTierLabel = selectedConnection
    ? selectedConnection.tipo === 'eferencia'
      ? 'Circuito Eferente'
      : 'Circuito Aferente'
    : null

  const pieceTierLabel = selectedPieceInfo
    ? selectedPieceInfo.tier === 'no_mapeada'
      ? 'Referencia Anatómica'
      : selectedPieceInfo.tier === 'eferencia'
        ? 'Circuito Eferente'
        : 'Circuito Aferente'
    : null

  const tierClassFromValue = (tier: 'eferencia' | 'aferencia' | 'no_mapeada') => {
    if (tier === 'eferencia') return 'tier-eferente'
    if (tier === 'aferencia') return 'tier-aferente'
    return 'tier-no-mapeada'
  }

  return (
    <aside className="sidebar" aria-live="polite">
      <p className="eyebrow">Explorador</p>
      <p className={`view-state ${hasSelection ? 'focus' : 'free'}`}>
        {hasSelection ? 'Vista enfocada' : 'Vista libre'}
      </p>

      <section className="tools-card" aria-label="Capas de visibilidad">
        <h3>Capas de Visibilidad</h3>

        {/* <label className="layer-toggle">
          <input
            type="checkbox"
            checked={viewSettings.layers.showNerves}
            onChange={() => onToggleLayer('showNerves')}
          />
          <span>Nervios (Líneas)</span>
        </label> */}

        <label className="connection-visibility-control">
          <span>Mostrar conexiones</span>
          <select
            value={viewSettings.connectionVisibilityMode}
            onChange={(event) => {
              onChangeConnectionVisibilityMode(event.target.value as ConnectionVisibilityMode)
            }}
          >
            <option value="both">Aferente y Eferente</option>
            <option value="aferencia">Solo Aferente (Azul)</option>
            <option value="eferencia">Solo Eferente (Rojo)</option>
            <option value="none">Ninguna</option>
          </select>
        </label>

        <label className="layer-toggle">
          <input
            type="checkbox"
            checked={viewSettings.layers.showTargetOrgans}
            onChange={() => onToggleLayer('showTargetOrgans')}
          />
          <span>Órgano destino (selección)</span>
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
          {connectionTierLabel ? (
            <p className={`tier-badge ${tierClassFromValue(selectedConnection.tipo)}`}>
              Nivel: {connectionTierLabel}
            </p>
          ) : null}
          <p className="connection-type">
            Tipo: {selectedConnection.tipo === 'eferencia' ? 'Eferencia' : 'Aferencia'}
          </p>

          <p>{selectedPieceInfo?.infoText || selectedConnection.infoText}</p>
          {selectedPieceInfo?.learningPoints && selectedPieceInfo.learningPoints.length > 0 ? (
            <div className="tools-card" aria-label="Aprendizaje anatómico de la pieza">
              <h3>Puntos de Aprendizaje</h3>
              {selectedPieceInfo.learningPoints.map((point) => (
                <p key={point} className="tool-caption">- {point}</p>
              ))}
            </div>
          ) : null}

          {Array.isArray(selectedConnection.externalTargets) && selectedConnection.externalTargets.length > 0 ? (
            <div className="tools-card" aria-label="Estructuras relacionadas">
              <h3>Estructuras Relacionadas</h3>
              {selectedConnection.externalTargets.map((target: string) => (
                <p key={target} className="tool-caption">- {target}</p>
              ))}
            </div>
          ) : null}

          <button type="button" className="share-button" onClick={handleShare}>
            Compartir esta conexión
          </button>

          {shareMessage ? <p className="share-feedback">{shareMessage}</p> : null}

          <button type="button" className="clear-button" onClick={onClearSelection}>
            Limpiar selección
          </button>
        </>
      ) : (
        <>
          {selectedPieceInfo ? (
            <>
              <h2>{selectedPieceInfo.name}</h2>
              {pieceTierLabel ? (
                <p className={`tier-badge ${tierClassFromValue(selectedPieceInfo.tier)}`}>
                  Nivel: {pieceTierLabel}
                </p>
              ) : null}
              <p className="connection-type">Pieza del modelo 3D</p>
              <p>{selectedPieceInfo.infoText}</p>
              {selectedPieceInfo.learningPoints && selectedPieceInfo.learningPoints.length > 0 ? (
                <div className="tools-card" aria-label="Aprendizaje anatómico de la pieza">
                  <h3>Puntos de Aprendizaje</h3>
                  {selectedPieceInfo.learningPoints.map((point) => (
                    <p key={point} className="tool-caption">- {point}</p>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <h2>Bienvenido al laboratorio colaborativo</h2>
              <p>
                Selecciona una conexión para explorar. Emplea los controles para personalizar tu vista.
              </p>
              <p>
                Clic derecho en la escena para rotar, scroll para zoom y clic medio para desplazar.
              </p>
              <p>
                Puedes ajustar los controles de visibilidad para enfocarte en lo que más te interese.
              </p>
            </>
          )}
        </>
      )}
    </aside>
  )
}



