type HeaderProps = {
  onOpenAbout: () => void
}

export default function Header({ onOpenAbout }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-block">
        <div className="brand-copy">
          <p className="brand-tag">AnatomyLab 3D</p>
          <h1>Anatomía Interactiva</h1>
        </div>
      </div>

      <nav aria-label="Navegacion principal" className="top-nav">
        {/* <a href="#">Inicio</a> */}
        <button type="button" className="about-button" onClick={onOpenAbout}>
          Sobre el proyecto
        </button>
        <div className="brand-logos" aria-hidden="true">
          <img className="brand-logo faculty-logo" src="/facultad_medicina_logo.jpeg" alt="" />
          <img className="brand-logo university-logo" src="/universidad_logo.jpeg" alt="" />
        </div>
      </nav>
    </header>
  )
}