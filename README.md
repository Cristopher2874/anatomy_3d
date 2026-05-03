# Anatomy 3D - Interactive Neuroanatomical Education Platform

An interactive 3D web application for learning and visualizing neuroanatomical structures, featuring the Thalamus as a central hub with neural pathways (aferencias and eferencias). Built with React, TypeScript, and Three.js, designed for academic collaboration and professional visualization.

## 🎯 Project Overview

**Anatomy 3D** is an educational platform that allows students and academics to explore the Thalamus and its neural connections in an interactive 3D environment. The application features:

- **Central Thalamus node** with detailed information and museum-quality glass material visualization
- **8 Aferencias (incoming pathways)** from key brain structures (spinal cord, brainstem, cerebellum, basal ganglia)
- **4 Eferencias (outgoing pathways)** to major cortical areas (prefrontal cortex, motor cortex, somatosensory cortex, visual cortex)
- **Advanced visualization tools**: layer toggles, clipping planes, X-ray mode for detailed exploration
- **Collaborative features**: share links to specific neural pathways, structured academic workflow

## ✨ Features

- **3D Interactive Visualization**: Rotate, pan, zoom with smooth OrbitControls
- **Click-to-Focus System**: Select any connection to center camera and isolate view (10% opacity for non-selected items)
- **Visualization Tools**:
  - Layer toggles (nerves, organs, grid, labels)
  - Y-axis clipping plane for cross-section analysis
  - X-ray wireframe mode for skeleton visualization
- **Camera Controls**: Home button, zoom in/out, autorotation toggle
- **Share Functionality**: Copy shareable links to specific neural pathways
- **Premium UI**: Glass morphism effects, custom typography (Inter, Plus Jakarta Sans, Montserrat), professional color palette
- **Responsive Layout**: Fixed header, two-column design (sidebar + canvas)
- **About Modal**: Project information and academic context

## 🛠️ Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Frontend Framework** | React | 19.2.5 | UI and component management |
| **Language** | TypeScript | 6.0.2 | Type safety and developer experience |
| **Build Tool** | Vite | 8.0.10 | Fast dev server and production bundler |
| **3D Rendering** | @react-three/fiber | 9.6.0 | React renderer for Three.js |
| **3D Utilities** | @react-three/drei | 10.7.7 | Pre-built 3D components (OrbitControls, Grid, etc.) |
| **Animation** | maath | 0.10.8 | Smooth easing and damping (camera transitions) |
| **3D Engine** | Three.js | (implicit) | Core 3D graphics library |

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn package manager

### Installation

```bash
# Clone or navigate to the project directory
cd anatomy_3d

# Install dependencies
npm install

# Start development server (localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server
The application runs on `http://localhost:5173` with **Hot Module Replacement (HMR)** enabled. Changes to React components and TypeScript files reload automatically.

## 📁 Project Structure

```
anatomy_3d/
├── src/
│   ├── App.tsx                          # Main application shell
│   ├── App.css                          # Global layout and component styles
│   ├── Scene.tsx                        # 3D Canvas and scene orchestration
│   ├── Scene.css                        # Canvas-specific styles
│   ├── main.tsx                         # React entry point
│   ├── index.css                        # Global typography and baseline styles
│   ├── components/
│   │   ├── Header.tsx                   # Fixed top navigation
│   │   ├── Sidebar.tsx                  # Info panel + visualization controls
│   │   ├── ThalamusPlaceholder.tsx      # Central sphere (Thalamus)
│   │   ├── TargetOrganPlaceholder.tsx   # Connection destination cubes
│   │   ├── ConnectionLine.tsx           # Neural pathway lines
│   │   ├── CameraControls.tsx           # Floating camera UI
│   │   ├── ModelLoader.tsx              # GLTF model loading utility
│   │   └── AboutProjectModal.tsx        # Project information modal
│   ├── types/
│   │   └── connections.ts               # TypeScript interfaces and types
│   └── data/
│       └── connections.json             # Neural pathway definitions
├── public/                              # Static assets
├── index.html                           # HTML entry point
├── vite.config.ts                       # Vite configuration
├── tsconfig.json                        # TypeScript configuration
├── package.json                         # Dependencies and scripts
└── README.md                            # This file
```

