type CameraControlsProps = {
  isAutoRotate: boolean
  onGoHome: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleAutoRotate: () => void
}

export default function CameraControls({
  isAutoRotate,
  onGoHome,
  onZoomIn,
  onZoomOut,
  onToggleAutoRotate,
}: CameraControlsProps) {
  return (
    <div className="camera-controls" role="group" aria-label="Controles de camara">
      <button type="button" className="camera-btn home" onClick={onGoHome}>
        Vista Inicial
      </button>

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
    </div>
  )
}