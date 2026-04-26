import { useEffect, useState } from 'react'
import type { ConnectionWithType } from '../types/connections'

type SidebarProps = {
  selectedConnection: ConnectionWithType | null
  onClearSelection: () => void
}

export default function Sidebar({ selectedConnection, onClearSelection }: SidebarProps) {
  const [shareMessage, setShareMessage] = useState('')

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
      setShareMessage('Enlace copiado. Invita a tu companero y revisen juntos esta via.')
    } catch {
      setShareMessage(`No se pudo copiar automaticamente. Comparte este enlace: ${shareUrl}`)
    }
  }

  return (
    <aside className="sidebar" aria-live="polite">
      <p className="eyebrow">Panel academico</p>
      <p className={`view-state ${selectedConnection ? 'focus' : 'free'}`}>
        {selectedConnection ? 'Vista enfocada' : 'Vista libre'}
      </p>

      {selectedConnection ? (
        <>
          <h2>{selectedConnection.nombre}</h2>
          <p className="connection-type">
            Tipo: {selectedConnection.tipo === 'eferencia' ? 'Eferencia' : 'Aferencia'}
          </p>

          <p>{selectedConnection.infoText}</p>

          <p className="microcopy">
            Compartir conocimiento fortalece la amistad universitaria y acelera el aprendizaje en
            equipo.
          </p>

          <button type="button" className="share-button" onClick={handleShare}>
            Compartir esta conexion con un companero de estudio
          </button>

          {shareMessage ? <p className="share-feedback">{shareMessage}</p> : null}

          <button type="button" className="clear-button" onClick={onClearSelection}>
            Limpiar seleccion
          </button>
        </>
      ) : (
        <>
          <h2>Bienvenido al laboratorio colaborativo</h2>
          <p>
            Selecciona una conexion para explorar. Recuerda que el conocimiento crece cuando se
            comparte. Mucho exito en tu estudio.
          </p>
        </>
      )}
    </aside>
  )
}