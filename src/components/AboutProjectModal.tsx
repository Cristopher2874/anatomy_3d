type AboutProjectModalProps = {
  isOpen: boolean
  onClose: () => void
}

export default function AboutProjectModal({ isOpen, onClose }: AboutProjectModalProps) {
  if (!isOpen) {
    return null
  }

  const teamMembers = [
    'Edgar Osiel Martínez Cardona',
    'Valeria Martínez Colunga',
    'Isaac Uriel Martínez Gómez',
    'Santiago Camill Martínez Huerta',
    'Aldo Martínez Solís',
    'Elías Alessandro Maya Sánchez',
    'Fernanda Lizeth Medina Bivián',
  ]

  return (
    <div className="about-overlay" role="presentation" onClick={onClose}>
      <section
        className="about-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Sobre el proyecto"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <h1 className="eyebrow">Sobre AnatomyLab 3D</h1>
        {/* <h2>Anatomía para aprender</h2> */}

        <section className="about-section">
          <h3>Descripción del proyecto</h3>
          <p>
            Esta plataforma muestra una experiencia visual clara e interactiva sobre los núcleos
            talámicos, para facilitar el estudio universitario. Se indican sus aferencias y eferencias
            principales.
          </p>
        </section>

        <section className="about-section">
          <h3>Base académica</h3>
          <p>
            La información ha sido elaborada con base en la obra <em>Neuroanatomía clínica de Snell</em>
            y la página ha sido desarrollada como parte de un proyecto académico para facilitar la
            comprensión de la organización y conexiones funcionales del tálamo.
          </p>
        </section>

        <section className="about-section">
          <h3>Equipo</h3>
          <ul className="about-team-list">
            {teamMembers.map((member) => (
              <li key={member}>{member}</li>
            ))}
          </ul>
        </section>

        <button type="button" className="clear-button" onClick={onClose}>
          Cerrar
        </button>
      </section>
    </div>
  )
}