## 🏗️ Architecture Overview

### Component Hierarchy

```
App.tsx (main container)
├── Header.tsx (fixed top nav)
├── Layout Grid
│   ├── Sidebar.tsx (info + controls)
│   └── Scene.tsx (3D canvas)
│       ├── Canvas (Three.js)
│       │   ├── OrbitControls
│       │   ├── Lights (ambientLight, directionalLight)
│       │   ├── Environment (atmosphere)
│       │   ├── Grid (reference plane)
│       │   ├── ContactShadows
│       │   ├── ThalamusPlaceholder
│       │   ├── TargetOrganPlaceholder (x12)
│       │   ├── ConnectionLine (x12)
│       │   └── CameraAnimator (frame-by-frame damping)
│       └── CameraControls.tsx (floating UI)
└── AboutProjectModal.tsx (overlay modal)
```

### State Flow

```
App.tsx (state holder)
├── selectedConnection: ConnectionWithType | null
│   └── Passes to → Sidebar (display info), Scene (focus/isolation)
├── viewSettings: VisualizationSettings
│   ├── showLayers (nervios, órganos, grid, labels)
│   ├── clippingValue (0-1 for Y-axis clipping)
│   ├── isXrayMode (boolean)
│   └── Passes to → Sidebar (UI controls), Scene (render logic)
└── isAboutOpen: boolean
    └── Passes to → Header (button), AboutProjectModal (visibility)
```

### Data Flow

```json
connections.json
├── nodoCentral (Thalamus metadata)
├── eferencias[] (outgoing: corteza prefrontal, motora, etc.)
└── aferencias[] (incoming: médula espinal, tronco encefálico, etc.)
                    ↓
Scene.tsx merges into allConnections[]
                    ↓
Renders:
├── ThalamusPlaceholder (central sphere)
├── TargetOrganPlaceholder (x12 cubes at connection positions)
└── ConnectionLine (x12 curved bezier lines)
```

## 📦 Module Documentation

### Core Modules

#### **App.tsx** - Application Shell
The main React component that manages global state and layout.

**Key Responsibilities:**
- Layout management (Header, Sidebar, Scene in grid)
- Global state: `selectedConnection`, `viewSettings`, `isAboutOpen`
- Props passing to child components

**Key State:**
```typescript
type VisualizationSettings = {
  showLayers: { nervios: boolean; organos: boolean; grid: boolean; labels: boolean }
  clippingValue: number  // 0-1 for clipping plane position
  isXrayMode: boolean
}
```

**Usage:**
```tsx
const [selectedConnection, setSelectedConnection] = useState<ConnectionWithType | null>(null);
const [viewSettings, setViewSettings] = useState<VisualizationSettings>({
  showLayers: { nervios: true, órganos: true, grid: true, labels: false },
  clippingValue: 0.5,
  isXrayMode: false,
});
```

---

#### **Scene.tsx** - 3D Canvas & Orchestration
Manages the Three.js canvas, camera animation, and all 3D objects.

**Key Responsibilities:**
- Canvas setup and configuration
- Camera animation with smooth damping (via `maath`)
- OrbitControls management
- All 3D entity rendering
- Clipping plane coefficient calculation
- Layer visibility control

**Key Components Inside:**
- `CameraAnimator`: Frame-by-frame camera easing using `maath.easing.damp3()`
- `buildFocusGoal()`: Computes stable camera target preserving current viewing angle
- Connection array builder: Merges aferencias + eferencias

**Example: Focus Camera on Connection**
```tsx
const buildFocusGoal = (connection: ConnectionWithType) => {
  const distanceFromTarget = 2.0;
  const direction = new THREE.Vector3()
    .fromArray(connection.posicionDestino)
    .normalize();
  return new THREE.Vector3().addVectors(
    new THREE.Vector3().fromArray(connection.posicionDestino),
    direction.multiplyScalar(-distanceFromTarget)
  );
};
```

**Isolation Logic:**
Non-selected connections dimmed to 10% opacity via:
```tsx
const dimOpacity = activeView === connection.id ? 1 : 0.1;
```

---

