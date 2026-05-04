import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  OrbitControls,
  type OrbitControlsProps,
} from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { MOUSE, Vector3, Plane, Box3, Sphere, MathUtils, Raycaster } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { easing } from 'maath'
import ThalamusPlaceholder from './components/ThalamusPlaceholder'
import ConnectionLine from './components/ConnectionLine'
import ModelLoader, { CONNECTION_NODE_MAP } from './components/ModelLoader'
import Pin from './components/Pin'
import ExternalTargetIndicator from './components/ExternalTargetIndicator'
import CameraControls from './components/CameraControls'
import connectionsData from '../data/connections.json'
import type {
  ConnectionVisibilityMode,
  ConnectionWithType,
  ConnectionsSchema,
  Vec3,
  ViewSettings,
} from './types/connections'
import type { SelectedPieceInfo } from './types/pieceInfo'
import './Scene.css'

const connections = connectionsData as unknown as ConnectionsSchema

// Si aún no se ha subido `brain_final.glb`, usar el GLB existente en `public/models/brain.glb`
const THALAMUS_MODEL_URL = '/models/brain.glb'

// Mapping is provided by `ModelLoader.CONNECTION_NODE_MAP` for cortex node names.

type CameraGoal = {
  target: Vec3
  position: Vec3
}

type QuickViewPreset = 'isometric' | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'

// Target placeholders removed in favour of dynamic geometry & pins.

function buildFocusGoal(controls: OrbitControlsImpl, organPosition: Vec3, pieceRadius?: number): CameraGoal {
  const target = controls.target.clone()
  const cameraPosition = controls.object.position.clone()
  const direction = cameraPosition.sub(target)
  const distance = direction.length()

  if (distance < 0.0001) {
    return {
      target: organPosition,
      position: [organPosition[0] + 1.3, organPosition[1] + 0.85, organPosition[2] + 1.35],
    }
  }

  direction.normalize()

  // If a piece radius is provided, compute a safe distance that frames the piece
  if (pieceRadius && pieceRadius > 0.0001) {
    const cameraObject = controls.object
    const fovDeg = 'fov' in cameraObject ? (cameraObject.fov as number) : 48
    const fovRad = MathUtils.degToRad(fovDeg)
    const safeDistance = (pieceRadius / Math.sin(fovRad / 2)) * 1.75
    const nextTarget = new Vector3(organPosition[0], organPosition[1], organPosition[2])
    const targetShift = target.distanceTo(nextTarget)
    // Preserve zoom context when selecting neighboring pieces to avoid sudden zoom-out.
    const nearbySelectionThreshold = Math.max(0.45, pieceRadius * 4)
    const shouldPreserveLocalZoom = targetShift <= nearbySelectionThreshold
    const nextDistance = shouldPreserveLocalZoom ? Math.min(distance, safeDistance) : safeDistance
    const nextPosition = nextTarget.clone().add(direction.multiplyScalar(nextDistance))
    return {
      target: organPosition,
      position: [nextPosition.x, nextPosition.y, nextPosition.z],
    }
  }

  // Keep relative viewing direction to avoid sudden flips while approaching the selected organ.
  const desiredDistance = Math.min(4.2, Math.max(1.7, distance * 0.58))
  const nextPosition = new Vector3(organPosition[0], organPosition[1], organPosition[2]).add(
    direction.multiplyScalar(desiredDistance),
  )

  return {
    target: organPosition,
    position: [nextPosition.x, nextPosition.y, nextPosition.z],
  }
}

type CameraAnimatorProps = {
  controlsRef: RefObject<OrbitControlsImpl | null>
  goal: CameraGoal | null
  onSettled: () => void
}

function CameraAnimator({ controlsRef, goal, onSettled }: CameraAnimatorProps) {
  const { camera } = useThree()
  const targetVec = useMemo(() => new Vector3(), [])
  const positionVec = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    if (!goal || !controlsRef.current) {
      return
    }

    targetVec.set(goal.target[0], goal.target[1], goal.target[2])
    positionVec.set(goal.position[0], goal.position[1], goal.position[2])

    easing.damp3(controlsRef.current.target, goal.target, 0.22, delta)
    easing.damp3(camera.position, goal.position, 0.22, delta)
    controlsRef.current.update()

    if (
      controlsRef.current.target.distanceTo(targetVec) < 0.02 &&
      camera.position.distanceTo(positionVec) < 0.03
    ) {
      onSettled()
    }
  })

  return null
}

function CanvasPointerManager({ onPointerMissed }: { onPointerMissed: () => void }) {
  const { gl, camera, scene } = useThree()

  useEffect(() => {
    if (!gl || !camera) return

    const rc = new Raycaster()

    const handler = (ev: PointerEvent) => {
      try {
        const rect = gl.domElement.getBoundingClientRect()
        const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
        const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
        rc.setFromCamera({ x, y } as any, camera)
        const intersects = rc.intersectObjects(scene.children, true)
        if (!intersects || intersects.length === 0) {
          onPointerMissed()
        }
      } catch (e) {
        // ignore
      }
    }

    gl.domElement.addEventListener('pointerdown', handler)
    return () => gl.domElement.removeEventListener('pointerdown', handler)
  }, [gl, camera, scene, onPointerMissed])

  return null
}

type SceneProps = {
  selectedConnection: ConnectionWithType | null
  onSelectConnection: (connection: ConnectionWithType | null) => void
  onSelectedPieceInfoChange?: (pieceInfo: SelectedPieceInfo | null) => void
  viewSettings: ViewSettings
  clippingEnabled?: boolean
  onModelBoundsComputed?: (bounds: { halfHeight: number; halfWidth: number }) => void
}

const THALAMIC_NUCLEUS_DIRECTIONS: Record<string, Vec3> = {
  anterior: [0.0, 0.16, 0.08],
  dorsomedial: [0.08, 0.1, 0.04],
  dorsal_lateral: [0.12, 0.06, 0.02],
  ventral_anterior: [0.1, -0.04, 0.04],
  ventral_lateral: [0.14, -0.08, 0.02],
  vpm: [0.06, -0.14, 0.08],
  vpl: [0.1, -0.14, 0.04],
  intralaminar: [0.02, 0.04, 0.0],
  geniculado_medial: [0.08, -0.08, -0.12],
  geniculado_lateral: [0.12, -0.06, -0.14],
}

const THALAMIC_EFFERENT_START_DIRECTIONS: Record<string, Vec3> = {
  anterior: [0.1, 0.22, 0.16],
  dorsomedial: [0.18, 0.14, 0.08],
  dorsal_lateral: [0.24, 0.08, 0.04],
  ventral_anterior: [0.2, -0.04, 0.12],
  ventral_lateral: [0.24, -0.08, 0.1],
  vpm: [0.2, -0.16, 0.1],
  vpl: [0.24, -0.18, 0.08],
  intralaminar: [0.14, 0.02, 0.06],
  geniculado_medial: [0.24, -0.08, -0.14],
  geniculado_lateral: [0.28, -0.06, -0.18],
}

const EFERENT_FALLBACK_NODE_TOKENS: Record<string, string[]> = {
  geniculado_medial: ['superiortemporal', 'transversetemporal', 'middletemporal', 'temporalpole'],
  geniculado_lateral: ['pericalcarine', 'lateraloccipital', 'cuneus', 'lingual'],
  vpm: ['postcentral', 'paracentral'],
  vpl: ['postcentral', 'paracentral'],
  ventral_anterior: ['precentral', 'superiorfrontal'],
  ventral_lateral: ['precentral', 'superiorfrontal'],
}

type AfferentSpec = {
  id: string
  nucleusId: string
  nombre: string
  infoText: string
  externalTargets?: string[]
  sourceDirection: Vec3
  sourceDistanceMultiplier: number
}

