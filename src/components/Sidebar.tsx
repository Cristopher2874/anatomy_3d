import { useEffect, useState } from 'react'
import type {
  ConnectionVisibilityMode,
  ConnectionWithType,
  ViewSettings,
  VisibilityLayers,
} from '../types/connections'
import type { SelectedPieceInfo } from '../types/pieceInfo'

type SidebarProps = {
  activeScene?: 'brain' | 'thalamus'
  selectedConnection: ConnectionWithType | null
  selectedPieceInfo?: SelectedPieceInfo | null
  viewSettings: ViewSettings
  clippingRange?: { min: number; max: number }
  clippingRangeX?: { min: number; max: number }
  onToggleLayer: (layerKey: keyof VisibilityLayers) => void
  onChangeClippingYMin: (nextValue: number) => void
  onChangeClippingYMax: (nextValue: number) => void
  onChangeClippingXMin: (nextValue: number) => void
  onChangeClippingXMax: (nextValue: number) => void
  onChangeExplodeAmount: (nextAmount: number) => void
  onChangeConnectionVisibilityMode: (nextMode: ConnectionVisibilityMode) => void
  onToggleXray: () => void
  onClearSelection: () => void
}

export default function Sidebar({
  activeScene = 'brain',
  selectedConnection,
  selectedPieceInfo,
  viewSettings,
  clippingRange,
  clippingRangeX,
  onToggleLayer,
  onChangeClippingYMin,
  onChangeClippingYMax,
  onChangeClippingXMin,
  onChangeClippingXMax,
  onChangeExplodeAmount,
  onChangeConnectionVisibilityMode,
  onToggleXray,
  onClearSelection,
}: SidebarProps) {
  const [shareMessage, setShareMessage] = useState('')
  const hasSelection = Boolean(selectedConnection || selectedPieceInfo)
  void onToggleLayer
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
  const yRangeMin = clippingRange ? clippingRange.min : -3
  const yRangeMax = clippingRange ? clippingRange.max : 3
  const xRangeMin = clippingRangeX ? clippingRangeX.min : -3
  const xRangeMax = clippingRangeX ? clippingRangeX.max : 3
  const yMinValue = clamp(viewSettings.clippingYMin, yRangeMin, yRangeMax)
  const yMaxValue = clamp(viewSettings.clippingYMax, yRangeMin, yRangeMax)
  const xMinValue = clamp(viewSettings.clippingXMin, xRangeMin, xRangeMax)
  const xMaxValue = clamp(viewSettings.clippingXMax, xRangeMin, xRangeMax)
  const ySpan = Math.max(0.0001, yRangeMax - yRangeMin)
  const xSpan = Math.max(0.0001, xRangeMax - xRangeMin)
  const yLeftPercent = ((yMinValue - yRangeMin) / ySpan) * 100
  const yRightPercent = ((yMaxValue - yRangeMin) / ySpan) * 100
  const xLeftPercent = ((xMinValue - xRangeMin) / xSpan) * 100
  const xRightPercent = ((xMaxValue - xRangeMin) / xSpan) * 100

  const handleYMinChange = (nextValue: number) => {
    onChangeClippingYMin(Math.min(nextValue, yMaxValue))
  }
  const handleYMaxChange = (nextValue: number) => {
    onChangeClippingYMax(Math.max(nextValue, yMinValue))
  }
  const handleXMinChange = (nextValue: number) => {
    onChangeClippingXMin(Math.min(nextValue, xMaxValue))
  }
  const handleXMaxChange = (nextValue: number) => {
    onChangeClippingXMax(Math.max(nextValue, xMinValue))
  }

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

        {activeScene === 'brain' && (
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
        )}

        {/* <label className="layer-toggle">
          <input
            type="checkbox"
            checked={viewSettings.layers.showTargetOrgans}
            onChange={() => onToggleLayer('showTargetOrgans')}
          />
          <span>Órgano destino (selección)</span>
        </label> */}

      </section>

      <section className="tools-card" aria-label="Herramientas avanzadas">
        <h3>Planos de Corte (MRI)</h3>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Rango superior-inferior (Y)</label>
          <div className="dual-slider">
            <div className="dual-slider-track" />
            <div
              className="dual-slider-range"
              style={{ left: `${yLeftPercent}%`, width: `${Math.max(0, yRightPercent - yLeftPercent)}%` }}
            />
            <input
              className="clip-slider dual min"
              type="range"
              min={yRangeMin}
              max={yRangeMax}
              step={0.01}
              value={yMinValue}
              onInput={(event) => {
                handleYMinChange(Number((event.target as HTMLInputElement).value))
              }}
              onChange={(event) => {
                handleYMinChange(Number(event.target.value))
              }}
            />
            <input
              className="clip-slider dual max"
              type="range"
              min={yRangeMin}
              max={yRangeMax}
              step={0.01}
              value={yMaxValue}
              onInput={(event) => {
                handleYMaxChange(Number((event.target as HTMLInputElement).value))
              }}
              onChange={(event) => {
                handleYMaxChange(Number(event.target.value))
              }}
            />
          </div>
          <p className="tool-caption">Y min: {yMinValue.toFixed(2)} | Y max: {yMaxValue.toFixed(2)}</p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Rango izquierda-derecha (X)</label>
          <div className="dual-slider">
            <div className="dual-slider-track" />
            <div
              className="dual-slider-range"
              style={{ left: `${xLeftPercent}%`, width: `${Math.max(0, xRightPercent - xLeftPercent)}%` }}
            />
            <input
              className="clip-slider dual min"
              type="range"
              min={xRangeMin}
              max={xRangeMax}
              step={0.01}
              value={xMinValue}
              onInput={(event) => {
                handleXMinChange(Number((event.target as HTMLInputElement).value))
              }}
              onChange={(event) => {
                handleXMinChange(Number(event.target.value))
              }}
            />
            <input
              className="clip-slider dual max"
              type="range"
              min={xRangeMin}
              max={xRangeMax}
              step={0.01}
              value={xMaxValue}
              onInput={(event) => {
                handleXMaxChange(Number((event.target as HTMLInputElement).value))
              }}
              onChange={(event) => {
                handleXMaxChange(Number(event.target.value))
              }}
            />
          </div>
          <p className="tool-caption">X min: {xMinValue.toFixed(2)} | X max: {xMaxValue.toFixed(2)}</p>
        </div>

        <button
          type="button"
          className="clip-reset-button"
          onClick={() => {
            onChangeClippingYMin(yRangeMin)
            onChangeClippingYMax(yRangeMax)
            onChangeClippingXMin(xRangeMin)
            onChangeClippingXMax(xRangeMax)
          }}
        >
          Mostrar cerebro completo
        </button>

        <div style={{ marginTop: 10 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Vista explotada esférica</label>
          <input
            className="clip-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={viewSettings.explodeAmount}
            onChange={(event) => {
              onChangeExplodeAmount(Number(event.target.value))
            }}
          />
          <p className="tool-caption">Separación: {(viewSettings.explodeAmount * 100).toFixed(0)}%</p>
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
