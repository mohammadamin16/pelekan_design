// Design variants. Each design is a set of overrides on top of DEFAULTS.
// Built-in designs live here (committed to the repo). Designs made in the browser
// are kept in localStorage until they are baked into BUILTIN.
//
// Directory contents (unit names), camera/scene and lighting are SHARED: they stay
// the same when you switch design, so comparisons are like for like.
import { create } from 'zustand'
import { DEFAULTS, SCHEMA } from './params'

export const BUILTIN = [
  {
    id: 'a',
    name: 'A · Original',
    note: '5 sections, straight ceiling run',
    params: {},
  },
  {
    id: 'b',
    name: 'B · Fan',
    note: '7 sections, metallic mesh fanning out over the ceiling, no rail',
    params: {
      bays: '0.60, 0.60, 0.60, 1.40, 0.60, 0.60, 0.60',
      showRail: false,
      filletRadius: 0.5,
      ceilingRun: 3.6,
      fanSpread: 0.25,
      meshMetalness: 0.7,
      meshRoughness: 0.35,
      ceilingBreaks: 'none', // 7 sections: the 5-section break pattern doesn't apply
      signBay: 3, // middle of 7
      signMaterial: 'blackAcrylic',
    },
  },
  {
    id: 'c',
    name: 'C · Rhino 006',
    note: 'karimkhan 006.3dm: measured room, canopy crosses the corridor and bends 300 down on the column side',
    params: {
      // the room as drawn in the Rhino model (niches, columns, stairs, slab void)
      roomPlan: 'rhino006',
      wallX: -10.887,
      wallYMin: 0,
      wallYMax: 19.92,
      ceilingHeight: 2.5,
      marbleTop: 2.3,
      // five sections between y 6.82 and 12.315, 150 mm apart
      featureY: 9.5675,
      bays: '1.015, 0.815, 1.32, 0.955, 0.79',
      pilasterDepth: 0,
      plinthHeight: 0.3, // tray starts on top of the 300 baseboard line
      plinthDepth: 0,
      showRail: false,
      // tray 50 mm off the wall, 300 mm bends, mesh line at 2.45 under a 2.50 slab
      meshOffset: 0.05,
      canopyHeight: 2.45,
      filletRadius: 0.3,
      ceilingRun: 3.6,
      returnDrop: 0.3, // column side: only the 300 bend (lift / elevator below), ends at 2.15
      returnRadius: 0.3,
      // per section (parts split with '/'):
      //  2: bend over the column, then stepped in to clear the stair column
      //  3: stops against the elevator column, then stepped in
      //  4: over the stairs, no bend, closed up into the void at 2.70
      sectionSplits: '-, 0.495, 0.82, -, -',
      sectionRuns: '3.6, 3.6/2.7, 3.15/2.7, 4.0, 3.6',
      sectionDrops: '0.3, 0.3/0.3, 0/0.3, 0, 0.3',
      ribDepth: 0.047, // the trays are 50 deep
      sideFins: true,
      endPlates: true,
      signBay: 2,
    },
  },
]

export const SHARED = new Set([
  ...Object.keys(SCHEMA.Directory),
  ...Object.keys(SCHEMA.Scene),
  ...Object.keys(SCHEMA.Lighting),
  'signExplode',
  'signStyle', // guide board is chosen independently of the wall design
  'signFont', // and so is the sign typeface
  'meshColor', // jade mesh + profiles in every design
  'signAccent', // copper floor plates in every design
])

const KEY = 'pelekan-designs-v1'
const OLD_KEY = 'pelekan-design-params-v2'

// leva turns numeric strings ("501") into numbers, so compare as strings
const same = (a, b) => String(a) === String(b)
const pick = (P, keep) => Object.fromEntries(Object.entries(P).filter(([k]) => k in DEFAULTS && keep(k)))
const diff = (P, base) => Object.fromEntries(Object.entries(P).filter(([k, v]) => !same(base[k], v)))
const designPart = (P) => pick(P, (k) => !SHARED.has(k))
const sharedPart = (P) => pick(P, (k) => SHARED.has(k))

