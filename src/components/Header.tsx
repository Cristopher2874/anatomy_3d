type HeaderProps = {
  onOpenAbout: () => void
}

export default function Header({ onOpenAbout }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-block">
        <p className="brand-tag">NeuroLab 3D</p>
        <h1>Anatomia Talamica Interactiva</h1>
      </div>

      <nav aria-label="Navegacion principal" className="top-nav">
        <a href="#">Inicio</a>
        <a href="#">Mapa de conexiones</a>
        <a href="#">Equipos de estudio</a>
        <button type="button" className="about-button" onClick={onOpenAbout}>
          Sobre el proyecto
        </button>
      </nav>
    </header>
  )
}