#### **Sidebar.tsx** - Info Panel & Visualization Controls
Displays selected connection information and provides controls for advanced visualization.

**Key Sections:**
1. **Connection Info** (when selected):
   - Connection name, type (aferencia/eferencia), description
   - Clear button to deselect

2. **Share Button**: Creates shareable URL
   ```
   ${window.location.pathname}?connection=${id}
   ```

3. **Tools Section** (NEW - Phase 12):
   - **Layer Toggles**: Checkboxes for nervios, órganos, grid, labels
   - **Clipping Slider**: Y-axis plane position (0-1)
   - **X-Ray Button**: Toggle wireframe mode

**Example Control:**
```tsx
<input
  type="range"
  min="0"
  max="1"
  step="0.01"
  value={clippingValue}
  onChange={(e) => setViewSettings({...viewSettings, clippingValue: parseFloat(e.target.value)})}
/>
```

---

#### **ThalamusPlaceholder.tsx** - Central Sphere
Central Thalamus visualization with museum-quality glass material.

**Material Setup:**
```tsx
<meshPhysicalMaterial
  color="#8ecae6"
  transmission={0.8}      // Glass effect (0-1, higher = more transparent)
  ior={1.5}               // Refractive index (1.5 = glass-like)
  roughness={0.35}        // Surface texture
  metalness={0.1}         // Slight metallic tint
  thickness={0.5}         // Transmission depth for realism
/>
```

**Key Features:**
- Responds to mouse hover (scale 1.05x, emissive glow)
- Active state (scale 1.18x, brighter emissive)
- Center position: `[0, 0, 0]`
- Radius: 0.5 units

---

#### **TargetOrganPlaceholder.tsx** - Connection Destination Cubes
Represents organ/structure at end of each neural pathway.

**Props:**
```typescript
type TargetOrganProps = {
  position: Vec3
  connectionColor: string
  isHovered: boolean
  isActive: boolean
  isXrayMode: boolean          // (NEW) Toggle wireframe
  opacity: number              // Dimming from isolation
  onHover: (id: string, hovered: boolean) => void
  onSelect: () => void
}
```

**Material Behavior:**
```tsx
// Normal mode: glass effect
<meshPhysicalMaterial transmission={0.6} ior={1.4} />

// X-ray mode: wireframe skeleton
{isXrayMode ? (
  <meshBasicMaterial wireframe={true} color={color} />
) : (
  <meshPhysicalMaterial ... />
)}
```

**Opacity Dimming:**
Controlled by Scene isolation logic; non-selected organs fade to 10% opacity.

---

#### **ConnectionLine.tsx** - Neural Pathway Lines
Curved bezier lines connecting Thalamus to organs.

**Line Type:** `QuadraticBezierLine` from `@react-three/drei`

**Dynamic Properties:**
```tsx
<QuadraticBezierLine
  start={thalamousPos}
  end={organPos}
  mid={buildMidPoint()}          // Lifted Y for arc
  lineWidth={isActive ? 3.4 : 2.2}
  color={connection.colorLinea}
  transparent={opacity < 1}
  opacity={opacity}              // Dimming from isolation
/>
```

**Midpoint Calculation:**
```tsx
const midPoint = [
  (start[0] + end[0]) / 2,
  (start[1] + end[1]) / 2 + 0.45,  // Lift by 0.45 units for arc
  (start[2] + end[2]) / 2,
];
```

---

#### **CameraControls.tsx** - Floating Camera UI
Floating button panel (bottom-right) for manual camera manipulation.

**Buttons:**
- **Home**: Reset camera to default view
- **Zoom In/Out**: Adjust OrbitControls distance
- **Autorotate**: Toggle continuous rotation

**Styling:**
```css
.camera-controls {
  position: absolute;
  right: 0.9rem;
  bottom: 0.9rem;
  z-index: 6;
  backdrop-filter: blur(10px);
  background: rgba(248, 250, 252, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.2);
}
```

---

#### **Header.tsx** - Fixed Top Navigation
Static header with branding and About button.

**Features:**
- Fixed positioning across full width
- Glass morphism background
- About button callback

---

