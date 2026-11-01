// The corridor as drawn in karimkhan 006.3dm, measured object by object (Rhino
// coords, metres). Used when Room → plan is "Rhino 006": feature wall with its
// marble-lined niches, columns and caps, the door in the stair column, the
// stairs and landing, the slab void over the stairs, the parking bays behind
// the columns and the lower area past y 19.92.
import * as THREE from 'three'
import { boxGeometry } from './ribPath'

const SLAB = 2.5 // underside of the slab
const VOID_TOP = 2.7 // ceiling over the stairs

// feature wall: 350 thick, niches 150 deep from floor to slab
const WALL = { face: -10.887, back: -10.537, niche: -10.737, y0: 0, y1: 19.92, startFace: -10.837 }
const NICHES = [
  [0.2, 3.7],
  [4.57, 6.87],
  [7.78, 11.58],
  [12.26, 16.46],
  [17.29, 19.22],
]
const SHEET = 0.003 // marble lining
const LINING_TOP = 2.3
const BASE = { h: 0.3, d: 0.02 } // baseboard on the piers
const TRIM = { x0: -10.897, y0: 7.78, y1: 19.92, z0: 2.31, z1: 2.35 } // dark strip

// columns floor to slab (2.30 + 200 mm cap): [x0, x1, y0, y1]
export const COLS = [
  [-16.097, -15.187, -1.37, -0.5],
  [-16.097, -15.187, 3.7, 4.57],
  [-16.097, -15.187, 6.82, 7.78],
  [-16.097, -15.187, 7.78, 8.48],
  [-16.787, -16.097, 7.07, 8.48],
  [-15.587, -14.287, 8.48, 8.8],
  [-15.587, -14.287, 9.77, 10.27],
  [-16.787, -15.187, 11.525, 12.315],
  [-16.097, -15.187, 16.46, 17.29],
]
const DOOR_COL = [-15.587, -14.387, 8.8, 9.77] // column with the double door

// walls of the bays behind the columns, floor to slab: [x0, x1, y0, y1]
const WALLS = [
  [-21.297, -16.787, 7.07, 7.27],
  [-21.297, -21.097, -1.135, 7.27],
  [-21.297, -16.097, -1.135, -0.935],
  [-21.297, -15.187, 19.72, 19.92],
  [-21.297, -21.097, 12.06, 19.92],
  [-21.297, -16.787, 12.06, 12.26],
  [-21.097, -16.097, 16.66, 16.86],
  [-16.987, -16.787, 7.27, 12.06],
  [-15.387, -15.187, 17.29, 19.72],
]

// stairs up to the landing (170 risers, 300 treads)
const STAIR = { y0: 10.27, y1: 11.525, x: -14.387, tread: 0.3, rise: 0.17, steps: 4 }
const LANDING = [-16.787, -15.587, 8.48, 11.525, 0.85]

// opening in the slab over the stairs, closed at 2.70
const VOID = [
  [-16.787, 8.48],
  [-15.587, 8.48],
  [-15.587, 10.27],
  [-15.187, 10.27],
  [-15.187, 11.58],
  [-16.787, 11.58],
]
const VOID_BEAM = [-16.987, -16.787, 8.48, 11.58]

const SLAB_RECT = { x0: -21.297, x1: -10.537, y0: -1.135, y1: 19.92 }
const LOWER = { x0: -18.589, x1: -10.887, y0: 19.92, y1: 27.881, z: -0.6 }

