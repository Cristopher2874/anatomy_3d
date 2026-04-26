type AboutProjectModalProps = {
  isOpen: boolean
  onClose: () => void
}

export default function AboutProjectModal({ isOpen, onClose }: AboutProjectModalProps) {
  if (!isOpen) {
    return null
  }

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
        <p className="eyebrow">Sobre AnatomyLab 3D</p>
        <h2>Anatomia para aprender</h2>
        <p>
          Esta plataforma transforma conexiones neuroanatomicas complejas en una experiencia visual
          clara, interactiva y humana para facilitar el estudio universitario.
        </p>
        <p>
          Promovemos el aprendizaje colaborativo, la empatia academica y la constancia compartida para
          que cada sesion de estudio se convierta en crecimiento colectivo.
        </p>

        <h3>Equipo</h3>
        <p>
          Integrantes: ...
        </p>
        <p>
          Materia: ---
        </p>

        <button type="button" className="clear-button" onClick={onClose}>
          Cerrar
        </button>
      </section>
    </div>
  )
}