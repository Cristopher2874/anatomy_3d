export type ThalamusCircuitSpec = {
  label: string
  main: string
  pathway: string
  involvedStructures: string[]
  functionRole: string
  clinicalNote?: string
  originOffset?: [number, number, number]
}

export type NucleoTalamico = {
  name: string
  overview: string
  functionCore: string
  afferences: ThalamusCircuitSpec[]
  efferences: ThalamusCircuitSpec[]
  learningHighlights: string[]
}

export type ThalamusSelectionInfo = {
  id: string
  name: string
  kind?: 'nucleus' | 'reference'
  overview: string
  functionCore: string
  afferences: ThalamusCircuitSpec[]
  efferences: ThalamusCircuitSpec[]
  learningHighlights: string[]
}

type ThalamusReferenceInfo = {
  name: string
  overview: string
  functionCore: string
  learningHighlights: string[]
}

export const THALAMUS_PIECE_PALETTE = {
  thalamusgris: '#c9d7d0',
  thalamusamarillo: '#d8d2c5',
  thalamusceleste_adelante: '#cbd6e3',
  thalamusceleste_atras: '#bcc9dc',
  thalamusrosado: '#d8cbd6',
  thalamusrojo: '#d9c7c2',
  thalamusazul: '#c7d4db',
  thalamusblanco: '#d9d8cf',
  thalamusvioleta: '#cfcbe0',
} as const

