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
  const quickViews: Array<{ id: 'isometric' | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'; label: string }> = [
    { id: 'isometric', label: 'Iso' },
    { id: 'front', label: 'Front' },
    { id: 'back', label: 'Back' },
    { id: 'left', label: 'Left' },
    { id: 'right', label: 'Right' },
    { id: 'top', label: 'Top' },
    { id: 'bottom', label: 'Bottom' },
  ]

  return (
    <div className="camera-controls" role="group" aria-label="Controles de camara">
      <button type="button" className="camera-btn home" onClick={onGoHome}>
        Vista Inicial
      </button>

      <div className="quick-view-group" aria-label="Vistas rapidas">
        {quickViews.map((view) => (
          <button
            key={view.id}
            type="button"
            className={`camera-btn quick ${activeQuickView === view.id ? 'active' : ''}`}
            onClick={() => {
              onQuickView(view.id)
            }}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="zoom-group" aria-label="Control de zoom">
        <button type="button" className="camera-btn" onClick={onZoomIn} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="camera-btn" onClick={onZoomOut} aria-label="Zoom out">
          -
        </button>
      </div>

      <button
        type="button"
        className={`camera-btn auto ${isAutoRotate ? 'active' : ''}`}
        onClick={onToggleAutoRotate}
        aria-pressed={isAutoRotate}
      >
        Autorotacion {isAutoRotate ? 'ON' : 'OFF'}
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