#### **ModelLoader.tsx** - GLTF Model Loading Utility
**CRITICAL for real model integration** - handles loading and displaying 3D models.

**Key Function:**
```typescript
useGLTF(modelUrl: string): {
  scene: THREE.Group
  nodes: Record<string, THREE.Object3D>
  materials: Record<string, THREE.Material>
}
```

**Implementation:**
```tsx
const { scene, nodes } = useGLTF(modelUrl);
const clonedScene = SkeletonUtils.clone(scene);
traverse(clonedScene, (child) => {
  if (child instanceof THREE.Mesh && nodes[CONNECTION_NODE_MAP[connectionId]]) {
    child.material.emissive = new THREE.Color(0xff9900); // Highlight on select
  }
});
```

**Critical for Model Integration:**
- Model URL must be set in `Scene.tsx`
- Node names must match `CONNECTION_NODE_MAP` keys
- See **Model Integration Guide** below

---

#### **types/connections.ts** - Type Definitions
Central TypeScript interfaces for type safety.

**Key Types:**
```typescript
type Vec3 = [number, number, number];

interface Connection {
  id: string;
  nombre: string;
  posicionLocal: Vec3;      // Starting position (near Thalamus)
  posicionDestino: Vec3;    // Ending position (at organ)
  colorLinea: string;       // Connection line color (#hex)
  infoText: string;         // Description
}

interface ConnectionWithType extends Connection {
  tipo: 'aferencia' | 'eferencia';
}

type VisualizationSettings = {
  showLayers: { nervios: boolean; órganos: boolean; grid: boolean; labels: boolean };
  clippingValue: number;
  isXrayMode: boolean;
}
```

---

#### **data/connections.json** - Data Source
Central repository of all neural pathway definitions.

**Structure:**
```json
{
  "nodoCentral": {
    "id": "thalamus",
    "nombre": "Tálamo",
    "posicion": [0, 0, 0],
    "descripcion": "Central relay hub..."
  },
  "eferencias": [
    {
      "id": "eferencia_1",
      "nombre": "Corteza Prefrontal",
      "posicionLocal": [0, 0.3, 0],
      "posicionDestino": [-1.5, 2.5, 0],
      "colorLinea": "#fb923c",
      "infoText": "Executive function and planning..."
    }
    // ... 3 more eferencias
  ],
  "aferencias": [
    {
      "id": "aferencia_1",
      "nombre": "Médula Espinal",
      "posicionLocal": [0, -0.3, 0],
      "posicionDestino": [1.5, -2.5, 0],
      "colorLinea": "#2563eb",
      "infoText": "Somatosensory input..."
    }
    // ... 7 more aferencias
  ]
}
```

---

### Style & Design Modules

#### **App.css** - Layout & Component Styles

**Design Tokens:**
```css
:root {
  --cobalt: #2563eb;          /* Primary blue */
  --coral: #fb923c;           /* Accent orange */
  --bg-soft: #f8fafc;         /* Soft white-blue background */
  --radius-soft: 16px;        /* Universal border radius */
}
```

**Main Layout:**
```css
.app-layout {
  display: grid;
  grid-template-rows: 60px 1fr;
  grid-template-columns: 320px 1fr;
  height: 100vh;
  background: var(--bg-soft);
}

.sidebar-panel {
  grid-area: 2 / 1;
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(37, 99, 235, 0.1);
}

.scene-container {
  grid-area: 1 / 2 / 3 / 3;
  position: relative;
}
```

**Tools Section** (Phase 12):
```css
.tools-section {
  border-top: 1px solid rgba(37, 99, 235, 0.1);
  padding-top: 1rem;
  margin-top: 1rem;
}

.layer-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.clipping-control input[type="range"] {
  width: 100%;
  cursor: pointer;
}
```

---

#### **Scene.css** - Canvas Styles

**Canvas Background:**
```css
.scene-shell {
  background: radial-gradient(
    circle at 30% 50%,
    rgba(37, 99, 235, 0.08) 0%,
    rgba(251, 146, 60, 0.03) 100%
  );
}
```

---

#### **index.css** - Global Typography

**Font Imports:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&family=Montserrat:wght@600;700&display=swap');
```

**Typography System:**
```css
body {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #1e293b;
}