export const THALAMUS_NUCLEI: Record<string, NucleoTalamico> = {
  thalamusgris: {
    name: 'N\u00facleo Anterior',
    overview: 'Parte del circuito l\u00edmbico de Papez; integra se\u00f1ales de memoria y contexto emocional.',
    functionCore: 'Modula memoria epis\u00f3dica reciente, orientaci\u00f3n emocional y aprendizaje contextual.',
    afferences: [
      {
        label: 'Aferencia l\u00edmbica principal',
        main: 'Fasc\u00edculo mamilotal\u00e1mico, giro del c\u00edngulo e hipot\u00e1lamo.',
        pathway: 'Recibe entrada desde cuerpos mamilares (v\u00eda tracto mamilotal\u00e1mico) y bucles cingulares/hipotal\u00e1micos que sincronizan memoria y valencia afectiva.',
        involvedStructures: ['Cuerpos mamilares', 'Hipot\u00e1lamo', 'Giro del c\u00edngulo'],
        functionRole: 'Coordina memoria reciente con respuesta auton\u00f3mica y emocional.',
      },
    ],
    efferences: [
      {
        label: 'Salida l\u00edmbica cortical',
        main: 'Proyecciones al giro del c\u00edngulo e hipot\u00e1lamo.',
        pathway: 'Env\u00eda informaci\u00f3n talamocingulada para consolidaci\u00f3n de memoria contextual y modulaci\u00f3n afectiva.',
        involvedStructures: ['Giro del c\u00edngulo', 'Hipot\u00e1lamo'],
        functionRole: 'Sostiene conducta motivacional y memoria emocional.',
      },
    ],
    learningHighlights: [
      'Nodo clave del circuito de Papez.',
      'Lesiones pueden producir alteraciones de memoria reciente y aplanamiento afectivo.',
    ],
  },

  thalamusamarillo: {
    name: 'N\u00facleo Dorsomedial',
    overview: 'N\u00facleo de asociaci\u00f3n frontol\u00edmbica con fuerte participaci\u00f3n cognitivo-emocional.',
    functionCore: 'Integra se\u00f1ales som\u00e1ticas, viscerales y olfatorias para juicio afectivo y funci\u00f3n ejecutiva.',
    afferences: [
      {
        label: 'Aferencia de asociaci\u00f3n',
        main: 'Predominio de otros n\u00facleos tal\u00e1micos, con contribuci\u00f3n hipotal\u00e1mica y prefrontal.',
        pathway: 'Recibe entradas convergentes tal\u00e1micas y l\u00edmbicas que aportan contexto visceral y motivacional.',
        involvedStructures: ['Otros n\u00facleos tal\u00e1micos', 'Hipot\u00e1lamo', 'Corteza prefrontal'],
        functionRole: 'Prepara integraci\u00f3n cognitiva de estado interno y contexto.',
      },
    ],
    efferences: [
      {
        label: 'Salida prefrontal-l\u00edmbica',
        main: 'Proyecciones a corteza prefrontal, hipot\u00e1lamo y red tal\u00e1mica de asociaci\u00f3n.',
        pathway: 'Distribuye se\u00f1ales de valoraci\u00f3n emocional hacia redes ejecutivas para toma de decisiones.',
        involvedStructures: ['Corteza prefrontal', 'Hipot\u00e1lamo', 'N\u00facleos tal\u00e1micos de asociaci\u00f3n'],
        functionRole: 'Acopla emoci\u00f3n con planificaci\u00f3n y conducta social.',
      },
    ],
    learningHighlights: [
      'Vinculado a control ejecutivo, conducta social y procesamiento afectivo.',
      'Disfunci\u00f3n puede asociarse a apat\u00eda, impulsividad o alteraciones del juicio.',
    ],
  },

  thalamusceleste_adelante: {
    name: 'Dorsal Lateral',
    overview: 'N\u00facleo de asociaci\u00f3n parietal con integraci\u00f3n sensorial de alto nivel.',
    functionCore: 'Contribuye a atenci\u00f3n espacial e integraci\u00f3n multimodal cortico-tal\u00e1mica.',
    afferences: [
      {
        label: 'Entrada corticotal\u00e1mica asociativa',
        main: 'Aferencias desde corteza cerebral y otros n\u00facleos tal\u00e1micos.',
        pathway: 'Recibe bucles de retroalimentaci\u00f3n cortical para integraci\u00f3n sensorial contextual.',
        involvedStructures: ['Corteza cerebral de asociaci\u00f3n', 'N\u00facleos tal\u00e1micos asociados'],
        functionRole: 'Refina selecci\u00f3n atencional y mapeo espacial.',
      },
    ],
    efferences: [
      {
        label: 'Salida parietal de asociaci\u00f3n',
        main: 'Proyecciones hacia corteza parietal superior e inferior.',
        pathway: 'Reenv\u00eda informaci\u00f3n tal\u00e1mica integrada para orientaci\u00f3n visuoespacial.',
        involvedStructures: ['L\u00f3bulo parietal superior', 'L\u00f3bulo parietal inferior'],
        functionRole: 'Apoya atenci\u00f3n dirigida y procesamiento espacial.',
      },
    ],
    learningHighlights: [
      'Comparte funciones con otros n\u00facleos posteriores de asociaci\u00f3n.',
      'Participa en circuitos atencionales fronto-parietales.',
    ],
  },

  thalamusceleste_atras: {
    name: 'Posterior Lateral',
    overview: 'N\u00facleo posterior de relevo asociativo entre t\u00e1lamo y corteza parietal.',
    functionCore: 'Integra contexto sensorial y espacial para percepci\u00f3n consciente orientada.',
    afferences: [
      {
        label: 'Entrada cortical de asociaci\u00f3n',
        main: 'Aferencias desde corteza cerebral y otros n\u00facleos tal\u00e1micos.',
        pathway: 'Recibe informaci\u00f3n multimodal para actualizar mapas de contexto espacial.',
        involvedStructures: ['Corteza parietal/temporal de asociaci\u00f3n', 'N\u00facleos tal\u00e1micos asociados'],
        functionRole: 'Integra se\u00f1ales para orientaci\u00f3n sensorial compleja.',
      },
    ],
    efferences: [
      {
        label: 'Salida de integraci\u00f3n parietal',
        main: 'Proyecciones a corteza parietal superior e inferior.',
        pathway: 'Transfiere informaci\u00f3n de asociaci\u00f3n hacia redes corticales de atenci\u00f3n.',
        involvedStructures: ['Parietal superior', 'Parietal inferior'],
        functionRole: 'Facilita orientaci\u00f3n espacial y selecci\u00f3n de est\u00edmulos.',
      },
    ],
    learningHighlights: [
      'Funci\u00f3n cercana al complejo pulvinar-parietal.',
      'Importante en redes de atenci\u00f3n visual y espacial.',
    ],
  },

  thalamusrosado: {
    name: 'Ventral Anterior',
    overview: 'Componente motor del t\u00e1lamo en bucles ganglio-basal-corticales.',
    functionCore: 'Regula preparaci\u00f3n motora y selecci\u00f3n de programas de movimiento.',
    afferences: [
      {
        label: 'Entrada motor-moduladora',
        main: 'Formaci\u00f3n reticular, sustancia negra, cuerpo estriado y red tal\u00e1mica asociada.',
        pathway: 'Integra se\u00f1ales de ganglios basales y estado de alerta para ajustar iniciaci\u00f3n motora.',
        involvedStructures: ['Sustancia negra', 'Cuerpo estriado', 'Formaci\u00f3n reticular', 'N\u00facleos tal\u00e1micos asociados'],
        functionRole: 'Filtra y prioriza salida motora voluntaria.',
      },
    ],
    efferences: [
      {
        label: 'Salida premotora',
        main: 'Proyecciones a corteza premotora y red motora frontal.',
        pathway: 'Env\u00eda se\u00f1ales de selecci\u00f3n/iniciaci\u00f3n hacia corteza para ejecuci\u00f3n planificada.',
        involvedStructures: ['Corteza premotora', 'Corteza frontal motora'],
        functionRole: 'Influye en inicio y organizaci\u00f3n del movimiento.',
      },
    ],
    learningHighlights: [
      'Nodo cr\u00edtico del circuito extrapiramidal.',
      'Alteraciones pueden asociarse a bradicinesia o disfunci\u00f3n de programaci\u00f3n motora.',
    ],
  },

  thalamusrojo: {
    name: 'Ventral Lateral',
    overview: 'Relevo motor tal\u00e1mico con fuerte entrada cerebelosa.',
    functionCore: 'Sincroniza precisi\u00f3n, temporizaci\u00f3n y correcci\u00f3n online del movimiento.',
    afferences: [
      {
        label: 'Aferencia cerebelosa dominante',
        main: 'Entrada principal desde cerebelo y contribuci\u00f3n del n\u00facleo rojo.',
        pathway: 'Recibe informaci\u00f3n de correcci\u00f3n motora y error sensoriomotor para ajuste fino.',
        involvedStructures: ['Cerebelo', 'N\u00facleo rojo', 'Circuitos motores tal\u00e1micos'],
        functionRole: 'Ajuste de precisi\u00f3n, ritmo y coordinaci\u00f3n motora.',
      },
    ],
    efferences: [
      {
        label: 'Salida motora primaria',
        main: 'Proyecciones a corteza motora primaria/premotora.',
        pathway: 'Transmite se\u00f1ales correctivas cerebelosas para ejecuci\u00f3n motora refinada.',
        involvedStructures: ['Corteza motora primaria', 'Corteza premotora'],
        functionRole: 'Mejora coordinaci\u00f3n y suavidad del movimiento voluntario.',
      },
    ],
    learningHighlights: [
      'Relaciona feedback cerebeloso con output cortical motor.',
      'Clave en aprendizaje motor y adaptaci\u00f3n de movimientos.',
    ],
  },

  thalamusazul: {
    name: 'VPM / VPL',
    overview: 'Complejo somatosensorial ventroposterior para cara, gusto y cuerpo.',
    functionCore: 'Retransmite sensibilidad som\u00e1tica y gustativa hacia corteza somatosensorial consciente.',
    afferences: [
      {
        label: 'VPM: trig\u00e9mino y gusto',
        main: 'Lemnisco trigeminal y v\u00edas gustativas del tronco encef\u00e1lico.',
        pathway: 'Conduce sensibilidad facial y componentes gustativos hacia relevo tal\u00e1mico medial.',
        involvedStructures: ['N\u00facleos trigeminales', 'N\u00facleo del tracto solitario', 'Tronco encef\u00e1lico superior'],
        functionRole: 'Percepci\u00f3n consciente de tacto facial y gusto.',
        originOffset: [-0.12, 0.09, 0.06],
      },
      {
        label: 'VPL: lemnisco medial/espinal',
        main: 'Entradas de v\u00edas de tacto fino, propiocepci\u00f3n y dolor/temperatura corporal.',
        pathway: 'Recibe fibras de columnas dorsales y sistema anterolateral para sensibilidad del cuerpo.',
        involvedStructures: ['Lemnisco medial', 'Tracto espinotal\u00e1mico', 'Bulbo y m\u00e9dula espinal'],
        functionRole: 'Percepci\u00f3n som\u00e1tica corporal consciente.',
        originOffset: [0.14, 0.07, -0.08],
      },
    ],
    efferences: [
      {
        label: 'VPM: salida somatosensorial facial',
        main: 'Proyecciones a corteza somatosensorial primaria (territorio facial).',
        pathway: 'Distribuye informaci\u00f3n sensorial facial hacia \u00e1reas 3,1,2 para discriminaci\u00f3n consciente.',
        involvedStructures: ['Giro postcentral (S1)', '\u00c1reas 3,1,2'],
        functionRole: 'Mapa somatot\u00f3pico de sensibilidad facial.',
        originOffset: [-0.1, 0.12, 0.02],
      },
      {
        label: 'VPL: salida somatosensorial corporal',
        main: 'Proyecciones a corteza somatosensorial primaria (tronco y extremidades).',
        pathway: 'Env\u00eda relevo corporal som\u00e1tico a S1 para integraci\u00f3n perceptiva y propioceptiva.',
        involvedStructures: ['Giro postcentral (S1)', 'Corteza parietal somatosensorial'],
        functionRole: 'Mapa corporal somatot\u00f3pico y consciencia sensitiva.',
        originOffset: [0.13, 0.11, -0.06],
      },
    ],
    learningHighlights: [
      'VPM se asocia a cara/gusto; VPL al cuerpo.',
      'Lesiones pueden causar hipoestesia contralateral o s\u00edndromes sensoriales tal\u00e1micos.',
    ],
  },

  thalamusblanco: {
    name: 'Intralaminar',
    overview: 'Grupo tal\u00e1mico medial con proyecci\u00f3n cortical difusa y rol arousal-atenci\u00f3n.',
    functionCore: 'Modula estado de alerta, consciencia y facilitaci\u00f3n de respuesta cortical global.',
    afferences: [
      {
        label: 'Entrada reticular y nociceptiva difusa',
        main: 'Formaci\u00f3n reticular y fasc\u00edculos espinotal\u00e1mico/trigeminotal\u00e1mico.',
        pathway: 'Integra se\u00f1ales de activaci\u00f3n troncoencef\u00e1lica y carga sensorial difusa.',
        involvedStructures: ['Formaci\u00f3n reticular', 'Sistema espinotal\u00e1mico', 'Sistema trigeminotal\u00e1mico'],
        functionRole: 'Eleva excitabilidad cortical y prioridad de est\u00edmulos relevantes.',
      },
    ],
    efferences: [
      {
        label: 'Salida cortical difusa',
        main: 'Proyecciones amplias a corteza cerebral y cuerpo estriado v\u00eda red tal\u00e1mica.',
        pathway: 'Distribuye se\u00f1al de modulaci\u00f3n global para atenci\u00f3n sostenida y preparaci\u00f3n conductual.',
        involvedStructures: ['Corteza cerebral difusa', 'Cuerpo estriado', 'N\u00facleos tal\u00e1micos asociados'],
        functionRole: 'Sost\u00e9n de vigilia, atenci\u00f3n y respuesta adaptativa.',
      },
    ],
    learningHighlights: [
      'Conectado al sistema activador reticular ascendente.',
      'Alteraciones pueden impactar nivel de alerta y procesamiento atencional.',
    ],
  },

  thalamusvioleta: {
    name: 'Geniculados / Pulvinar',
    overview: 'Complejo sensorial-asociativo posterior: auditivo (CGM), visual (CGL) y asociativo atencional (pulvinar).',
    functionCore: 'Integra procesamiento auditivo y visual con selecci\u00f3n atencional multimodal.',
    afferences: [
      {
        label: 'CGM: v\u00eda auditiva ascendente',
        main: 'Entrada desde col\u00edculo inferior y lemnisco lateral.',
        pathway: 'Recibe se\u00f1ales auditivas binaurales para relevo temporal superior.',
        involvedStructures: ['Col\u00edculo inferior', 'Lemnisco lateral', 'V\u00edas auditivas del tronco'],
        functionRole: 'An\u00e1lisis temporal/frecuencial auditivo tal\u00e1mico.',
        originOffset: [-0.18, 0.08, 0.1],
      },
      {
        label: 'CGL: entrada visual retiniana',
        main: 'Entrada desde tracto \u00f3ptico (retina).',
        pathway: 'Recibe informaci\u00f3n visual contralateral organizada retinot\u00f3picamente.',
        involvedStructures: ['Tracto \u00f3ptico', 'Retina', 'Quiasma \u00f3ptico'],
        functionRole: 'Relevo visual principal hacia corteza occipital.',
        originOffset: [0.12, 0.12, -0.1],
      },
      {
        label: 'Pulvinar: entrada asociativa',
        main: 'Aferencias de corteza de asociaci\u00f3n y otros n\u00facleos tal\u00e1micos.',
        pathway: 'Integra se\u00f1ales visuales-atencionales de redes parieto-temporo-occipitales.',
        involvedStructures: ['Corteza parietal', 'Corteza temporal', 'Corteza occipital', 'N\u00facleos tal\u00e1micos asociados'],
        functionRole: 'Selecci\u00f3n de est\u00edmulos y orientaci\u00f3n atencional.',
        originOffset: [0, 0.14, 0.14],
      },
    ],
    efferences: [
      {
        label: 'CGM: salida auditiva cortical',
        main: 'Radiaciones auditivas al giro temporal superior.',
        pathway: 'Transfiere relevo auditivo hacia corteza auditiva primaria/secundaria.',
        involvedStructures: ['Giro temporal superior', 'Corteza auditiva'],
        functionRole: 'Percepci\u00f3n consciente del sonido y an\u00e1lisis auditivo cortical.',
        originOffset: [-0.2, 0.1, 0.06],
      },
      {
        label: 'CGL: salida visual cortical',
        main: 'Radiaci\u00f3n \u00f3ptica hacia corteza visual occipital.',
        pathway: 'Env\u00eda informaci\u00f3n visual retinot\u00f3pica a \u00e1reas calcarinas y occipitales laterales.',
        involvedStructures: ['Pericalcarina (V1)', 'Corteza occipital lateral'],
        functionRole: 'Procesamiento visual consciente del campo opuesto.',
        originOffset: [0.16, 0.11, -0.08],
      },
      {
        label: 'Pulvinar: salida de asociaci\u00f3n',
        main: 'Proyecciones difusas a redes parieto-temporo-occipitales.',
        pathway: 'Modula sincron\u00eda atencional y comunicaci\u00f3n entre \u00e1reas de asociaci\u00f3n.',
        involvedStructures: ['Parietal asociativo', 'Temporal asociativo', 'Occipital asociativo'],
        functionRole: 'Control atencional visual y selecci\u00f3n de saliencia.',
        originOffset: [0.05, 0.14, 0.14],
      },
    ],
    learningHighlights: [
      'CGM = auditivo, CGL = visual, pulvinar = atenci\u00f3n asociativa.',
      'El pulvinar participa en integraci\u00f3n visuoatencional de alto nivel.',
    ],
  },
}