const inside = (x, y, poly) => {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

// Height of the ceiling above a plan point (the canopy end plates close up to it).
export function ceilingAt(P, x, y) {
  if (P.roomPlan === 'rhino006') return inside(x, y, VOID) ? VOID_TOP : SLAB
  return P.ceilingHeight
}

// Plan boxes the walk mode collides with.
export const OBSTACLES = [
  ...COLS,
  DOOR_COL,
  ...WALLS,
  [STAIR.x - STAIR.tread * STAIR.steps, STAIR.x, STAIR.y0, STAIR.y1],
  LANDING.slice(0, 4),
].map(([x0, x1, y0, y1]) => ({ x0, x1, y0, y1 }))

export function rhino006Room(P) {
  const list = []
  const box = (key, min, max, mat, opts = {}) =>
    list.push({ key, geometry: boxGeometry(min, max), mat, receive: true, cast: opts.cast ?? true, ceiling: opts.ceiling })

  // floor: corridor slab, and the lower area 600 down past the end of the wall
  box('floor', [SLAB_RECT.x0, -8, -0.4], [SLAB_RECT.x1, SLAB_RECT.y1, 0], 'floor', { cast: false })
  box('floor-low', [LOWER.x0, LOWER.y0, LOWER.z - 0.4], [LOWER.x1, LOWER.y1, LOWER.z], 'floor', { cast: false })
  box('low-wall', [LOWER.x1, LOWER.y0, LOWER.z - 0.4], [-10.629, LOWER.y1, SLAB], 'marble')
  box('low-end', [LOWER.x0, LOWER.y1, LOWER.z - 0.4], [-10.628, 28.139, SLAB], 'marble')

  // ceiling with the opening over the stairs (faces down, so the top view sees in)
  const shape = new THREE.Shape()
  const R = SLAB_RECT
  // built mirrored in y, then flipped over so the face points down
  shape.moveTo(R.x0, -R.y0).lineTo(R.x1, -R.y0).lineTo(R.x1, -R.y1).lineTo(R.x0, -R.y1).closePath()
  const hole = new THREE.Path()
  VOID.forEach(([x, y], i) => (i ? hole.lineTo(x, -y) : hole.moveTo(x, -y)))
  hole.closePath()
  shape.holes.push(hole)
  const ceil = new THREE.ShapeGeometry(shape)
  ceil.rotateX(Math.PI)
  ceil.translate(0, 0, SLAB)
  list.push({ key: 'ceil', geometry: ceil, mat: 'ceiling', receive: true, ceiling: true })
  // the void: top at 2.70, its edges, and the beam along the stair wall
  box('void-top', [VOID_BEAM[0], VOID_BEAM[2], VOID_TOP], [-15.187, VOID_BEAM[3], VOID_TOP + 0.2], 'ceiling', { ceiling: true, cast: false })
  VOID.forEach(([xa, ya], i) => {
    const [xb, yb] = VOID[(i + 1) % VOID.length]
    if (xa === -16.787 && xb === -16.787) return // the beam covers this side
    const t = 0.02
    const min = [Math.min(xa, xb), Math.min(ya, yb), SLAB]
    const max = [Math.max(xa, xb), Math.max(ya, yb), VOID_TOP]
    // thicken outward (away from the opening)
    const mx = (xa + xb) / 2
    const my = (ya + yb) / 2
    if (xa === xb) inside(mx - t, my, VOID) ? (max[0] += t) : (min[0] -= t)
    else inside(mx, my - t, VOID) ? (max[1] += t) : (min[1] -= t)
    box(`void-edge${i}`, min, max, 'ceiling', { ceiling: true, cast: false })
  })
  box('void-beam', [VOID_BEAM[0], VOID_BEAM[2], SLAB], [VOID_BEAM[1], VOID_BEAM[3], VOID_TOP], 'plaster')

  // feature wall: plaster core and piers, marble-lined niches
  const W = WALL
  box('wall-core', [W.niche, W.y0, 0], [W.back, W.y1, SLAB], 'plaster')
  const piers = []
  let y = W.y0
  for (const [n0, n1] of NICHES) {
    if (n0 > y) piers.push([y, n0])
    y = n1
  }
  if (W.y1 > y) piers.push([y, W.y1])
  piers.forEach(([y0, y1], i) => {
    const face = y0 === W.y0 ? W.startFace : W.face
    box(`pier${i}`, [face, y0, 0], [W.niche, y1, SLAB], 'plaster')
    box(`base${i}`, [face - BASE.d, y0, 0], [face, y1, BASE.h], 'marble')
  })
  NICHES.forEach(([n0, n1], i) => {
    const f0 = n0 === 0.2 ? W.startFace : W.face
    box(`sheet${i}`, [W.niche - SHEET, n0, 0], [W.niche, n1, LINING_TOP], 'marble')
    box(`side${i}a`, [f0, n0, 0], [W.niche - SHEET, n0 + SHEET, LINING_TOP], 'marble')
    box(`side${i}b`, [W.face, n1 - SHEET, 0], [W.niche - SHEET, n1, LINING_TOP], 'marble')
    // baseboard turns into the niche
    box(`base-in${i}a`, [f0 - BASE.d, n0 + SHEET, 0], [W.niche - SHEET, n0 + SHEET + BASE.d, BASE.h], 'marble')
    box(`base-in${i}b`, [W.face - BASE.d, n1 - SHEET - BASE.d, 0], [W.niche - SHEET, n1 - SHEET, BASE.h], 'marble')
  })
  box('trim', [TRIM.x0, TRIM.y0, TRIM.z0], [W.niche, TRIM.y1, TRIM.z1], 'trim')

  // bays behind the columns
  WALLS.forEach(([x0, x1, y0, y1], i) => box(`bay-wall${i}`, [x0, y0, 0], [x1, y1, SLAB], 'plaster'))

  if (P.showColumns) {
    COLS.forEach(([x0, x1, y0, y1], i) => box(`col${i}`, [x0, y0, 0], [x1, y1, SLAB], 'plaster'))
    // stair column with a double door: leaf 1 set 100 in, leaf 2 set 50 in
    const [x0, x1, y0, y1] = DOOR_COL
    const back = x1 - 0.1
    const head = 2.024
    box('dcol', [x0, y0, 0], [back, y1, SLAB], 'plaster')
    box('dcol-j1', [back, y0, 0], [x1, y0 + 0.1, SLAB], 'plaster')
    box('dcol-j2', [back, y1 - 0.1, 0], [x1, y1, SLAB], 'plaster')
    box('dcol-head', [back, y0 + 0.1, head], [x1, y1 - 0.1, SLAB], 'plaster')
    box('door1', [back, y0 + 0.1, 0], [back + 0.005, 9.285, head], 'door')
    box('door2', [back, 9.285, 0], [back + 0.05, y1 - 0.1, head], 'door')
  }

  // stairs and landing
  for (let i = 0; i < STAIR.steps; i++) {
    const xa = STAIR.x - STAIR.tread * (i + 1)
    box(`step${i}`, [xa, STAIR.y0, 0], [xa + STAIR.tread, STAIR.y1, STAIR.rise * (i + 1)], 'plaster')
  }
  const [lx0, lx1, ly0, ly1, lh] = LANDING
  box('landing', [lx0, ly0, 0], [lx1, ly1, lh], 'plaster')

  return list
}