// v7: 3D strand defaults; v6: white backing removed; v5: jade mesh + profiles and copper accent are fixed for every design,
// so drop any older colour values that were saved before that rule.
const VERSION = 7 // bump to drop stale saved values (see COLOUR_KEYS)
const COLOUR_KEYS = ['meshColor', 'ribColor', 'signAccent', 'whiteBays', 'meshStrandW', 'meshTilt', 'mesh3D']
function migrate(s) {
  if (s.v >= VERSION) return s
  const strip = (o = {}) => Object.fromEntries(Object.entries(o).filter(([k]) => !COLOUR_KEYS.includes(k)))
  return {
    ...s,
    v: VERSION,
    shared: strip(s.shared),
    edits: Object.fromEntries(Object.entries(s.edits).map(([id, e]) => [id, strip(e)])),
    custom: s.custom.map((d) => ({ ...d, params: strip(d.params) })),
  }
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (s && s.edits) return migrate({ active: 'a', custom: [], shared: {}, ...s })
  } catch {}
  // first run: carry over edits from the single-design version
  let old = {}
  try {
    old = pick(JSON.parse(localStorage.getItem(OLD_KEY) || '{}'), () => true)
  } catch {}
  return migrate({ active: 'a', custom: [], edits: { a: designPart(old) }, shared: sharedPart(old) })
}

export const useDesigns = create(() => load())

useDesigns.subscribe(({ v, active, custom, edits, shared }) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v, active, custom, edits, shared }))
  } catch {}
})

export const allDesigns = (s = useDesigns.getState()) => [...BUILTIN, ...s.custom]
const find = (id, s) => allDesigns(s).find((d) => d.id === id)
const baseOf = (id, s) => ({ ...DEFAULTS, ...designPart(find(id, s)?.params || {}) })
export const isEdited = (id, s = useDesigns.getState()) => Object.keys(s.edits[id] || {}).length > 0

// Full parameter set for a design (its own values + the shared ones).
export function paramsOf(id, s = useDesigns.getState()) {
  return { ...baseOf(id, s), ...(s.edits[id] || {}), ...sharedPart(DEFAULTS), ...s.shared }
}

// Called whenever the panel values change: file them under the active design.
export function record(P) {
  const s = useDesigns.getState()
  if (!find(s.active, s)) return
  useDesigns.setState({
    edits: { ...s.edits, [s.active]: diff(designPart(P), baseOf(s.active, s)) },
    shared: diff(sharedPart(P), DEFAULTS),
  })
}

// The setters below return the design values to push into the panel.
export function switchTo(id) {
  const s = useDesigns.getState()
  if (!find(id, s)) return null
  useDesigns.setState({ active: id })
  return designPart(paramsOf(id))
}

export function step(dir) {
  const list = allDesigns()
  const i = list.findIndex((d) => d.id === useDesigns.getState().active)
  return switchTo(list[(i + dir + list.length) % list.length].id)
}

export function createFrom(P, name) {
  const s = useDesigns.getState()
  const id = `c${Date.now().toString(36)}`
  useDesigns.setState({
    custom: [...s.custom, { id, name, params: diff(designPart(P), DEFAULTS) }],
    edits: { ...s.edits, [id]: {} },
    active: id,
  })
  return designPart(paramsOf(id))
}

export function rename(id, name) {
  const s = useDesigns.getState()
  useDesigns.setState({ custom: s.custom.map((d) => (d.id === id ? { ...d, name } : d)) })
}

export function remove(id) {
  const s = useDesigns.getState()
  const { [id]: _, ...edits } = s.edits
  useDesigns.setState({ custom: s.custom.filter((d) => d.id !== id), edits })
  return s.active === id ? switchTo('a') : null
}

export function resetActive() {
  const s = useDesigns.getState()
  useDesigns.setState({ edits: { ...s.edits, [s.active]: {} } })
  return designPart(paramsOf(s.active))
}

// Guide-board variants (independent of the wall design).
export const SIGN_STYLES = [
  { id: 'plates', name: '1 · Plates', note: 'stacked floor plates, unit plates screwed on' },
  { id: 'rail', name: '2 · Rail & cassettes', note: 'floor cassettes on two posts, unit inserts slide out sideways' },
  { id: 'spine', name: '3 · Hexagons & chevrons', note: 'hexagon floor plates and chevron unit tags, each floor on its own bar' },
]

export const isBuiltin = (id) => BUILTIN.some((d) => d.id === id)

if (import.meta.env.DEV) window.__designs = { useDesigns, switchTo, resetActive, paramsOf }

// Hot-swapping this module would let the old panel values be written into the
// new store (undoing the migration), so reload the page instead.
if (import.meta.hot) import.meta.hot.accept(() => location.reload())