export function getThalamusSelectionInfo(nucleusId: string): ThalamusSelectionInfo | null {
  const nucleus = THALAMUS_NUCLEI[nucleusId]
  if (!nucleus) return null
  return {
    id: nucleusId,
    name: nucleus.name,
    kind: 'nucleus',
    overview: nucleus.overview,
    functionCore: nucleus.functionCore,
    afferences: nucleus.afferences,
    efferences: nucleus.efferences,
    learningHighlights: nucleus.learningHighlights,
  }
}

const THALAMUS_REFERENCE_PIECES: Record<string, ThalamusReferenceInfo> = {
  pineal: {
    name: 'Glándula Pineal',
    overview: 'Estructura epitalámica posterior relacionada con ritmos circadianos.',
    functionCore: 'Secreta melatonina y modula sincronización sueño-vigilia.',
    learningHighlights: [
      'Integra señales de luz ambiental a través del sistema retinohipotalámico.',
      'Participa en cronobiología y regulación neuroendocrina.',
    ],
  },
  adhesiointerthalamica: {
    name: 'Adhesión Intertalámica',
    overview: 'Puente de sustancia gris entre ambos tálamos, variable entre individuos.',
    functionCore: 'No se considera un relevo principal, pero puede reflejar organización intertalámica.',
    learningHighlights: [
      'Su presencia/tamaño es anatómicamente variable.',
      'Útil como referencia topográfica de línea media.',
    ],
  },
  epitalamo: {
    name: 'Región Epitalámica',
    overview: 'Zona dorsal del diencéfalo asociada a integración límbica y autónoma.',
    functionCore: 'Conecta funciones neuroendocrinas y ritmos biológicos con circuitos diencefálicos.',
    learningHighlights: [
      'Incluye estructuras relacionadas con habénula y pineal.',
      'Interfaz entre control autonómico, motivacional y cronobiológico.',
    ],
  },
}