const AFFERENT_SPECS: AfferentSpec[] = [
  {
    id: 'af_anterior_mamilar',
    nucleusId: 'anterior',
    nombre: 'Cuerpos Mamilares / Hipotálamo',
    infoText: 'Aferencia hacia el núcleo anterior desde fascículo mamilotalámico, giro del cíngulo e hipotálamo. Este circuito participa en tono emocional y memoria reciente.',
    externalTargets: ['Fascículo mamilotalámico', 'Giro del cíngulo', 'Hipotálamo'],
    sourceDirection: [0.72, 0.42, 0.18],
    sourceDistanceMultiplier: 1.55,
  },
  {
    id: 'af_dorsomedial_hipotalamo',
    nucleusId: 'dorsomedial',
    nombre: 'Hipotálamo / Área Olfatoria',
    infoText: 'Aferencia hacia el núcleo dorsomedial desde corteza prefrontal, hipotálamo y otros núcleos talámicos. Se asocia con integración de información somática, visceral y olfatoria vinculada a estados emocionales y subjetivos.',
    externalTargets: ['Corteza prefrontal', 'Hipotálamo', 'Otros núcleos talámicos'],
    sourceDirection: [0.64, 0.34, 0.08],
    sourceDistanceMultiplier: 1.48,
  },
  {
    id: 'af_dorsal_lateral_nucleos',
    nucleusId: 'dorsal_lateral',
    nombre: 'Otros Núcleos Talámicos',
    infoText: 'Aferencia hacia los núcleos dorsal lateral, posterior lateral y pulvinar desde corteza cerebral y otros núcleos talámicos. Corresponde a circuitos de asociación cortical.',
    externalTargets: ['Corteza cerebral', 'Otros núcleos talámicos'],
    sourceDirection: [0.58, 0.2, 0.18],
    sourceDistanceMultiplier: 1.34,
  },
  {
    id: 'af_ventral_anterior_reticular',
    nucleusId: 'ventral_anterior',
    nombre: 'Formación Reticular',
    infoText: 'Aferencia hacia el núcleo ventral anterior desde formación reticular, sustancia negra, cuerpo estriado, corteza premotora y otros núcleos talámicos. Este circuito influye en la actividad de la corteza motora.',
    externalTargets: ['Formación reticular', 'Sustancia negra', 'Cuerpo estriado', 'Corteza premotora', 'Otros núcleos talámicos'],
    sourceDirection: [0.7, -0.18, 0.08],
    sourceDistanceMultiplier: 1.62,
  },
  {
    id: 'af_ventral_lateral_cerebelo',
    nucleusId: 'ventral_lateral',
    nombre: 'Cerebelo / Núcleo Rojo',
    infoText: 'Aferencia hacia el núcleo ventral lateral con patrón similar al ventral anterior, con aporte principal del cerebelo y menor del núcleo rojo. Este circuito influye en la actividad de la corteza motora.',
    externalTargets: ['Cerebelo', 'Núcleo rojo', 'Formación reticular', 'Sustancia negra', 'Cuerpo estriado', 'Corteza premotora', 'Otros núcleos talámicos'],
    sourceDirection: [0.84, -0.36, -0.06],
    sourceDistanceMultiplier: 1.7,
  },
  {
    id: 'af_vpm_tronco',
    nucleusId: 'vpm',
    nombre: 'Tronco Encefálico Superior',
    infoText: 'Aferencia hacia VPM desde lemnisco del trigémino y fibras gustativas. Participa en la retransmisión de sensaciones somáticas hacia la conciencia, con predominio del territorio facial.',
    externalTargets: ['Lemnisco del trigémino', 'Fibras gustativas'],
    sourceDirection: [0.72, -0.3, 0.22],
    sourceDistanceMultiplier: 1.65,
  },
  {
    id: 'af_vpl_lemniscos',
    nucleusId: 'vpl',
    nombre: 'Base de Médula / Tronco',
    infoText: 'Aferencia hacia VPL desde lemniscos medial y espinal. Participa en la retransmisión de sensibilidad somática corporal hacia la conciencia.',
    externalTargets: ['Lemnisco medial', 'Lemnisco espinal'],
    sourceDirection: [0.68, -0.42, 0.14],
    sourceDistanceMultiplier: 1.8,
  },
  {
    id: 'af_intralaminar_reticular',
    nucleusId: 'intralaminar',
    nombre: 'Formación Reticular',
    infoText: 'Aferencia hacia núcleos intralaminares desde formación reticular y fascículos espinotalámico y trigéminotalámico. Se relaciona con modulación de estados de conciencia y alerta.',
    externalTargets: ['Formación reticular', 'Fascículo espinotalámico', 'Fascículo trigéminotalámico'],
    sourceDirection: [0.62, -0.08, 0.04],
    sourceDistanceMultiplier: 1.42,
  },
  {
    id: 'af_geniculado_medial_coliculo',
    nucleusId: 'geniculado_medial',
    nombre: 'Colículo Inferior / Lemnisco Lateral',
    infoText: 'Aferencia hacia cuerpo geniculado medial desde colículo inferior y lemnisco lateral de ambos oídos. Este relevo participa en la vía auditiva.',
    externalTargets: ['Colículo inferior', 'Lemnisco lateral'],
    sourceDirection: [0.68, -0.16, -0.28],
    sourceDistanceMultiplier: 1.58,
  },
  {
    id: 'af_geniculado_lateral_optico',
    nucleusId: 'geniculado_lateral',
    nombre: 'Tracto Óptico / Globo Ocular',
    infoText: 'Aferencia hacia cuerpo geniculado lateral a través del tracto óptico. Este relevo se integra en el procesamiento visual del campo visual opuesto.',
    externalTargets: ['Tracto óptico', 'Globo ocular'],
    sourceDirection: [0.74, -0.06, -0.4],
    sourceDistanceMultiplier: 1.82,
  },
]

function canonicalNodeKey(value: string): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function getNucleusIdForConnection(connection: ConnectionWithType): string {
  const nucleusId = (connection as any).nucleusId as string | undefined
  return nucleusId ?? connection.id
}

function isConnectionVisibleByMode(mode: ConnectionVisibilityMode, tipo: ConnectionWithType['tipo']) {
  if (mode === 'none') return false
  if (mode === 'both') return true
  return mode === tipo
}

function isRightHemisphereName(value: string): boolean {
  return /(^|[.\-_])rh([.\-_]|$)/i.test(value || '')
}

function extractMeshNameTokens(rawName: string): string[] {
  if (!rawName) return []

  const baseName = rawName.split('/').pop()?.split('\\').pop() ?? rawName
  const withoutExt = baseName.replace(/\.(obj|stl|mtl)$/i, '')
  const normalizedCompact = withoutExt
    .toLowerCase()
    .replace(/^(lh|rh)?pialdk/, '')
    .replace(/^(lh|rh)/, '')
  const splitTokens = withoutExt
    .split(/[.\-_ ]+/)
    .map((token) => token.toLowerCase().trim())
    .filter(Boolean)

  const ignored = new Set(['lh', 'rh', 'pial', 'dk', 'obj', 'stl', 'mtl'])
  const filteredTokens = splitTokens.filter((token) => !ignored.has(token))
  const regionToken = filteredTokens.length > 0 ? filteredTokens[filteredTokens.length - 1] : withoutExt.toLowerCase()

  return Array.from(new Set([regionToken, ...filteredTokens, normalizedCompact, withoutExt.toLowerCase()]))
}

function formatPieceName(rawName: string): string {
  const tokens = extractMeshNameTokens(rawName)
  const resolvedRegiónKey = resolveKnowledgeKey(rawName, tokens)
  const regionRaw = resolvedRegiónKey || tokens[0] || 'unknown'
  const hemisphere = rawName.toLowerCase().includes('lh')
    ? 'Hemisferio Izquierdo'
    : rawName.toLowerCase().includes('rh')
      ? 'Hemisferio Derecho'
      : null

  const spaced = regionRaw
    .replace(/^bankssts$/i, 'banks sts')
    .replace(/caudal/gi, ' caudal ')
    .replace(/rostral/gi, ' rostral ')
    .replace(/anterior/gi, ' anterior ')
    .replace(/posterior/gi, ' posterior ')
    .replace(/middle/gi, ' middle ')
    .replace(/superior/gi, ' superior ')
    .replace(/inferior/gi, ' inferior ')
    .replace(/lateral/gi, ' lateral ')
    .replace(/medial/gi, ' medial ')
    .replace(/orbitofrontal/gi, ' orbitofrontal ')
    .replace(/frontal/gi, ' frontal ')
    .replace(/parietal/gi, ' parietal ')
    .replace(/temporal/gi, ' temporal ')
    .replace(/occipital/gi, ' occipital ')
    .replace(/cingulate/gi, ' cingulate ')
    .replace(/calcarine/gi, ' calcarine ')
    .replace(/hippocampal/gi, ' hippocampal ')
    .replace(/isthmus/gi, ' isthmus ')
    .replace(/transverse/gi, ' transverse ')
    .replace(/\s+/g, ' ')
    .trim()

  const title = spaced
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  if (!hemisphere) {
    return title || rawName
  }

  return `${title || rawName} (${hemisphere})`
}

type PieceKnowledge = {
  summary: string
  learningPoints: string[]
}

