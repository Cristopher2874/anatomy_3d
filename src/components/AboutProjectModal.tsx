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
        <p className="eyebrow">Mision del proyecto</p>
        <h2>Anatomia talamica para aprender en comunidad</h2>
        <p>
          Esta plataforma transforma conexiones neuroanatomicas complejas en una experiencia visual
          clara, interactiva y humana para facilitar el estudio universitario.
        </p>
        <p>
          Promovemos el aprendizaje colaborativo, la empatia academica y la constancia compartida para
          que cada sesion de estudio se convierta en crecimiento colectivo.
        </p>

        <h3>Legado</h3>
        <p>
          A quienes construyeron este laboratorio digital: gracias por sembrar una herramienta que une
          ciencia, tecnologia y companerismo.
        </p>
        <p>
          A las futuras generaciones: eleven este proyecto con curiosidad, rigor y solidaridad. Cada
          mejora que compartan sera una puerta abierta para alguien mas.
        </p>

        <button type="button" className="clear-button" onClick={onClose}>
          Cerrar
        </button>
      </section>
    </div>
  )
}