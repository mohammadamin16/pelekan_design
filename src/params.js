// Single source of truth for the design. All dimensions in metres, in Rhino
// world coordinates (Z up). Defaults were measured from the two Rhino views
// (35 mm lens, camera data from the Properties panel).

// Leva schema: folder -> key -> { value, min, max, step, label }
export const SCHEMA = {
  Room: {
    wallX: { value: -10.77, min: -14, max: -8, step: 0.01, label: 'wall face X' },
    wallYMin: { value: -2, min: -10, max: 5, step: 0.1, label: 'wall start Y' },
    wallYMax: { value: 22, min: 14, max: 40, step: 0.1, label: 'wall end Y' },
    ceilingHeight: { value: 2.55, min: 2.2, max: 4, step: 0.01, label: 'ceiling height' },
    marbleTop: { value: 2.28, min: 1, max: 3, step: 0.01, label: 'marble top' },
    plasterColor: { value: '#f3f2ef', label: 'plaster' },
  },
  Feature: {
    featureY: { value: 9.6, min: 2, max: 18, step: 0.01, label: 'centre Y' },
    bays: { value: '0.85, 0.95, 1.40, 0.95, 0.85', label: 'bay widths' },
    whiteBays: { value: '0, 4', label: 'white-backed bays' },
    pilasterWidth: { value: 0.15, min: 0, max: 0.6, step: 0.01, label: 'section gap' },
    pilasterDepth: { value: 0.04, min: 0, max: 0.2, step: 0.005, label: 'pilaster depth' },
    plinthHeight: { value: 0.25, min: 0, max: 0.8, step: 0.01, label: 'plinth height' },
    plinthDepth: { value: 0.09, min: 0, max: 0.3, step: 0.005, label: 'plinth depth' },
    showRail: { value: true, label: 'horizontal rail' },
    railHeight: { value: 2.21, min: 0.5, max: 2.6, step: 0.01, label: 'rail height' },
  },
  Canopy: {
    canopyHeight: { value: 2.45, min: 1.8, max: 3.5, step: 0.01, label: 'canopy height' },
    filletRadius: { value: 0.3, min: 0.05, max: 1.5, step: 0.01, label: 'bend radius' },
    ceilingRun: { value: 3.8, min: 0, max: 12, step: 0.05, label: 'ceiling run' },
    fanSpread: { value: 0, min: -0.5, max: 2, step: 0.01, label: 'fan spread' },
    returnDrop: { value: 0, min: 0, max: 2, step: 0.01, label: 'far-end drop' },
    returnRadius: { value: 0.3, min: 0.05, max: 1.5, step: 0.01, label: 'far-end radius' },
    meshCoversRibs: { value: true, label: 'sheets cover ribs' },
    meshOffset: { value: 0.085, min: 0.01, max: 0.3, step: 0.005, label: 'mesh off wall' },
    endTrim: { value: false, label: 'end trim bar' },
  },
  Ribs: {
    ribWidth: { value: 0.02, min: 0.005, max: 0.3, step: 0.005, label: 'face to viewer' },
    ribDepth: { value: 0.04, min: 0.01, max: 0.4, step: 0.005, label: 'depth' },
    ribsBehind: { value: true, label: 'hidden behind mesh' },
    separateFrames: { value: true, label: 'frame per section' },
    edgeRibs: { value: false, label: 'ribs at outer edges' },
  },
  Mesh: {
    meshCellW: { value: 0.08, min: 0.01, max: 0.3, step: 0.005, label: 'cell width' },
    meshCellH: { value: 0.04, min: 0.005, max: 0.3, step: 0.005, label: 'cell height' },
    meshStrand: { value: 0.3, min: 0.04, max: 0.45, step: 0.01, label: 'strand thickness' },
    meshColor: { value: '#759465', label: 'colour (mesh + profiles)' }, // jade green, Pantone 16-0228 TCX
    meshMetalness: { value: 0.25, min: 0, max: 1, step: 0.01, label: 'metalness' },
    meshRoughness: { value: 0.4, min: 0, max: 1, step: 0.01, label: 'roughness' },
    meshShadows: { value: false, label: 'cast shadows (slow)' },
  },
  Materials: {
    marbleTint: { value: '#ffffff', label: 'marble tint' },
    marbleCourse: { value: 0.3, min: 0.1, max: 1.2, step: 0.01, label: 'marble course' },
    marbleRoughness: { value: 0.32, min: 0, max: 1, step: 0.01, label: 'marble rough.' },
    floorTileX: { value: 0.3, min: 0.1, max: 1.2, step: 0.01, label: 'floor tile X' },
    floorTileY: { value: 0.4, min: 0.1, max: 1.2, step: 0.01, label: 'floor tile Y' },
    floorTint: { value: '#dedad4', label: 'floor tint' },
  },
  Signage: {
    showSigns: { value: true, label: 'floor directory' },
    signStyle: { value: 'plates', options: { '1 · Plates': 'plates', '2 · Rail & cassettes': 'rail', '3 · Spine & chevrons': 'spine' }, label: 'guide board' },
    signBay: { value: 2, options: { 'section 2': 1, 'section 3': 2, 'section 4': 3 }, label: 'on section' },
    signLang: { value: 'fa', options: { 'فارسی': 'fa', English: 'en' }, label: 'language' },
    signMaterial: {
      value: 'blackSteel',
      options: {
        'laser-cut black steel': 'blackSteel',
        'laser-cut brushed stainless': 'stainless',
        'white acrylic': 'whiteAcrylic',
        'black acrylic': 'blackAcrylic',
      },
      label: 'material',
    },
    signAccent: { value: '#97564a', label: 'accent (copper)' },
    signTop: { value: 1.95, min: 1, max: 2.3, step: 0.01, label: 'top height' },
    signRowH: { value: 0.26, min: 0.12, max: 0.4, step: 0.005, label: 'plate height' },
    signGap: { value: 0.05, min: 0, max: 0.2, step: 0.005, label: 'gap between floors' },
    signMargin: { value: 0.08, min: 0, max: 0.3, step: 0.005, label: 'side margin' },
    signStandoff: { value: 0.03, min: 0.01, max: 0.1, step: 0.005, label: 'off the mesh' },
    signExplode: { value: 0, min: 0, max: 1, step: 0.01, label: 'explode (take apart)' },
  },
  Directory: buildDirectory(),
  Scene: {
    showColumns: { value: true, label: 'columns' },
    showCeiling: { value: true, label: 'ceiling' },
    lens: { value: 35, min: 10, max: 120, step: 1, label: 'lens (mm)' },
    eyeHeight: { value: 1.6, min: 0.5, max: 2.2, step: 0.01, label: 'walk eye height' },
  },
  Lighting: {
    exposure: { value: 1.0, min: 0.2, max: 3, step: 0.01 },
    sun: { value: 0.85, min: 0, max: 6, step: 0.05, label: 'key light' },
    bounce: { value: 1.0, min: 0, max: 3, step: 0.05, label: 'ceiling bounce' },
    ambient: { value: 0.6, min: 0, max: 3, step: 0.05 },
    envIntensity: { value: 0.45, min: 0, max: 3, step: 0.05, label: 'reflections' },
  },
}