type ThalamusPieceMeta = {
  center: Vec3
  radius: number
}

const PIECE_KNOWLEDGE_BASE: Record<string, PieceKnowledge> = {
  precentral: {
    summary: 'Corteza motora primaria; participa en la ejecución voluntaria del movimiento, especialmente en control contralateral.',
    learningPoints: [
      'Integra planes motores provenientes de corteza premotora y suplementaria.',
      'Su somatotopía ayuda a interpretar déficits motores focales.',
      'En este proyecto suele aparecer dentro de circuitos talámicos ventrales.',
    ],
  },
  postcentral: {
    summary: 'Corteza somatosensorial primaria; releva tacto, propiocepción y dolor hacia percepción consciente.',
    learningPoints: [
      'Recibe información talámica de VPM/VPL en representación somatotopica.',
      'Su organización en áreas 3, 1 y 2 sustenta discriminación sensitiva fina.',
      'Lesiones pueden producir hipoestesia contralateral y pérdida de discriminación táctil.',
    ],
  },
  superiorfrontal: {
    summary: 'Región frontal superior asociada a control ejecutivo, atención sostenida y planificación.',
    learningPoints: [
      'Contribuye al control top-down de conducta y toma de decisiones.',
      'Tiene interacciones funcionales con circuitos fronto-talámicos.',
      'Relevante para tareas de memoria de trabajo y monitoreo cognitivo.',
    ],
  },
  rostralmiddlefrontal: {
    summary: 'Corteza prefrontal dorsolateral rostral, relacionada con control cognitivo y flexibilidad mental.',
    learningPoints: [
      'Participa en memoria de trabajo y actualización de reglas.',
      'Interviene en inhibición de respuestas automáticas.',
      'Suele integrarse en redes ejecutivas frontoparietales.',
    ],
  },
  caudalmiddlefrontal: {
    summary: 'Subregion prefrontal con papel en planificación de acción y control atencional.',
    learningPoints: [
      'Conecta funciones ejecutivas con selección de respuesta motora.',
      'Importante para organización secuencial de acciones.',
      'Puede participar en síntomas disejecutivos cuando se altera.',
    ],
  },
  medialorbitofrontal: {
    summary: 'Corteza orbitofrontal medial vinculada a valoración emocional y toma de decisiones basada en recompensa.',
    learningPoints: [
      'Integra señales viscerales y afectivas para guiar elecciones.',
      'Participa en regulación socioemocional y aprendizaje por refuerzo.',
      'Su alteración puede afectar juicio y control impulsivo.',
    ],
  },
  lateralorbitofrontal: {
    summary: 'Corteza orbitofrontal lateral asociada con reevaluación de conductas y aprendizaje por castigo.',
    learningPoints: [
      'Contribuye a ajustar decisiones cuando cambian contingencias.',
      'Interviene en supresión de respuestas previamente recompensadas.',
      'Relevante en control de impulsividad y adaptación conductual.',
    ],
  },
  parsopercularis: {
    summary: 'Componente frontal inferior con rol en lenguaje (hemisferio dominante) y control inhibitorio.',
    learningPoints: [
      'Parte funcional del área de Broca en dominante.',
      'También participa en circuitos de control motor del habla.',
      'Puede relacionarse con déficit de fluidez verbal si se lesiona.',
    ],
  },
  parstriangularis: {
    summary: 'Subregion frontal inferior implicada en selección semántica y producción de lenguaje.',
    learningPoints: [
      'Ayuda a recuperar y seleccionar contenido semántico.',
      'Colabora con regiones temporales del lenguaje.',
      'Su afectación puede modificar fluidez y organización verbal.',
    ],
  },
  parsorbitalis: {
    summary: 'Región frontal inferior anterior vinculada a lenguaje, evaluación social y procesamiento afectivo.',
    learningPoints: [
      'Integra información semántica y emocional.',
      'Puede participar en evaluación contextual de conducta social.',
      'Aporta a redes frontolímbicas de control conductual.',
    ],
  },
  superiorparietal: {
    summary: 'Corteza parietal superior asociada a integración visoespacial y coordinacion sensorimotora.',
    learningPoints: [
      'Contribuye al esquema corporal y orientación espacial.',
      'Importante para guiar movimientos dirigidos por visión.',
      'Se integra con redes frontoparietales de atención.',
    ],
  },
  inferiorparietal: {
    summary: 'Corteza parietal inferior involucrada en atención, lenguaje y funciones de integración multisensorial.',
    learningPoints: [
      'Participa en conciencia espacial y orientación atencional.',
      'Puede influir en procesos de lectura y procesamiento simbólico.',
      'Disfunción puede asociarse a negligencia espacial.',
    ],
  },
  supramarginal: {
    summary: 'Giro supramarginal relacionado con integración fonológica, praxis y representación corporal.',
    learningPoints: [
      'Contribuye a procesamiento fonológico del lenguaje.',
      'Interviene en imitación y planeación de gestos.',
      'Puede participar en síntomas de apraxia o alteraciónes fonológicas.',
    ],
  },
  precuneus: {
    summary: 'Región medial parietal clave para imaginería, orientación espacial interna y redes de estado basal.',
    learningPoints: [
      'Participa en memoria autobiográfica y autopercepción.',
      'Contribuye a integración visoespacial de alto nivel.',
      'Nodo relevante de la red por defecto (default mode network).',
    ],
  },
  insula: {
    summary: 'La insula integra interocepción, emoción, dolor y percepción de estados corporales internos.',
    learningPoints: [
      'Conecta señales viscerales con experiencia emocional consciente.',
      'Participa en saliencia y cambio entre redes cognitivas.',
      'Relevante en dolor, ansiedad y regulación autónoma.',
    ],
  },
  parahippocampal: {
    summary: 'Corteza parahipocámpica asociada a memoria contextual y navegación espacial.',
    learningPoints: [
      'Interviene en codificación de escenas y contexto ambiental.',
      'Funcióna en conjunto con hipocampo para memoria episódica.',
      'Importante para reconocimiento espacial y orientación.',
    ],
  },
  entorhinal: {
    summary: 'Corteza entorrinal: puerta de entrada cortical al hipocampo para memoria y navegación.',
    learningPoints: [
      'Transmite información multimodal hacia circuitos hipocámpicos.',
      'Contiene representaciones espaciales (celdas de rejilla).',
      'Es una region vulnerable en etapas tempranas de neurodegeneración.',
    ],
  },
  temporalpole: {
    summary: 'Polo temporal involucrado en memoria semántica, emoción social e integración auditivo-limbica.',
    learningPoints: [
      'Contribuye a representación de conocimiento conceptual.',
      'Participa en procesamiento socioemocional.',
      'Su conectividad lo vincula con redes límbicas y prefrontales.',
    ],
  },
  superiortemporal: {
    summary: 'Giro temporal superior relacionado con audición, lenguaje y análisis de señales sociales.',
    learningPoints: [
      'Incluye cortezas auditivas asociativas.',
      'En dominante, participa en comprensión del lenguaje.',
      'Se integra con vías auditivo-talámicas y temporo-frontales.',
    ],
  },
  middletemporal: {
    summary: 'Giro temporal medio, implicado en semántica, percepción visual de movimiento y memoria.',
    learningPoints: [
      'Contribuye a integración audiovisual y significado semántico.',
      'Participa en reconocimiento de patrónes complejos.',
      'Colabora con redes temporoparietales del lenguaje.',
    ],
  },
  inferiortemporal: {
    summary: 'Giro temporal inferior con papel en reconocimiento de objetos y procesamiento visual de alto nivel.',
    learningPoints: [
      'Interviene en identificación de formas complejas.',
      'Aporta al reconocimiento visual semántico.',
      'Trabaja en conjunto con vías ventrales occipitotemporales.',
    ],
  },
  transversetemporal: {
    summary: 'Giro temporal transverso (Heschl), sede principal de corteza auditiva primaria.',
    learningPoints: [
      'Procesa características tonotopicas básicas del sonido.',
      'Recibe aferencias auditivas tempranas para análisis cortical inicial.',
      'Base para procesamiento posterior del lenguaje y música.',
    ],
  },
  pericalcarine: {
    summary: 'Corteza pericalcarina correspondiente a corteza visual primaria (V1).',
    learningPoints: [
      'Recibe información visual desde vías geniculo-calcarinas.',
      'Mantiene representación retinotopica del campo visual.',
      'Esencial para detección visual elemental.',
    ],
  },
  lateraloccipital: {
    summary: 'Región occipital lateral asociada a reconocimiento de objetos y forma visual.',
    learningPoints: [
      'Participa en análisis de contornos y categorías visuales.',
      'Integra información de vías visuales ventrales.',
      'Contribuye a identificar objetos complejos.',
    ],
  },
  cuneus: {
    summary: 'Región occipital medial vinculada a procesamiento visual básico y atención visual.',
    learningPoints: [
      'Participa en representación de porciones del campo visual.',
      'Contribuye a integración visoespacial temprana.',
      'Puede activarse en tareas de imaginación visual.',
    ],
  },
  lingual: {
    summary: 'Giro lingual implicado en procesamiento visual, color y análisis de patrónes complejos.',
    learningPoints: [
      'Contribuye a procesamiento visual de palabras y escenas.',
      'Participa en funciones visoperceptivas de alto nivel.',
      'Se integra con redes occipitotemporales.',
    ],
  },
  fusiform: {
    summary: 'Giro fusiforme asociado a reconocimiento de caras, objetos y categorías visuales especializadas.',
    learningPoints: [
      'Incluye zonas para reconocimiento facial (hemisferio derecho predominante).',
      'Contribuye al reconocimiento experto de patrónes visuales.',
      'Importante para vías ventrales de identificación visual.',
    ],
  },
  rostralanteriorcingulate: {
    summary: 'Cingulo anterior rostral vinculado a regulación emocional, motivación y monitoreo interno.',
    learningPoints: [
      'Integra componentes afectivos con control cognitivo.',
      'Participa en evaluación de conflicto y esfuerzo.',
      'Conectado con redes límbicas y frontales mediales.',
    ],
  },
  caudalanteriorcingulate: {
    summary: 'Cingulo anterior caudal con función en control cognitivo, dolor y selección de respuesta.',
    learningPoints: [
      'Ayuda a modular respuestas conductuales ante conflicto.',
      'Contribuye a componente motivacional del dolor.',
      'Se integra con circuitos de control ejecutivo.',
    ],
  },
  posteriorcingulate: {
    summary: 'Cingulo posterior, nodo central de la red por defecto y memoria autobiográfica.',
    learningPoints: [
      'Relacionada con orientación interna y recuperación mnésica.',
      'Contribuye a integración de contexto personal.',
      'Participa en dinámica de atención interna-externa.',
    ],
  },
  isthmuscingulate: {
    summary: 'Istmo del cíngulo que conecta cíngulo posterior con regiones parahipocámpicas.',
    learningPoints: [
      'Interfaz entre memoria contextual y redes cinguladas.',
      'Contribuye a continuidad funcional de circuitos límbicos.',
      'Relevante para integración de información autobiográfica.',
    ],
  },
  paracentral: {
    summary: 'Lóbulo paracentral con representación motora y sensitiva de miembros inferiores.',
    learningPoints: [
      'Integra funciones motoras y somatosensoriales mediales.',
      'Clave en control de pierna y pie contralaterales.',
      'Puede relacionarse con funciones esfinterianas en corteza medial.',
    ],
  },
  bankssts: {
    summary: 'Región de los bancos del surco temporal superior, implicada en percepción social y audiovisual.',
    learningPoints: [
      'Participa en procesamiento de voz, mirada y movimiento biológico.',
      'Contribuye a integración multisensorial temporal.',
      'Se vincula con cognición social y lenguaje prosódico.',
    ],
  },
}

