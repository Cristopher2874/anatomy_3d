export type AferenciaSpec = {
  text: string
  whatToPoint?: string
  missing?: string
  requiresImage?: boolean
  imageConcept?: string
  originOffset?: [number, number, number]
}

export type EferenciaSpec = {
  text: string
  whatToPoint?: string
  missing?: string
  requiresImage?: boolean
  imageConcept?: string
  originOffset?: [number, number, number]
}

export type NucleoTalamico = {
  name: string
  afferences: AferenciaSpec[]
  efferences: EferenciaSpec[]
  function: string
}

export const THALAMUS_NUCLEI: Record<string, NucleoTalamico> = {
  thalamusgris: {
    name: 'N\u00facleo Anterior',
    afferences: [
      {
        text: 'Fasc\u00edculo mamilotal\u00e1mico, giro del c\u00edngulo, hipot\u00e1lamo.',
        whatToPoint: 'Pins en cuerpos mamilares e hipot\u00e1lamo.',
        missing: 'L\u00ednea/vector para fasc\u00edculo mamilotal\u00e1mico.',
      },
    ],
    efferences: [
      {
        text: 'Giro del c\u00edngulo, hipot\u00e1lamo.',
        whatToPoint: 'isthmuscingulate.obj y rostralanteriorcingulate.obj.',
        missing: 'No falta nada.',
      },
    ],
    function: 'Tono emocional, mecanismos de la memoria reciente.',
  },

  thalamusamarillo: {
    name: 'N\u00facleo Dorsomedial',
    afferences: [
      {
        text: 'Otros n\u00facleos tal\u00e1micos (resumen de corteza prefrontal, hipot\u00e1lamo y otros n\u00facleos tal\u00e1micos).',
        whatToPoint: 'Pin en hipot\u00e1lamo.',
        missing: 'Imagen 2D de \u00e1rea olfatoria.',
        requiresImage: true,
        imageConcept: '\u00c1rea olfatoria',
      },
    ],
    efferences: [
      {
        text: 'Corteza prefrontal, hipot\u00e1lamo, otros n\u00facleos tal\u00e1micos.',
        whatToPoint: 'superiorfrontal.obj, rostralmiddlefrontal.obj, medialorbitofrontal.obj.',
        missing: 'No falta nada.',
      },
    ],
    function: 'Integraci\u00f3n de informaci\u00f3n som\u00e1tica, visceral y olfatoria, y su relaci\u00f3n con sentimientos emocionales y estados subjetivos.',
  },

  thalamusceleste_adelante: {
    name: 'Dorsal Lateral',
    afferences: [
      {
        text: 'Corteza cerebral, otros n\u00facleos tal\u00e1micos.',
        whatToPoint: 'Puntos de origen en otros n\u00facleos tal\u00e1micos.',
        missing: 'No falta nada.',
      },
    ],
    efferences: [
      {
        text: 'Corteza cerebral, otros n\u00facleos tal\u00e1micos.',
        whatToPoint: 'superiorparietal.obj e inferiorparietal.obj.',
        missing: 'No falta nada.',
      },
    ],
    function: 'Desconocida.',
  },

  thalamusceleste_atras: {
    name: 'Posterior Lateral',
    afferences: [
      {
        text: 'Corteza cerebral, otros n\u00facleos tal\u00e1micos.',
        whatToPoint: 'Puntos de origen en otros n\u00facleos tal\u00e1micos.',
        missing: 'No falta nada.',
      },
    ],
    efferences: [
      {
        text: 'Corteza cerebral, otros n\u00facleos tal\u00e1micos.',
        whatToPoint: 'superiorparietal.obj e inferiorparietal.obj.',
        missing: 'No falta nada.',
      },
    ],
    function: 'Desconocida.',
  },

  thalamusrosado: {
    name: 'Ventral Anterior',
    afferences: [
      {
        text: 'Otros n\u00facleos tal\u00e1micos (con participaci\u00f3n de formaci\u00f3n reticular, sustancia negra, cuerpo estriado y corteza premotora).',
        whatToPoint: 'Pin en formaci\u00f3n reticular.',
        missing: 'Imagen 2D de sustancia negra y cuerpo estriado.',
        requiresImage: true,
        imageConcept: 'Sustancia negra y cuerpo estriado',
      },
    ],
    efferences: [
      {
        text: 'Formaci\u00f3n reticular, sustancia negra, cuerpo estriado, corteza premotora, otros n\u00facleos tal\u00e1micos.',
        whatToPoint: 'precentral.obj.',
        missing: 'No falta nada.',
      },
    ],
    function: 'Influye en la actividad de la corteza motora.',
  },

  thalamusrojo: {
    name: 'Ventral Lateral',
    afferences: [
      {
        text: 'Como ventral anterior, con aferencia principal del cerebelo y menor del n\u00facleo rojo.',
        whatToPoint: 'Pin en cerebelo.',
        missing: 'Imagen 2D de n\u00facleo rojo.',
        requiresImage: true,
        imageConcept: 'N\u00facleo rojo',
      },
    ],
    efferences: [
      {
        text: 'Como en ventral anterior.',
        whatToPoint: 'precentral.obj.',
        missing: 'No falta nada.',
      },
    ],
    function: 'Influye en la actividad de la corteza motora.',
  },

  thalamusazul: {
    name: 'VPM / VPL',
    afferences: [
      {
        text: 'VPM: lemnisco del trig\u00e9mino, fibras gustativas.',
        whatToPoint: 'Pin en tronco encef\u00e1lico superior.',
        missing: 'Imagen 2D de v\u00eda gustativa.',
        requiresImage: true,
        imageConcept: 'V\u00eda gustativa',
        originOffset: [-0.12, 0.09, 0.06],
      },
      {
        text: 'VPL: lemniscos medial y espinal.',
        whatToPoint: 'Pin en base de m\u00e9dula/tronco con l\u00edneas de luz de lemniscos.',
        originOffset: [0.14, 0.07, -0.08],
      },
    ],
    efferences: [
      {
        text: 'Corteza sensitiva som\u00e1tica primaria (\u00e1reas 3, 1 y 2).',
        whatToPoint: 'postcentral.obj.',
        missing: 'No falta nada.',
      },
    ],
    function: 'Retransmite las sensaciones comunes a la consciencia.',
  },

  thalamusblanco: {
    name: 'Intralaminar',
    afferences: [
      {
        text: 'Formaci\u00f3n reticular, fasc\u00edculos espinotal\u00e1mico y trigeminotal\u00e1mico.',
        whatToPoint: 'Pin en formaci\u00f3n reticular y l\u00edneas fasciculares espinales.',
      },
    ],
    efferences: [
      {
        text: 'A corteza cerebral mediante otros n\u00facleos tal\u00e1micos y cuerpo estriado.',
        whatToPoint: 'M\u00faltiples \u00e1reas corticales de forma difusa.',
        missing: 'Imagen 2D de cuerpo estriado.',
        requiresImage: true,
        imageConcept: 'Cuerpo estriado',
      },
    ],
    function: 'Influye en estados de consciencia y alerta.',
  },

  thalamusvioleta: {
    name: 'Geniculados / Pulvinar',
    afferences: [
      {
        text: 'C. Geniculado Medial: col\u00edculo inferior, lemnisco lateral procedente de ambos o\u00eddos.',
        whatToPoint: 'Pin en col\u00edculo inferior.',
        missing: 'Imagen 2D de o\u00eddo interno (c\u00f3clea).',
        requiresImage: true,
        imageConcept: 'O\u00eddo interno (c\u00f3clea)',
        originOffset: [-0.18, 0.08, 0.1],
      },
      {
        text: 'C. Geniculado Lateral: tracto \u00f3ptico.',
        missing: 'Imagen 2D de globo ocular y se\u00f1alizaci\u00f3n de tracto \u00f3ptico.',
        requiresImage: true,
        imageConcept: 'Globo ocular y tracto \u00f3ptico',
        originOffset: [0.12, 0.12, -0.1],
      },
    ],
    efferences: [
      {
        text: 'C. Geniculado Medial: radiaciones auditivas hacia giro temporal superior.',
        whatToPoint: 'superiortemporal.obj.',
        missing: 'No falta nada.',
        originOffset: [-0.2, 0.1, 0.06],
      },
      {
        text: 'C. Geniculado Lateral: radiaci\u00f3n \u00f3ptica hacia corteza visual occipital.',
        whatToPoint: 'pericalcarine.obj y lateraloccipital.obj.',
        missing: 'No falta nada.',
        originOffset: [0.16, 0.11, -0.08],
      },
      {
        text: 'Pulvinar: eferencias de asociaci\u00f3n parietal-temporal-occipital.',
        whatToPoint: 'Proyecci\u00f3n cortical de asociaci\u00f3n difusa.',
        originOffset: [0, 0.14, 0.14],
      },
    ],
    function: 'Audici\u00f3n (CGM), visi\u00f3n (CGL) y asociaci\u00f3n (pulvinar).',
  },
}

// Mapping de nombres de mallas a IDs de n\u00facleos para acceso r\u00e1pido.
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