function buildDirectory() {
  const d = {}
  for (let f = 5; f >= 1; f--) {
    for (const [k, n] of [['a', 1], ['b', 2]]) {
      const group = `Floor ${f}`
      d[`f${f}${k}No`] = { value: `${f}0${n}`, label: `unit ${n} no.`, group }
      d[`f${f}${k}Name`] = { value: '', label: `unit ${n} name`, group }
    }
  }
  return d
}

export const DEFAULTS = Object.fromEntries(
  Object.values(SCHEMA).flatMap((f) => Object.entries(f).map(([k, v]) => [k, v.value]))
)

// Fixed scene objects (Rhino coords). Pier = against the feature wall.
export const COLUMNS = [
  { kind: 'pier', y0: 3.8, y1: 4.6, depth: 0.35 },
  { kind: 'pier', y0: 17.1, y1: 17.5, depth: 0.1 },
  { kind: 'free', x0: -15.5, x1: -14.9, y0: 6.4, y1: 7.0 },
]

// Camera presets in Rhino coords, copied from the Rhino Properties panel.
export const PRESETS = {
  view1: { label: 'View 1', cam: [-18.741, 9.535, 1.32], target: [-10.954, 9.331, 1.36], lens: 35 },
  view2: { label: 'View 2', cam: [-15.435, 4.81, 0.702], target: [-10.702, 9.904, 1.433], lens: 35 },
  directory: { label: 'Directory', cam: [-14.1, 9.6, 1.25], target: [-10.85, 9.6, 1.2], lens: 35 },
  overview: { label: 'Overview', cam: [-21.5, 1.5, 5.5], target: [-11.8, 9.6, 1.2], lens: 28 },
  side: { label: 'Section', cam: [-13.2, -7, 1.4], target: [-13.2, 9.6, 1.4], lens: 35 },
  top: { label: 'Top', cam: [-13.6, 9.6, 24], target: [-13.59, 9.6, 0], lens: 35 },
}

// Rhino (x, y, z  Z-up) -> three.js (x, y, z  Y-up)
export const r2t = ([x, y, z]) => [x, z, -y]
export const t2r = ([x, y, z]) => [x, -z, y]

export const parseList = (s) =>
  String(s)
    .split(/[,\s;]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n))

// Bay / rib layout along Y for the feature wall.
export function featureLayout(P) {
  const bays = parseList(P.bays).filter((w) => w > 0)
  const white = new Set(parseList(P.whiteBays).map(Math.round))
  const pw = P.pilasterWidth
  const total = bays.reduce((a, b) => a + b, 0) + pw * Math.max(0, bays.length - 1)
  const y0 = P.featureY - total / 2
  let y = y0
  const bayRanges = []
  const ribYs = []
  bays.forEach((w, i) => {
    bayRanges.push({ i, y0: y, y1: y + w, white: white.has(i) })
    y += w
    if (i < bays.length - 1) {
      ribYs.push(y + pw / 2)
      y += pw
    }
  })
  return { bayRanges, ribYs, y0, y1: y0 + total, total }
}