h1, h2, h3, h4 {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-weight: 600;
}
```

---

## 🧠 Developer Guide: Adding Real Brain Models

### Overview
Currently, the application uses placeholder geometry (sphere for Thalamus, cubes for organs). To integrate real neuroanatomical models, follow this guide to replace the placeholders with your `.glb` (GLTF Binary) files.

### Step 1: Prepare Your 3D Models

**Requirements:**
- Format: `.glb` or `.gltf` (GLTF 2.0)
- Thalamus model: Single mesh named `Thalamus`
- Organ models: Individual meshes with specific names (see naming convention below)

**Naming Convention for Node/Mesh Names:**
Each mesh in your model file must be named according to this mapping:

| Component | Required Mesh Name |
|-----------|-------------------|
| Thalamus | `Thalamus` |
| Corteza Prefrontal | `corteza_prefrontal` |
| Corteza Motora | `corteza_motora` |
| Corteza Somatosensorial | `corteza_somatosensorial` |
| Corteza Visual | `corteza_visual` |
| Médula Espinal | `medula_espinal` |
| Tronco Encefálico | `tronco_encefalico` |
| Cerebelo | `cerebelo` |
| Ganglios Basales | `ganglios_basales` |
| Hipotálamo | `hipotalamo` |
| Tegmento | `tegmento` |
| Sustancia Nigra | `sustancia_nigra` |

**Model Preparation in Blender (Recommended):**
1. Import your brain model
2. Select each structure/object
3. Rename via Object Properties → Object Name (match table above exactly)
4. Export as `.glb` → File → Export → glTF Binary (.glb)

---

### Step 2: Add Model Files to Project

**Create Models Directory:**
```bash
mkdir -p public/models
```

**Place Model Files:**
```
public/
├── models/
│   ├── thalamus.glb           # Central Thalamus model
│   ├── brain-structures.glb    # (Optional) Single file with all organs
│   └── organs/                 # (Optional) Individual organ files
│       ├── corteza_prefrontal.glb
│       ├── corteza_motora.glb
│       └── ...
```

**File Size Considerations:**
- Target: <5MB per model (combine where possible)
- Use mesh decimation in Blender if needed
- Optimize materials (remove unused textures)

---

### Step 3: Configure Model URLs in Scene.tsx

**Open:** `src/Scene.tsx`

**Find and Update:**
```typescript
// Around line 20-30, update these constants:

// Thalamus model URL (currently using placeholder)
const THALAMUS_MODEL_URL = 'https://your-cdn.com/thalamus.glb';
// OR for local files:
const THALAMUS_MODEL_URL = '/models/thalamus.glb';

// Organ models (if loading individually)
const ORGAN_MODEL_URLS: Record<string, string> = {
  corteza_prefrontal: '/models/corteza_prefrontal.glb',
  corteza_motora: '/models/corteza_motora.glb',
  corteza_somatosensorial: '/models/corteza_somatosensorial.glb',
  corteza_visual: '/models/corteza_visual.glb',
  medula_espinal: '/models/medula_espinal.glb',
  tronco_encefalico: '/models/tronco_encefalico.glb',
  cerebelo: '/models/cerebelo.glb',
  ganglios_basales: '/models/ganglios_basales.glb',
  hipotalamo: '/models/hipotalamo.glb',
  tegmento: '/models/tegmento.glb',
  sustancia_nigra: '/models/sustancia_nigra.glb',
};
```

---

### Step 4: Replace Placeholder Components

#### **Option A: Replace Individual Placeholders**

Replace `ThalamusPlaceholder` with real model in `Scene.tsx`:

**Before:**
```tsx
<ThalamusPlaceholder />
```

**After:**
```tsx
<Suspense fallback={<ThalamusPlaceholder />}>
  <ModelLoader
    url={THALAMUS_MODEL_URL}
    connectionId="thalamus"
    fallback={<ThalamusPlaceholder />}
  />
</Suspense>
```

---

#### **Option B: Use Combined Model File**

If your model has all structures in one file, modify `Scene.tsx`:

```tsx
const { scene, nodes } = useGLTF('/models/full-brain.glb');