function normalizeMeshName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '')
}

export function getThalamusMeshColor(meshName: string | null): string | null {
  if (!meshName) return null

  const normalized = normalizeMeshName(meshName)
  if (normalized in THALAMUS_PIECE_PALETTE) {
    return THALAMUS_PIECE_PALETTE[normalized as keyof typeof THALAMUS_PIECE_PALETTE]
  }

  const matchedKey = Object.keys(THALAMUS_PIECE_PALETTE).find((key) => normalized.includes(key))
  return matchedKey ? THALAMUS_PIECE_PALETTE[matchedKey as keyof typeof THALAMUS_PIECE_PALETTE] : null
}

function humanizeMeshName(value: string): string {
  const raw = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!raw) return 'Pieza de referencia'
  return raw
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getThalamusSelectionInfoFromMesh(meshName: string | null): ThalamusSelectionInfo | null {
  if (!meshName) return null
  const key = normalizeMeshName(meshName)
  const nucleus = THALAMUS_NUCLEI[key]
  if (nucleus) {
    return {
      id: key,
      name: nucleus.name,
      kind: 'nucleus',
      overview: nucleus.overview,
      functionCore: nucleus.functionCore,
      afferences: nucleus.afferences,
      efferences: nucleus.efferences,
      learningHighlights: nucleus.learningHighlights,
    }
  }

  const refKey = Object.keys(THALAMUS_REFERENCE_PIECES).find((candidate) => key.includes(candidate))
  const ref = refKey ? THALAMUS_REFERENCE_PIECES[refKey] : null
  if (ref) {
    return {
      id: key,
      name: ref.name,
      kind: 'reference',
      overview: ref.overview,
      functionCore: ref.functionCore,
      afferences: [],
      efferences: [],
      learningHighlights: ref.learningHighlights,
    }
  }

  return {
    id: key,
    name: humanizeMeshName(meshName),
    kind: 'reference',
    overview: 'Referencia anatómica complementaria del complejo talámico en esta escena.',
    functionCore: 'Aporta contexto espacial para comprender relaciones entre núcleos, vías y estructuras vecinas.',
    afferences: [],
    efferences: [],
    learningHighlights: [
      'Úsala como punto de orientación topográfica durante el estudio del tálamo.',
      'Relaciona su posición con núcleos cercanos para inferir función regional.',
    ],
  }
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
