type CameraControlsProps = {
  isAutoRotate: boolean
  activeQuickView: string | null
  modelColor: string
  onGoHome: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleAutoRotate: () => void
  onQuickView: (view: 'isometric' | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom') => void
  onModelColorChange: (nextColor: string) => void
}

export default function CameraControls({
  isAutoRotate,
  activeQuickView,
  modelColor,
  onGoHome,
  onZoomIn,
  onZoomOut,
  onToggleAutoRotate,
  onQuickView,
  onModelColorChange,
}: CameraControlsProps) {
  const quickViews: Array<{
    id: 'isometric' | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'
    label: string
    ariaLabel: string
  }> = [
    { id: 'isometric', label: 'Oblicua', ariaLabel: 'Vista oblicua anatómica' },
    { id: 'front', label: 'Anterior', ariaLabel: 'Vista anterior' },
    { id: 'back', label: 'Posterior', ariaLabel: 'Vista posterior' },
    { id: 'left', label: 'Lat. izq.', ariaLabel: 'Vista lateral izquierda' },
    { id: 'right', label: 'Lat. der.', ariaLabel: 'Vista lateral derecha' },
    { id: 'top', label: 'Superior', ariaLabel: 'Vista superior' },
    { id: 'bottom', label: 'Inferior', ariaLabel: 'Vista inferior' },
  ]

  return (
    <div className="camera-controls" role="group" aria-label="Controles de cámara">
      <button type="button" className="camera-btn home" onClick={onGoHome}>
        Vista Inicial
      </button>

      <div className="quick-view-group" aria-label="Vistas anatómicas">
        {quickViews.map((view) => (
          <button
            key={view.id}
            type="button"
            className={`camera-btn quick ${activeQuickView === view.id ? 'active' : ''}`}
            aria-label={view.ariaLabel}
            onClick={() => {
              onQuickView(view.id)
            }}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="zoom-group" aria-label="Control de zoom">
        <button type="button" className="camera-btn" onClick={onZoomIn} aria-label="Acercar">
          +
        </button>
        <button type="button" className="camera-btn" onClick={onZoomOut} aria-label="Alejar">
          -
        </button>
      </div>

      <button
        type="button"
        className={`camera-btn auto ${isAutoRotate ? 'active' : ''}`}
        onClick={onToggleAutoRotate}
        aria-pressed={isAutoRotate}
      >
        Autorrotación {isAutoRotate ? 'ACTIVA' : 'INACTIVA'}
      </button>

      <label className="model-color-group" aria-label="Color del modelo">
        <span>Color modelo</span>
        <input
          type="color"
          value={modelColor}
          onChange={(event) => {
            onModelColorChange(event.target.value)
          }}
        />
      </label>
    </div>
  )
}