const KNOWLEDGE_KEY_ENTRIES = Object.keys(PIECE_KNOWLEDGE_BASE)
  .map((key) => ({ key, canonical: canonicalNodeKey(key) }))
  .sort((a, b) => b.canonical.length - a.canonical.length)

function resolveKnowledgeKey(rawName: string, tokens?: string[]): string | null {
  const candidates = new Set<string>()
  candidates.add(canonicalNodeKey(rawName))
  ;(tokens ?? extractMeshNameTokens(rawName)).forEach((token) => {
    candidates.add(canonicalNodeKey(token))
  })

  for (const candidate of candidates) {
    if (!candidate) continue
    for (const entry of KNOWLEDGE_KEY_ENTRIES) {
      if (candidate === entry.canonical || candidate.includes(entry.canonical)) {
        return entry.key
      }
    }
  }

  return null
}

function buildAcademicPieceInfo(rawName: string): Pick<SelectedPieceInfo, 'infoText' | 'learningPoints'> {
  const tokens = extractMeshNameTokens(rawName)
  const key = resolveKnowledgeKey(rawName, tokens)
  if (key) {
    const entry = PIECE_KNOWLEDGE_BASE[key]
    return {
      infoText: entry.summary,
      learningPoints: entry.learningPoints,
    }
  }

  return {
    infoText: 'Pieza anatómica del modelo 3D usada como referencia de contexto para ubicar redes talamocorticales y su vecindad funcional.',
    learningPoints: [
      'Relaciona su ubicación con vías aferentes y eferentes para interpretar trayectos funcionales.',
      'Evalúa su participación potencial en redes motoras, sensitivas o de asociación según su localización cortical.',
      'Integra la pieza con estructuras adyacentes para comprender organización anatomo-funcional del circuito.',
    ],
  }
}

function isLikelyThalamicMesh(rawName: string): boolean {
  const lower = (rawName || '').toLowerCase()
  return lower.includes('thalam') || lower.includes('talam')
}

function resolveConnectionByObjectName(
  objectName: string,
  map: Map<string, ConnectionWithType>,
): ConnectionWithType | null {
  const candidates = extractMeshNameTokens(objectName)
  for (const candidate of candidates) {
    const found = map.get(canonicalNodeKey(candidate))
    if (found) {
      return found
    }
  }

  return null
}