// In render:
<primitive object={scene} scale={2.5} position={[0, 0, 0]} />
```

---

### Step 5: Update Node Mapping

If your model's internal node names differ, update the mapping in `ModelLoader.tsx`:

```typescript
// Around line 15-30
const CONNECTION_NODE_MAP: Record<string, string> = {
  'aferencia_1': 'medula_espinal',
  'aferencia_2': 'tronco_encefalico',
  'aferencia_3': 'cerebelo',
  'aferencia_4': 'ganglios_basales',
  'eferencia_1': 'corteza_prefrontal',
  'eferencia_2': 'corteza_motora',
  'eferencia_3': 'corteza_somatosensorial',
  'eferencia_4': 'corteza_visual',
  // Add others as needed...
};
```

---

### Step 6: Verify Material Compatibility

Real models may have existing materials. Ensure compatibility with visualization modes:

**In TargetOrganPlaceholder.tsx**, the X-ray mode swaps materials. If your model has complex materials:

```tsx
// Preserve original material for normal mode
const originalMaterial = isXrayMode 
  ? null 
  : new THREE.MeshPhysicalMaterial({ ... });

// Keep wireframe for X-ray
const wireframeMaterial = isXrayMode 
  ? new THREE.MeshBasicMaterial({ wireframe: true, color: '#2563eb' }) 
  : null;
```

---

### Step 7: Test the Build

```bash
# Start dev server
npm run dev

# Verify:
# 1. Thalamus loads (should see 3D model instead of sphere)
# 2. Organs load at positions
# 3. Click to select highlights model
# 4. Hover effects still work
# 5. X-ray mode shows wireframe

# Build for production
npm run build

# Preview production
npm run preview
```

---

### Model File Checklist

```
[ ] Models prepared in correct format (.glb)
[ ] Mesh names match CONNECTION_NODE_MAP
[ ] Files placed in public/models/
[ ] URLs configured in Scene.tsx
[ ] THALAMUS_MODEL_URL set
[ ] ORGAN_MODEL_URLS populated
[ ] Fallback placeholders in place (for loading states)
[ ] npm run dev tested without errors
[ ] All connections highlight on select
[ ] X-ray mode toggles wireframe
[ ] npm run build succeeds
[ ] Production preview works
```

---

### Example: Complete Workflow

**1. Export Brain Thalamus from Blender as `thalamus.glb`**

**2. Place in public:**
```bash
cp thalamus.glb public/models/
```

**3. Update Scene.tsx:**
```typescript
const THALAMUS_MODEL_URL = '/models/thalamus.glb';
```

**4. Update Scene.tsx render (find ThalamusPlaceholder):**
```tsx
<Suspense fallback={<ThalamusPlaceholder />}>
  <ModelLoader
    url={THALAMUS_MODEL_URL}
    connectionId="thalamus"
    fallback={<ThalamusPlaceholder />}
  />
