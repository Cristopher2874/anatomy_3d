export type AferenciaSpec = {
  text: string
  requiresImage?: boolean
  imageConcept?: string
  pins?: string
}

export type EferenciaSpec = {
  text: string
  missingPiecesInfo?: string
  requiresImage?: boolean
  imageConcept?: string
}

export type NucleoTalamico = {
  name: string
  afferences: AferenciaSpec[]
  efferences: EferenciaSpec[]
  function: string
}

export const THALAMUS_NUCLEI: Record<string, NucleoTalamico> = {
  thalamusgris: {
    name: 'Núcleo Anterior',
    afferences: [
      {
        text: 'Fascículo mamilotalámico, giro del cíngulo, hipotálamo',
        requiresImage: false,
        pins: 'Cuerpos Mamilares e Hipotálamo',
      },
    ],
    efferences: [
      {
        text: 'Giro del cíngulo, hipotálamo',
        missingPiecesInfo: 'Archivos isthmuscingulate e rostralanteriorcingulate',
      },
    ],
    function: 'Tono emocional, mecanismos de la memoria reciente.',
  },
  thalamusamarillo: {
    name: 'Dorsomedial',
    afferences: [
      {
        text: 'Corteza prefrontal, hipotálamo, otros núcleos talámicos',
        requiresImage: true,
        imageConcept: 'Área olfatoria',
      },
    ],
    efferences: [
      {
        text: 'Corteza prefrontal, hipotálamo, otros núcleos talámicos',
        missingPiecesInfo: 'superiorfrontal, rostralmiddlefrontal, medialorbitofrontal',
      },
    ],
    function:
      'Integración de la información somática, visceral y olfatoria; relación con sentimientos emocionales.',
  },
  thalamusceleste_adelante: {
    name: 'Dorsal lateral',
    afferences: [
      {
        text: 'Corteza cerebral, otros núcleos talámicos',
        requiresImage: false,
      },
    ],
    efferences: [
      {
        text: 'Corteza cerebral, otros núcleos talámicos',
        missingPiecesInfo: 'superiorparietal, inferiorparietal',
      },
    ],
    function: 'Desconocida.',
  },
  thalamusceleste_atras: {
    name: 'Posterior lateral',
    afferences: [
      {
        text: 'Corteza cerebral, otros núcleos talámicos',
        requiresImage: false,
      },
    ],
    efferences: [
      {
        text: 'Corteza cerebral, otros núcleos talámicos',
        missingPiecesInfo: 'superiorparietal, inferiorparietal',
      },
    ],
    function: 'Desconocida.',
  },
  thalamusrosado: {
    name: 'Ventral anterior',
    afferences: [
      {
        text: 'Formación reticular, sustancia negra, cuerpo estriado, corteza premotora',
        requiresImage: true,
        imageConcept: 'Sustancia Negra y Cuerpo Estriado',
      },
    ],
    efferences: [
      {
        text: 'Formación reticular, sustancia negra, cuerpo estriado, corteza premotora',
        missingPiecesInfo: 'precentral.obj',
      },
    ],
    function: 'Influye en la actividad de la corteza motora.',
  },
  thalamusrojo: {
    name: 'Ventral lateral',
    afferences: [
      {
        text: 'Aferencias de cerebelo y núcleo rojo (y similares al VA)',
        requiresImage: true,
        imageConcept: 'Cerebelo y Núcleo Rojo',
      },
    ],
    efferences: [
      {
        text: 'Similar al VA, con eferencias hacia corteza motora',
        missingPiecesInfo: 'precentral.obj',
      },
    ],
    function: 'Influye en la actividad de la corteza motora.',
  },
  thalamusazul: {
    name: 'Ventral posteromedial (VPM) y posterolateral (VPL)',
    afferences: [
      {
        text: 'Lemnisco del trigémino, fibras gustativas (VPM)',
        requiresImage: true,
        imageConcept: 'Vía Gustativa y Tronco Encefálico',
      },
      {
        text: 'Lemniscos medial y espinal (VPL)',
        requiresImage: false,
        pins: 'Base de médula/tronco',
      },
    ],
    efferences: [
      {
        text: 'Corteza sensitiva somática primaria (áreas 3, 1 y 2)',
        missingPiecesInfo: 'postcentral.obj',
      },
    ],
    function: 'Retransmite las sensaciones comunes a la consciencia.',
  },
  thalamusblanco: {
    name: 'Intralaminar',
    afferences: [
      {
        text: 'Formación reticular, fascículos espinotalámico y trigeminotalámico',
        requiresImage: false,
        pins: 'Formación Reticular',
      },
    ],
    efferences: [
      {
        text: 'Corteza cerebral (múltiples áreas de forma difusa), cuerpo estriado',
        requiresImage: true,
        imageConcept: 'Cuerpo Estriado',
      },
    ],
    function: 'Influye en los estados de consciencia y alerta.',
  },
  thalamusvioleta: {
    name: 'C. Geniculado Medial, Lateral y Pulvinar',
    afferences: [
      {
        text: 'Tracto óptico (CGL)',
        requiresImage: true,
        imageConcept: 'Globo Ocular y Tracto Óptico',
      },
      {
        text: 'Colículo inferior, lemnisco lateral (CGM)',
        requiresImage: true,
        imageConcept: 'Oído Interno (Cóclea)',
      },
    ],
    efferences: [
      {
        text: 'Radiación óptica hacia corteza visual (CGL)',
        missingPiecesInfo: 'pericalcarine.obj, lateraloccipital.obj',
      },
      {
        text: 'Radiaciones auditivas hacia giro temporal superior (CGM)',
        missingPiecesInfo: 'superiortemporal.obj',
      },
    ],
    function: 'Visión (CGL), Audición (CGM) y asociación (Pulvinar).',
  },
}

// Mapping de nombres de mallas a IDs de núcleos para fácil acceso
export const MESH_NAME_TO_NUCLEUS_ID: Record<string, string> = {
  thalamusgris: 'thalamusgris',
  thalamusamarillo: 'thalamusamarillo',
  thalamusceleste_adelante: 'thalamusceleste_adelante',
  thalamusceleste_atras: 'thalamusceleste_atras',
  thalamusrosado: 'thalamusrosado',
  thalamusrojo: 'thalamusrojo',
  thalamusazul: 'thalamusazul',
  thalamusblanco: 'thalamusblanco',
  thalamusvioleta: 'thalamusvioleta',
}