export default function Scene({
  selectedConnection,
  onSelectConnection,
  onSelectedPieceInfoChange,
  viewSettings,
  clippingEnabled = true,
  onModelBoundsComputed,
}: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const [modelGroup, setModelGroup] = useState<any>(null)
  const [controlsReady, setControlsReady] = useState(false)
  const [cameraGoal, setCameraGoal] = useState<CameraGoal | null>(null)
  const [modelRadiusLocal, setModelRadiusLocal] = useState<number>(2.5)
  const [isAutoRotate, setIsAutoRotate] = useState(false)
  const [activeView, setActiveView] = useState<string | null>(null)
  const [activeQuickView, setActiveQuickView] = useState<QuickViewPreset | null>(null)
  const [modelColor, setModelColor] = useState('#ced8e6')
  const HOME_VIEW_MULTIPLIER = 3.8
  const [manualHighlighted, setManualHighlighted] = useState<string[] | null>(null)
  const [pinsWorld, setPinsWorld] = useState<Record<string, [number, number, number]>>({})
  const [modelCenterWorld, setModelCenterWorld] = useState<Vec3>([0, 0, 0])
  const [thalamusCenterWorld, setThalamusCenterWorld] = useState<Vec3>([0, 0, 0])
  const [thalamusRadiusWorld, setThalamusRadiusWorld] = useState<number>(0.18)
  const [thalamusPieceMap, setThalamusPieceMap] = useState<Record<string, ThalamusPieceMeta>>({})
  const [efferentThalamusPieceByConnection, setEfferentThalamusPieceByConnection] = useState<Record<string, string>>({})
  const [nodeCenterMap, setNodeCenterMap] = useState<Record<string, Vec3>>({})
  const [selectedMeshCenter, setSelectedMeshCenter] = useState<Vec3 | null>(null)
  const [selectedMeshName, setSelectedMeshName] = useState<string | null>(null)
  const MIN_CAMERA_DISTANCE = 0.01
  const boundsComputedRef = useRef(false)
  const controlsReadyRef = useRef(false)

  const handleControlsRef = useCallback((instance: OrbitControlsImpl | null) => {
    controlsRef.current = instance
    const nextReady = Boolean(instance)
    if (controlsReadyRef.current === nextReady) return
    controlsReadyRef.current = nextReady
    setControlsReady(nextReady)
  }, [])

  // MRI-like slab clipping with min/max planes on Y and X.
  const clippingPlaneYMaxRef = useRef(new Plane(new Vector3(0, -1, 0), 0))
  const clippingPlaneYMinRef = useRef(new Plane(new Vector3(0, 1, 0), 0))
  const clippingPlaneXMaxRef = useRef(new Plane(new Vector3(-1, 0, 0), 0))
  const clippingPlaneXMinRef = useRef(new Plane(new Vector3(1, 0, 0), 0))
  const clippingPlanes = useMemo(
    () => (clippingEnabled
      ? [
        clippingPlaneYMaxRef.current,
        clippingPlaneYMinRef.current,
        clippingPlaneXMaxRef.current,
        clippingPlaneXMinRef.current,
      ]
      : []),
    [clippingEnabled],
  )

  useEffect(() => {
    clippingPlaneYMaxRef.current.constant = viewSettings.clippingYMax
  }, [viewSettings.clippingYMax])

  useEffect(() => {
    clippingPlaneYMinRef.current.constant = -viewSettings.clippingYMin
  }, [viewSettings.clippingYMin])

  useEffect(() => {
    clippingPlaneXMaxRef.current.constant = viewSettings.clippingXMax
  }, [viewSettings.clippingXMax])

  useEffect(() => {
    clippingPlaneXMinRef.current.constant = -viewSettings.clippingXMin
  }, [viewSettings.clippingXMin])

  const eferentConnections = useMemo(
    () => connections.eferencias.map((item) => ({ ...item, tipo: 'eferencia' as const })),
    [],
  )

  const efferentById = useMemo(() => {
    const map = new Map<string, ConnectionWithType>()
    eferentConnections.forEach((connection) => map.set(connection.id, connection))
    return map
  }, [eferentConnections])

  const afferentConnections = useMemo(() => {
    return AFFERENT_SPECS.map((spec) => {
      const targetNucleus = efferentById.get(spec.nucleusId)
      const nucleusLocal = targetNucleus?.posicionLocal ?? [0, 0, 0]
      const center = new Vector3(modelCenterWorld[0], modelCenterWorld[1], modelCenterWorld[2])
      const direction = new Vector3(spec.sourceDirection[0], spec.sourceDirection[1], spec.sourceDirection[2]).normalize()
      // Shorten afferent placeholders to keep missing-organ indicators closer to the model.
      const sourceDistance = Math.max(0.6, modelRadiusLocal * spec.sourceDistanceMultiplier * 0.5)
      const sourcePosition = center.clone().add(direction.multiplyScalar(sourceDistance))

      return {
        id: spec.id,
        nucleusId: spec.nucleusId,
        nombre: spec.nombre,
        posicionLocal: nucleusLocal as Vec3,
        posicionDestino: [sourcePosition.x, sourcePosition.y, sourcePosition.z] as Vec3,
        colorLinea: '#2563eb',
        infoText: spec.infoText,
        externalTargets: spec.externalTargets ?? [],
        pin: false,
        tipo: 'aferencia' as const,
      }
    })
  }, [efferentById, modelCenterWorld, modelRadiusLocal])

  const allConnections = useMemo(
    () => [...eferentConnections, ...afferentConnections],
    [eferentConnections, afferentConnections],
  )

  // Compute model bounds once the model group is available and notify parent for slider range.
  useEffect(() => {
    if (!modelGroup || boundsComputedRef.current) return

    try {
      // Ensure world matrices are up-to-date before computing bounds
      modelGroup.updateMatrixWorld(true)

      const box = new Box3().setFromObject(modelGroup)
      const size = box.getSize(new Vector3())
      // Skip early empty/incomplete bounds so clip ranges are not initialized to near-zero.
      if (size.length() < 0.25) {
        return
      }
      const sphere = box.getBoundingSphere(new Sphere())
      const center = box.getCenter(new Vector3())
      // report half height and half width for clipping sliders
      const halfHeight = Math.max(0.001, size.y * 0.58)
      const halfWidth = Math.max(0.001, size.x * 0.5)
      setModelRadiusLocal(Math.max(0.001, sphere.radius))
      setModelCenterWorld([center.x, center.y, center.z])
      onModelBoundsComputed?.({ halfHeight, halfWidth })
      boundsComputedRef.current = true
    } catch (err) {
      // ignore
    }
  }, [modelGroup, onModelBoundsComputed])

  // When model is available, update its world matrices and precompute pin world positions
  useEffect(() => {
    // debug: indicate modelGroup change
    // eslint-disable-next-line no-console
    console.info('[Scene] modelGroup changed:', modelGroup)
    if (!modelGroup) return
    try {
      modelGroup.updateMatrixWorld(true)

      const next: Record<string, [number, number, number]> = {}
      const nodeAccum = new Map<string, { sum: Vector3; count: number }>()
      const nextThalamusPieceMap: Record<string, ThalamusPieceMeta> = {}
      allConnections.forEach((c) => {
        if (c.pin) {
          const local = new Vector3(c.posicionDestino[0], c.posicionDestino[1], c.posicionDestino[2])
          const world = local.clone().applyMatrix4(modelGroup.matrixWorld)
          next[c.id] = [world.x, world.y, world.z]
        }
      })

      modelGroup.traverse((obj: any) => {
        const rawName = obj?.name || ''
        if (!rawName) return
        try {
          const box = new Box3().setFromObject(obj)
          const center = box.getCenter(new Vector3())
          if (!Number.isFinite(center.x) || !Number.isFinite(center.y) || !Number.isFinite(center.z)) return
          const keys = new Set<string>()
          keys.add(canonicalNodeKey(rawName))
          keys.add(canonicalNodeKey(rawName.replace(/\.(obj|stl|mtl)$/i, '')))
          extractMeshNameTokens(rawName).forEach((token) => keys.add(canonicalNodeKey(token)))
          keys.forEach((key) => {
            if (!key) return
            const prev = nodeAccum.get(key)
            if (!prev) {
              nodeAccum.set(key, { sum: center.clone(), count: 1 })
            } else {
              prev.sum.add(center)
              prev.count += 1
            }
          })

          if (obj?.isMesh && isLikelyThalamicMesh(rawName)) {
            const sphere = box.getBoundingSphere(new Sphere())
            nextThalamusPieceMap[rawName] = {
              center: [center.x, center.y, center.z],
              radius: Math.max(0.01, sphere.radius || 0.01),
            }
          }
        } catch {
          // ignore malformed mesh
        }
      })

      // Build thalamus envelope from detected thalamus pieces; fallback to clinical anchors.
      const thalamusPieces = Object.values(nextThalamusPieceMap)
      if (thalamusPieces.length > 0) {
        const center = thalamusPieces
          .reduce((acc, piece) => acc.add(new Vector3(piece.center[0], piece.center[1], piece.center[2])), new Vector3())
          .divideScalar(thalamusPieces.length)
        const maxDist = thalamusPieces.reduce((acc, piece) => {
          const pieceCenter = new Vector3(piece.center[0], piece.center[1], piece.center[2])
          return Math.max(acc, center.distanceTo(pieceCenter) + piece.radius)
        }, 0)
        setThalamusCenterWorld([center.x, center.y, center.z])
        setThalamusRadiusWorld(Math.max(0.08, maxDist))
      } else {
        const eferentPoints: Vector3[] = []
        allConnections.forEach((c) => {
          if (c.tipo !== 'eferencia') return
          const w = new Vector3(c.posicionLocal[0], c.posicionLocal[1], c.posicionLocal[2]).applyMatrix4(modelGroup.matrixWorld)
          eferentPoints.push(w)
        })

        if (eferentPoints.length > 0) {
          const avg = eferentPoints.reduce((acc, value) => acc.add(value), new Vector3()).divideScalar(eferentPoints.length)
          const maxDist = eferentPoints.reduce((acc, value) => Math.max(acc, value.distanceTo(avg)), 0)
          setThalamusCenterWorld([avg.x, avg.y, avg.z])
          setThalamusRadiusWorld(Math.max(0.08, maxDist + modelRadiusLocal * 0.03))
        } else {
          setThalamusCenterWorld(modelCenterWorld)
          setThalamusRadiusWorld(Math.max(0.08, modelRadiusLocal * 0.08))
        }
      }
      setThalamusPieceMap(nextThalamusPieceMap)

      // Assign each efferent nucleus to the closest thalamus piece so line starts are anchored to real model pieces.
      const pieceEntries = Object.entries(nextThalamusPieceMap)
      const nextConnectionPieceMap: Record<string, string> = {}
      if (pieceEntries.length > 0) {
        const remaining = new Set(pieceEntries.map(([name]) => name))
        const efferents = allConnections.filter((connection) => connection.tipo === 'eferencia')
        efferents.forEach((connection) => {
          const anchor = new Vector3(
            connection.posicionLocal[0],
            connection.posicionLocal[1],
            connection.posicionLocal[2],
          ).applyMatrix4(modelGroup.matrixWorld)

          const candidateNames = (remaining.size > 0 ? Array.from(remaining) : pieceEntries.map(([name]) => name))
          let bestName = candidateNames[0]
          let bestDist = Number.POSITIVE_INFINITY
          candidateNames.forEach((name) => {
            const piece = nextThalamusPieceMap[name]
            if (!piece) return
            const c = new Vector3(piece.center[0], piece.center[1], piece.center[2])
            const d = c.distanceTo(anchor)
            if (d < bestDist) {
              bestDist = d
              bestName = name
            }
          })

          if (bestName) {
            nextConnectionPieceMap[connection.id] = bestName
            remaining.delete(bestName)
          }
        })
      }
      setEfferentThalamusPieceByConnection(nextConnectionPieceMap)

      const nextNodeMap: Record<string, Vec3> = {}
      nodeAccum.forEach((entry, key) => {
        const avg = entry.sum.clone().divideScalar(Math.max(1, entry.count))
        nextNodeMap[key] = [avg.x, avg.y, avg.z]
      })
      setNodeCenterMap(nextNodeMap)

      setPinsWorld(next)
      // eslint-disable-next-line no-console
      console.info('[Scene] pinsWorld:', next)

      // dev: dump node names once for mapping verification
      try {
        const names: string[] = []
        modelGroup.traverse((obj: any) => {
          if (obj.name) names.push(obj.name)
        })
        // eslint-disable-next-line no-console
        console.info('[Scene] Model node names:', names.slice(0, 400))
      } catch (e) {
        // ignore
      }
    } catch (err) {
      // ignore
    }
  }, [modelGroup, allConnections, modelCenterWorld, modelRadiusLocal, viewSettings.explodeAmount])

  // Build a reverse map from node name (lowercased) -> connection id for quick lookup on mesh click
  const nodeNameToConnection = useMemo(() => {
    const map = new Map<string, ConnectionWithType>()
    allConnections.forEach((c) => {
      const nodes: string[] | undefined = c.tipo === 'eferencia' ? ((c as any).mappedNodes as string[] | undefined) : undefined
      const mapped = nodes ?? (CONNECTION_NODE_MAP[c.id] as string[] | undefined)
      if (mapped && mapped.length > 0) {
        mapped.forEach((n) => {
          extractMeshNameTokens(n || '').forEach((candidate) => {
            map.set(canonicalNodeKey(candidate), c)
          })
          map.set(canonicalNodeKey(n || ''), c)
          map.set(canonicalNodeKey((n || '').replace(/\.(obj|stl|mtl)$/i, '')), c)
        })
      }
    })

    Object.entries(efferentThalamusPieceByConnection).forEach(([connectionId, pieceName]) => {
      const connection = allConnections.find((c) => c.id === connectionId)
      if (!connection) return
      map.set(canonicalNodeKey(pieceName), connection)
      extractMeshNameTokens(pieceName).forEach((candidate) => {
        map.set(canonicalNodeKey(candidate), connection)
      })
    })

    return map
  }, [allConnections, efferentThalamusPieceByConnection])

  // Set an initial camera position relative to the model bounds once both model and controls are ready.
  const initialPositionSetRef = useRef(false)

  function applyHomeView(multiplier = HOME_VIEW_MULTIPLIER) {
    if (!controlsRef.current || !modelGroup) return

    try {
      const brainNode = modelGroup.getObjectByName('Brain_Model') ?? modelGroup
      const box = new Box3().setFromObject(brainNode)
      const center = box.getCenter(new Vector3())
      const sphere = box.getBoundingSphere(new Sphere())

      const cameraObject = controlsRef.current.object
      const fovDeg = 'fov' in cameraObject ? (cameraObject.fov as number) : 48
      const fovRad = MathUtils.degToRad(fovDeg)
      const safeDistance = (sphere.radius / Math.sin(fovRad / 2)) * multiplier

      const controls = controlsRef.current
      controls.object.position.set(center.x, center.y, center.z + safeDistance)
      controls.target.set(center.x, center.y, center.z)
      controls.update()
      controls.saveState()

      setCameraGoal({
        target: [center.x, center.y, center.z],
        position: [center.x, center.y, center.z + safeDistance],
      })
    } catch (err) {
      // ignore
    }
  }

  useEffect(() => {
    if (initialPositionSetRef.current) return
    if (!modelGroup || !controlsReady || !controlsRef.current) return
    if (selectedConnection) return

    applyHomeView(HOME_VIEW_MULTIPLIER)
    initialPositionSetRef.current = true
  }, [modelGroup, controlsReady, selectedConnection])

  useEffect(() => {
    if (selectedConnection) {
      return
    }

    setActiveView(null)
    setManualHighlighted(null)
  }, [selectedConnection])


  const handleSelectConnection = (
    connection: ConnectionWithType,
    organPosition: Vec3,
    pieceRadius?: number,
    pieceName?: string | null,
  ) => {
    onSelectConnection(connection)
    setActiveView(connection.id)
    onSelectedPieceInfoChange?.({
      name: pieceName ?? connection.nombre,
      tier: connection.tipo,
      infoText: connection.infoText,
    })

    if (!controlsRef.current) {
      return
    }

    setActiveQuickView(null)
    setCameraGoal(buildFocusGoal(controlsRef.current, organPosition, pieceRadius))
  }

  function applyQuickView(view: QuickViewPreset) {
    if (!controlsRef.current || !modelGroup) return

    try {
      const brainNode = modelGroup.getObjectByName('Brain_Model') ?? modelGroup
      const box = new Box3().setFromObject(brainNode)
      const center = box.getCenter(new Vector3())
      const sphere = box.getBoundingSphere(new Sphere())

      const cameraObject = controlsRef.current.object
      const fovDeg = 'fov' in cameraObject ? (cameraObject.fov as number) : 48
      const fovRad = MathUtils.degToRad(fovDeg)
      const safeDistance = (sphere.radius / Math.sin(fovRad / 2)) * 2.35

      const directions: Record<QuickViewPreset, Vector3> = {
        isometric: new Vector3(1, 1, 1).normalize(),
        front: new Vector3(0, 0, 1),
        back: new Vector3(0, 0, -1),
        left: new Vector3(-1, 0, 0),
        right: new Vector3(1, 0, 0),
        top: new Vector3(0, 1, 0),
        bottom: new Vector3(0, -1, 0),
      }

      const direction = directions[view] ?? directions.isometric
      const nextPosition = center.clone().add(direction.multiplyScalar(safeDistance))

      setCameraGoal({
        target: [center.x, center.y, center.z],
        position: [nextPosition.x, nextPosition.y, nextPosition.z],
      })

      setActiveQuickView(view)
      setIsAutoRotate(false)
    } catch (err) {
      // ignore
    }
  }

  const orbitControlsProps: OrbitControlsProps = {
    enableDamping: true,
    dampingFactor: 0.08,
    enablePan: true,
    enableZoom: true,
    screenSpacePanning: true,
    mouseButtons: {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    },
    autoRotate: isAutoRotate,
    autoRotateSpeed: 0.8,
    makeDefault: false,
  }

  const handleGoHome = () => {
    onSelectConnection(null)
    setActiveView(null)
    setSelectedMeshCenter(null)
    setSelectedMeshName(null)
    onSelectedPieceInfoChange?.(null)
    setCameraGoal(null)
    applyHomeView(HOME_VIEW_MULTIPLIER)
    setActiveQuickView(null)
  }

  const handleStepZoom = (factor: number) => {
    if (!controlsRef.current) {
      return
    }

    const controls = controlsRef.current
    const target = controls.target.clone()
    const direction = controls.object.position.clone().sub(target)
    const currentDistance = direction.length()
    const minDistance = MIN_CAMERA_DISTANCE
    const maxDistance = Math.max(minDistance + 0.1, modelRadiusLocal * 7)

    const unclamped = currentDistance * factor
    const nextDistance = Math.max(minDistance, Math.min(maxDistance, unclamped))

    direction.normalize().multiplyScalar(nextDistance)
    const nextPosition = target.clone().add(direction)

    setCameraGoal({
      target: [target.x, target.y, target.z],
      position: [nextPosition.x, nextPosition.y, nextPosition.z],
    })
  }

  const clearSelection = () => {
    onSelectConnection(null)
    setActiveView(null)
    setManualHighlighted(null)
    setSelectedMeshCenter(null)
    setSelectedMeshName(null)
    onSelectedPieceInfoChange?.(null)
  }

  const toWorld = (position: Vec3): Vec3 => {
    if (!modelGroup) {
      return position
    }
    const local = new Vector3(position[0], position[1], position[2])
    const world = local.clone().applyMatrix4(modelGroup.matrixWorld)
    return [world.x, world.y, world.z]
  }

  const getThalamusOriginForConnection = (connection: ConnectionWithType, endpoint?: Vec3): Vec3 => {
    const nucleusId = getNucleusIdForConnection(connection)
    const pieceName = efferentThalamusPieceByConnection[nucleusId]
    const piece = pieceName ? thalamusPieceMap[pieceName] : undefined
    if (piece) {
      const pieceCenter = new Vector3(piece.center[0], piece.center[1], piece.center[2])
      const target = endpoint
        ? new Vector3(endpoint[0], endpoint[1], endpoint[2])
        : new Vector3(...toWorld(connection.posicionLocal))
      let dir = target.clone().sub(pieceCenter)
      if (dir.lengthSq() <= 0.000001) {
        dir = pieceCenter.clone().sub(new Vector3(thalamusCenterWorld[0], thalamusCenterWorld[1], thalamusCenterWorld[2]))
      }
      if (dir.lengthSq() <= 0.000001) {
        dir = new Vector3(1, 0, 0)
      }
      const point = pieceCenter.clone().add(dir.normalize().multiplyScalar(Math.max(0.01, piece.radius * 0.96)))
      return [point.x, point.y, point.z]
    }

    const center = new Vector3(thalamusCenterWorld[0], thalamusCenterWorld[1], thalamusCenterWorld[2])
    const mappedNodes = connection.tipo === 'eferencia'
      ? (((connection as any).mappedNodes as string[] | undefined) ?? CONNECTION_NODE_MAP[nucleusId] ?? [])
      : []
    const hasRightHemisphereTarget = mappedNodes.some((name) => isRightHemisphereName(name))

    const fallbackTarget = new Vector3(...toWorld(connection.posicionLocal))
    const target = endpoint ? new Vector3(endpoint[0], endpoint[1], endpoint[2]) : fallbackTarget
    let dirToTarget = target.clone().sub(center)
    if (dirToTarget.lengthSq() <= 0.000001) {
      dirToTarget = fallbackTarget.clone().sub(center)
    }

    const nucleusDirRaw = THALAMIC_EFFERENT_START_DIRECTIONS[nucleusId] ?? THALAMIC_NUCLEUS_DIRECTIONS[nucleusId]
    const nucleusDir = nucleusDirRaw ? new Vector3(nucleusDirRaw[0], nucleusDirRaw[1], nucleusDirRaw[2]) : new Vector3(0.18, 0, 0.08)
    if (hasRightHemisphereTarget) {
      nucleusDir.x = Math.abs(nucleusDir.x) + 0.06
    }

    const mixedDir = new Vector3()
      .add(dirToTarget.normalize().multiplyScalar(0.68))
      .add(nucleusDir.normalize().multiplyScalar(0.94))
      .normalize()

    const radius = Math.max(0.08, thalamusRadiusWorld * 0.94)
    const point = center.clone().add(mixedDir.multiplyScalar(radius))
    return [point.x, point.y, point.z]
  }

  const getConnectionTargetForLine = (connection: ConnectionWithType): Vec3 => {
    const mapped = connection.tipo === 'eferencia'
      ? (((connection as any).mappedNodes as string[] | undefined) ?? CONNECTION_NODE_MAP[connection.id])
      : undefined

    if (!mapped || mapped.length === 0) {
      const pinned = pinsWorld[connection.id]
      return pinned ?? toWorld(connection.posicionDestino)
    }

    const rightCenters: Vector3[] = []
    const centers: Vector3[] = []
    mapped.forEach((name) => {
      const targetBucket = isRightHemisphereName(name) ? rightCenters : centers
      const keys = new Set<string>()
      keys.add(canonicalNodeKey(name))
      keys.add(canonicalNodeKey((name || '').replace(/\.(obj|stl|mtl)$/i, '')))
      extractMeshNameTokens(name || '').forEach((token) => keys.add(canonicalNodeKey(token)))
      keys.forEach((key) => {
        const c = nodeCenterMap[key]
        if (c) targetBucket.push(new Vector3(c[0], c[1], c[2]))
      })
    })
    const resolvedCenters = rightCenters.length > 0 ? rightCenters : centers

    if (resolvedCenters.length === 0) {
      const fallbackTokens = EFERENT_FALLBACK_NODE_TOKENS[connection.id] ?? []
      fallbackTokens.forEach((token) => {
        const c = nodeCenterMap[canonicalNodeKey(token)]
        if (c) resolvedCenters.push(new Vector3(c[0], c[1], c[2]))
      })
    }

    if (resolvedCenters.length === 0) {
      const pinned = pinsWorld[connection.id]
      return pinned ?? toWorld(connection.posicionDestino)
    }

    const avg = resolvedCenters.reduce((acc, value) => acc.add(value), new Vector3()).divideScalar(resolvedCenters.length)
    return [avg.x, avg.y, avg.z]
  }

  const dimOpacity = activeView ? 0.1 : 1
  const EFERENT_COLOR = '#ef4444'
  const AFFERENT_COLOR = '#2563eb'
  const UNMAPPED_COLOR = '#eab308'
  const activeHighlightColor = selectedConnection
    ? selectedConnection.tipo === 'eferencia'
      ? EFERENT_COLOR
      : AFFERENT_COLOR
    : manualHighlighted
      ? UNMAPPED_COLOR
      : AFFERENT_COLOR
  const selectedConnectionHighlightNames = useMemo(() => {
    if (!selectedConnection) return null
    const nucleusId = getNucleusIdForConnection(selectedConnection)
    const cortexNames = (((selectedConnection as any).mappedNodes as string[] | undefined)
      ?? CONNECTION_NODE_MAP[nucleusId]
      ?? [])
    const thalamusPiece = efferentThalamusPieceByConnection[nucleusId]
    if (!thalamusPiece) {
      return cortexNames.length > 0 ? cortexNames : null
    }
    return [thalamusPiece, ...cortexNames]
  }, [selectedConnection, efferentThalamusPieceByConnection])

  return (
    <div className="scene-shell">
        <Canvas
          camera={{ position: [0, 2, 10], fov: 48, near: 0.1, far: 1000 }}
        onPointerMissed={clearSelection}
        gl={{ localClippingEnabled: true }}
      >
        <color attach="background" args={['#f1f3f6']} />

        <Environment preset="city" />

        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 7, 3]} intensity={1.1} />

        <ContactShadows
          position={[0, -0.54, 0]}
          opacity={0.42}
          blur={2.3}
          far={8.5}
          resolution={1024}
          scale={10}
          color="#4d5f70"
        />

        <ModelLoader
          url={THALAMUS_MODEL_URL}
          ref={setModelGroup}
          modelColor={modelColor}
          explodeAmount={viewSettings.explodeAmount}
          onMeshClick={(info) => {
            if (!info) return
            try {
              if (controlsRef.current) {
                const name = info.name
                setActiveQuickView(null)
                setManualHighlighted(name ? [name] : null)
                setSelectedMeshName(name || null)
                const formattedPieceName = formatPieceName(name || '')
                // `ModelLoader` returns piece center in world space.
                const pieceCenter: Vec3 = [info.center[0], info.center[1], info.center[2]]
                setSelectedMeshCenter(pieceCenter)

                // map mesh name to connection and select it if available
                const conn = resolveConnectionByObjectName(info.name || '', nodeNameToConnection)
                if (conn) {
                  handleSelectConnection(conn, pieceCenter, info.radius, formattedPieceName)
                } else {
                  const academicInfo = buildAcademicPieceInfo(name || '')
                  setActiveView(null)
                  onSelectConnection(null)
                  onSelectedPieceInfoChange?.({
                    name: formattedPieceName,
                    tier: 'no_mapeada',
                    infoText: academicInfo.infoText,
                    learningPoints: academicInfo.learningPoints,
                  })
                  setCameraGoal(buildFocusGoal(controlsRef.current, pieceCenter, info.radius))
                }
              }
            } catch (err) {
              // ignore
            }
          }}
          position={connections.nodoCentral.posicion}
          scale={0.95}
          highlightedNodeNames={
            selectedConnection
              ? selectedConnectionHighlightNames
              : manualHighlighted
          }
          highlightColor={activeHighlightColor}
          clippingPlanes={clippingPlanes}
          xrayMode={viewSettings.xrayMode}
          fallback={
            <ThalamusPlaceholder
              position={connections.nodoCentral.posicion}
              clippingPlanes={clippingPlanes}
              xrayMode={viewSettings.xrayMode}
            />
          }
        />

        {allConnections.map((connection) => {
          const isVisibleByMode = isConnectionVisibleByMode(viewSettings.connectionVisibilityMode, connection.tipo)
          const isActive = selectedConnection?.id === connection.id
          const opacity = activeView && !isActive ? dimOpacity : 1
          const afferentModelTarget = connection.tipo === 'aferencia'
            ? getThalamusOriginForConnection(connection, connection.posicionDestino)
            : null
          const lineEnd = connection.tipo === 'eferencia'
            ? getConnectionTargetForLine(connection)
            : (afferentModelTarget ?? connection.posicionDestino)
          const lineStart = connection.tipo === 'eferencia'
            ? (
              selectedConnection?.id === connection.id && selectedMeshCenter && isLikelyThalamicMesh(selectedMeshName || '')
                ? selectedMeshCenter
                : getThalamusOriginForConnection(connection, lineEnd)
            )
            : connection.posicionDestino
          const endpointRadius = Math.max(0.042, modelRadiusLocal * 0.014)
          const endpointColor = connection.tipo === 'eferencia' ? '#f87171' : '#93c5fd'
          const endpointEmissive = connection.tipo === 'eferencia' ? '#b91c1c' : '#2563eb'
          const handleLineEndpointClick = (event: any) => {
            event.stopPropagation()
            if (connection.tipo === 'aferencia') {
              handleSelectConnection(
                connection,
                lineEnd,
                Math.max(modelRadiusLocal * 0.08, thalamusRadiusWorld * 0.22),
                connection.nombre,
              )
              return
            }
            const world = pinsWorld[connection.id]
            handleSelectConnection(connection, world ?? connection.posicionDestino)
          }

          // For eferencias, use explicit mapped nodes or clinical map.
          const mapped = connection.tipo === 'eferencia'
            ? ((connection as any).mappedNodes as string[] | undefined) ?? CONNECTION_NODE_MAP[connection.id]
            : undefined

          return (
            <group key={connection.id}>
              {isVisibleByMode && connection.pin && viewSettings.layers.showTargetOrgans && (() => {
                if (selectedConnection?.id !== connection.id) return null
                // Use precomputed pin world positions when available
                const worldPos = pinsWorld[connection.id]
                const pos = worldPos ? new Vector3(worldPos[0], worldPos[1], worldPos[2]) : new Vector3(connection.posicionDestino[0], connection.posicionDestino[1], connection.posicionDestino[2])

                return (
                  <Pin
                    position={[pos.x, pos.y, pos.z]}
                    label={connection.nombre}
                    image={(connection as any).pinImage}
                    onClick={() => {
                      handleSelectConnection(connection, [pos.x, pos.y, pos.z])
                    }}
                  />
                )
              })()}

              {isVisibleByMode && viewSettings.layers.showNerves && connection.tipo === 'eferencia' && (
                <ConnectionLine
                  start={lineStart}
                  end={lineEnd}
                  anchorCenter={modelCenterWorld}
                  startSurfaceOffset={0}
                  endSurfaceOffset={Math.max(0.02, modelRadiusLocal * 0.01)}
                  arcHeight={isActive ? Math.max(0.72, modelRadiusLocal * 0.28) : Math.max(0.52, modelRadiusLocal * 0.22)}
                  color={connection.tipo === 'eferencia' ? EFERENT_COLOR : AFFERENT_COLOR}
                  isActive={isActive}
                  opacity={opacity}
                  onClick={(event) => {
                    handleLineEndpointClick(event)
                  }}
                />
              )}

              {isVisibleByMode && viewSettings.layers.showNerves && connection.tipo === 'aferencia' && (
                <ConnectionLine
                  start={connection.posicionDestino}
                  end={lineEnd}
                  anchorCenter={modelCenterWorld}
                  startSurfaceOffset={0}
                  endSurfaceOffset={Math.max(0.01, modelRadiusLocal * 0.008)}
                  arcHeight={isActive ? Math.max(0.62, modelRadiusLocal * 0.24) : Math.max(0.48, modelRadiusLocal * 0.18)}
                  color={AFFERENT_COLOR}
                  isActive={isActive}
                  opacity={opacity}
                  onClick={(event) => {
                    handleLineEndpointClick(event)
                  }}
                />
              )}

              {isVisibleByMode && viewSettings.layers.showNerves && (
                <mesh
                  position={lineStart}
                  onClick={handleLineEndpointClick}
                  onPointerOver={() => {
                    document.body.style.cursor = 'pointer'
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = 'default'
                  }}
                >
                  <sphereGeometry args={[endpointRadius, 20, 20]} />
                  <meshStandardMaterial
                    color={endpointColor}
                    emissive={endpointEmissive}
                    emissiveIntensity={1.15}
                    depthTest={false}
                    depthWrite={false}
                  />
                </mesh>
              )}

              {isVisibleByMode && viewSettings.layers.showNerves && (
                <mesh
                  position={lineEnd}
                  onClick={handleLineEndpointClick}
                  onPointerOver={() => {
                    document.body.style.cursor = 'pointer'
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = 'default'
                  }}
                >
                  <sphereGeometry args={[endpointRadius, 20, 20]} />
                  <meshStandardMaterial
                    color={endpointColor}
                    emissive={endpointEmissive}
                    emissiveIntensity={1.15}
                    depthTest={false}
                    depthWrite={false}
                  />
                </mesh>
              )}

              {isVisibleByMode
                && viewSettings.layers.showTargetOrgans
                && selectedConnection?.id === connection.id
                && connection.tipo === 'aferencia' && (
                <Pin
                  position={connection.posicionDestino}
                  label={connection.nombre}
                  color="#60a5fa"
                  emissive="#1d4ed8"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleSelectConnection(
                      connection,
                      lineEnd,
                      Math.max(modelRadiusLocal * 0.08, thalamusRadiusWorld * 0.22),
                      connection.nombre,
                    )
                  }}
                />
              )}

              {isVisibleByMode
                && viewSettings.layers.showTargetOrgans
                && selectedConnection?.id === connection.id
                && connection.tipo === 'eferencia'
                && mapped
                && mapped.length > 0 && (
                <Pin
                  position={lineEnd}
                  label={connection.nombre}
                  color="#f87171"
                  emissive="#991b1b"
                  onClick={(event) => {
                    event.stopPropagation()
                    const world = pinsWorld[connection.id]
                    handleSelectConnection(connection, world ?? connection.posicionDestino)
                  }}
                />
              )}

              {isVisibleByMode
                && connection.tipo === 'eferencia'
                && selectedConnection?.id === connection.id
                && Array.isArray((connection as any).externalTargets)
                && (connection as any).externalTargets.length > 0 && (
                <ExternalTargetIndicator
                  nodeNames={mapped}
                  modelCenter={modelCenterWorld}
                  fallbackPosition={
                    selectedMeshCenter
                    ?? (pinsWorld[connection.id] as [number, number, number] | undefined)
                    ?? toWorld(connection.posicionDestino)
                  }
                  label="Estructuras Relacionadas"
                  details={((connection as any).externalTargets as string[]).map((target) => `Conexion con: ${target}`)}
                />
              )}
            </group>
          )
        })}

        <OrbitControls
          ref={handleControlsRef}
          {...orbitControlsProps}
          minDistance={MIN_CAMERA_DISTANCE}
          maxDistance={Math.max(Math.max(0.05, modelRadiusLocal * 0.5) + 0.1, modelRadiusLocal * 5)}
          onStart={() => {
            setCameraGoal(null)
            setActiveQuickView(null)
          }}
        />
        <CameraAnimator
          controlsRef={controlsRef}
          goal={cameraGoal}
          onSettled={() => {
            setCameraGoal(null)
          }}
        />
        {/* DOM-based pointer handler: raycast on pointerdown to detect clicks in empty space */}
        <CanvasPointerManager onPointerMissed={() => {
          // eslint-disable-next-line no-console
          console.info('[Scene] pointer missed (DOM raycast)')
          clearSelection()
        }} />
      </Canvas>

      <CameraControls
        isAutoRotate={isAutoRotate}
        activeQuickView={activeQuickView}
        modelColor={modelColor}
        onGoHome={handleGoHome}
        onZoomIn={() => {
          handleStepZoom(0.82)
        }}
        onZoomOut={() => {
          handleStepZoom(1.2)
        }}
        onToggleAutoRotate={() => {
          setIsAutoRotate((currentValue) => !currentValue)
        }}
        onQuickView={(view) => {
          applyQuickView(view)
        }}
        onModelColorChange={(nextColor) => {
          setModelColor(nextColor)
        }}
      />
    </div>
  )
}







