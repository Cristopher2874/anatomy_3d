type HeaderProps = {
  onOpenAbout: () => void
}

export default function Header({ onOpenAbout }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-block">
        <p className="brand-tag">AnatomyLab 3D</p>
        <h1>Anatomia Interactiva</h1>
      </div>

      <nav aria-label="Navegacion principal" className="top-nav">
        {/* <a href="#">Inicio</a> */}
        <button type="button" className="about-button" onClick={onOpenAbout}>
          Sobre el proyecto
        </button>
      </nav>
    </header>
  )
}