</Suspense>
```

**5. Test:**
```bash
npm run dev
# Visit http://localhost:5173
# Should see real Thalamus model
```

---

## 🎨 Visualization Tools Explained

### Layer Toggles
Control visibility of reference geometry and labels:
- **Nervios (Nerves)**: Show/hide connection lines
- **Órganos (Organs)**: Show/hide organ cubes/models
- **Grid**: Show/hide ground reference plane
- **Labels**: Show/hide text labels (future feature)

**Implementation:**
```tsx
// In Scene.tsx, conditional rendering:
{viewSettings.showLayers.grid && <Grid />}
{viewSettings.showLayers.nervios && allConnections.map(c => <ConnectionLine ... />)}
```

### Clipping Plane (Y-Axis)
Cross-section analysis tool. Moves a plane along the Y-axis (0 = bottom, 1 = top).

**Usage:**
- Slider in Sidebar: `clippingValue` from 0 to 1
- Scene calculates plane coefficient: `clippingPlane.constant = clippingValue * 5 - 2.5`
- Renderer enables local clipping: `renderer.localClippingEnabled = true`

**For Real Implementation:**
```tsx
const clippingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
clippingPlane.constant = viewSettings.clippingValue * 5 - 2.5;
renderer.clippingPlanes = [clippingPlane];
```

### X-Ray Mode
Toggle wireframe visualization for skeleton anatomy:
- Shows only edges, no fill
- Allows seeing internal structure
- Applies to all organ models

**Implementation:**
```tsx
{isXrayMode ? (
  <meshBasicMaterial wireframe={true} color={organColor} />
) : (
  <meshPhysicalMaterial transmission={0.6} ... />
)}
```

---

## 🔧 Styling Tokens & Design System

### Color Palette
```
Primary: #2563eb (Cobalt blue) - CTAs, aferencias, primary UI
Accent: #fb923c (Coral orange) - Highlights, eferencias, secondary UI
Background: #f8fafc (Soft blue-white) - Main background
Neutral: #1e293b (Dark slate) - Text
Light: #cbd5e1 (Light slate) - Borders, secondary text
```

### Typography
```
Display: Montserrat 700 (headings, impact text)
UI: Plus Jakarta Sans 600 (component labels, important text)
Body: Inter 400-600 (paragraphs, descriptions)
```

### Spacing
```
Border Radius: 16px (--radius-soft)
Padding: 1rem, 0.5rem, 0.75rem (consistency)
Gap: 1rem between sections
```

---

## 🐛 Troubleshooting

### Model Doesn't Load
**Problem:** 3D model not appearing, showing placeholder
- Check console for 404 errors: `chrome://inspect/#devices` → DevTools
- Verify file path in THALAMUS_MODEL_URL matches actual location
- Ensure `.glb` file is in `public/models/`
- Check file size: very large files may timeout

**Solution:**
```bash
# Verify file exists
ls public/models/thalamus.glb

# Check network tab in DevTools for failed requests
# Update URL if path is incorrect
```

### Selection Highlight Doesn't Work
**Problem:** Clicked model doesn't highlight with emissive glow

**Cause:** Node names in model don't match CONNECTION_NODE_MAP

**Solution:**
1. Open model in Blender
2. Check mesh names in Outliner
3. Update CONNECTION_NODE_MAP in ModelLoader.tsx to match exactly
4. Test with exact case sensitivity: `Corteza_Prefrontal` ≠ `corteza_prefrontal`

### X-Ray Mode Not Toggling
**Problem:** Wireframe doesn't appear when X-ray button clicked

**Cause:** TargetOrganPlaceholder not receiving `isXrayMode` prop

**Solution:**
1. Check Scene.tsx passes `isXrayMode={viewSettings.isXrayMode}` to TargetOrganPlaceholder
2. Verify Sidebar button is correctly wired to setViewSettings
3. Check browser console for errors

### Camera Controls Frozen
**Problem:** Can't rotate, pan, or zoom

**Cause:** OrbitControls disabled or conflicting event listeners

**Solution:**
```tsx
// In Scene.tsx, verify OrbitControls setup:
<OrbitControls
  ref={controlsRef}
  enableDamping={true}
  dampingFactor={0.05}
  autoRotate={isAutoRotate}
  autoRotateSpeed={4}
/>
```

### Performance Issues
**Problem:** Low frame rate, stuttering

**Cause:** Model too complex or high poly count

**Solution:**
1. Check model poly count: Blender → Viewport shading → Geometry counter
2. Optimize in Blender: Modifier → Decimate (reduce by 30-50%)
3. Check file size: Should be <5MB per model
4. Monitor: Use Chrome DevTools → Performance tab

### Build Fails
**Problem:** `npm run build` errors

**Common Issues:**
```bash
# Missing dependencies
npm install

# TypeScript errors
npm run build -- --verbose  # See detailed errors

# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📚 Additional Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber/)
- [Drei Components](https://github.com/pmndrs/drei)
- [Blender GLTF Export](https://docs.blender.org/manual/en/latest/addons/io_scene_gltf2/export.html)

---

## 👥 Contributing

When adding models or features:
1. Follow naming conventions (mesh names match CONNECTION_NODE_MAP)
2. Test with `npm run dev` before committing
3. Verify `npm run build` completes without errors
4. Keep models <5MB for production performance
5. Update this README if adding new visualization modes

---

## 📄 License

This project is developed for academic and educational purposes.
