// Shared canopy profile: wall (vertical) -> fillet -> ceiling run -> optional far-end drop.
// Ribs and mesh panels are both generated from this, so they always line up.
//
// Profile space: s = horizontal distance from the mesh plane into the room,
// z = height. (ns, nz) = unit normal pointing to the inside of the canopy.
import * as THREE from 'three'

const ARC_SEG = 20

export function buildProfile(P, zBottom) {
  const pts = []
  const Zc = P.canopyHeight
  const r = Math.max(0.01, Math.min(P.filletRadius, Zc - zBottom - 0.01))
  const D = Math.max(0, P.ceilingRun)
  const push = (s, z, ns, nz) => pts.push({ s, z, ns, nz })

  push(0, zBottom, 1, 0)
  push(0, Zc - r, 1, 0)
  for (let i = 1; i <= ARC_SEG; i++) {
    const th = (i / ARC_SEG) * (Math.PI / 2)
    push(r - r * Math.cos(th), Zc - r + r * Math.sin(th), Math.cos(th), -Math.sin(th))
  }
  if (D > 0.001) push(r + D, Zc, 0, -1)
  if (P.returnDrop > 0.005) {
    const rr = Math.max(0.01, Math.min(P.returnRadius, P.returnDrop))
    for (let i = 1; i <= ARC_SEG; i++) {
      const ph = (i / ARC_SEG) * (Math.PI / 2)
      push(r + D + rr * Math.sin(ph), Zc - rr + rr * Math.cos(ph), -Math.sin(ph), -Math.cos(ph))
    }
    if (P.returnDrop - rr > 0.005) push(r + D + rr, Zc - P.returnDrop, -1, 0)
  }
  let v = 0
  pts.forEach((p, i) => {
    if (i) v += Math.hypot(p.s - pts[i - 1].s, p.z - pts[i - 1].z)
    p.v = v
  })
  return { pts, sA: r, D }
}

// Profile point at arc length v (linear between the profile samples).
export function profileAt(prof, v) {
  const pts = prof.pts
  let lo = 0
  let hi = pts.length - 1
  if (v <= pts[0].v) return pts[0]
  if (v >= pts[hi].v) return pts[hi]
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (pts[mid].v <= v) lo = mid
    else hi = mid
  }
  const a = pts[lo]
  const b = pts[hi]
  const t = (v - a.v) / Math.max(1e-9, b.v - a.v)
  const ns = a.ns + (b.ns - a.ns) * t
  const nz = a.nz + (b.nz - a.nz) * t
  const nl = Math.hypot(ns, nz) || 1
  return { s: a.s + (b.s - a.s) * t, z: a.z + (b.z - a.z) * t, ns: ns / nl, nz: nz / nl, v }
}

// Part of a profile between arc lengths v0 and v1 (v values kept, so mesh
// patterns stay continuous across a break).
export function sliceProfile(prof, v0, v1) {
  const inner = prof.pts.filter((p) => p.v > v0 + 1e-6 && p.v < v1 - 1e-6)
  return { ...prof, pts: [profileAt(prof, v0), ...inner, profileAt(prof, v1)] }
}

// Arc length of the profile at horizontal distance `s` along the ceiling run
// (null when s is not on the straight ceiling part).
export function ceilingV(prof, s) {
  const r = prof.sA
  if (s < r + 1e-6 || s > r + prof.D - 1e-6) return null
  return prof.pts[1].v + (Math.PI / 2) * r + (s - r)
}

// Cut the sheet into separate panels: `gaps` are [v0, v1] arc-length ranges left open.
export function cutProfile(prof, gaps) {
  const vMax = prof.pts[prof.pts.length - 1].v
  const pieces = []
  let v = 0
  ;[...gaps].sort((a, b) => a[0] - b[0]).forEach(([g0, g1]) => {
    if (g0 - v > 0.02) pieces.push(sliceProfile(prof, v, g0))
    v = Math.max(v, g1)
  })
  if (vMax - v > 0.02) pieces.push(sliceProfile(prof, v, vMax))
  return pieces.length ? pieces : [prof]
}

// Profile point (+ offset k along the inward normal) at plan position y -> Rhino world.
export function toWorld(P, prof, p, y, k = 0) {
  const s = p.s + p.ns * k
  const z = p.z + p.nz * k
  const t = Math.min(1, Math.max(0, (s - prof.sA) / Math.max(prof.D, 1e-3)))
  const yy = y + (y - P.featureY) * P.fanSpread * t
  return new THREE.Vector3(P.wallX - P.meshOffset - s, yy, z)
}

// Ruled surface between plan positions y0 and y1, following the profile.
// UV in metres: u = y, v = arc length along the profile.
export function panelGeometry(P, prof, y0, y1) {
  const pos = []
  const uv = []
  const idx = []
  prof.pts.forEach((p) => {
    for (const y of [y0, y1]) {
      const w = toWorld(P, prof, p, y)
      pos.push(w.x, w.y, w.z)
      uv.push(y, p.v)
    }
  })
  for (let i = 0; i < prof.pts.length - 1; i++) {
    const a = i * 2
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// Sweep a rectangle along frames [{ p, n, b }]: width w along b, from k0 to k1 along n.
export function sweepRect(frames, w, k0, k1) {
  const pos = []
  const idx = []
  const corners = frames.map(({ p, n, b }) => {
    const A = p.clone().addScaledVector(b, -w / 2)
    const B = p.clone().addScaledVector(b, w / 2)
    return [
      A.clone().addScaledVector(n, k0),
      B.clone().addScaledVector(n, k0),
      B.clone().addScaledVector(n, k1),
      A.clone().addScaledVector(n, k1),
    ]
  })
  // four sides, each with its own vertices for crisp edges
  for (let side = 0; side < 4; side++) {
    const base = pos.length / 3
    corners.forEach((c) => {
      const p0 = c[side]
      const p1 = c[(side + 1) % 4]
      pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z)
    })
    for (let i = 0; i < corners.length - 1; i++) {
      const a = base + i * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  // end caps
  for (const c of [corners[0], corners[corners.length - 1]]) {
    const base = pos.length / 3
    c.forEach((p) => pos.push(p.x, p.y, p.z))
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

const Y = new THREE.Vector3(0, 1, 0)

export function ribGeometry(P, prof, y) {
  const frames = prof.pts.map((p) => ({
    p: toWorld(P, prof, p, y),
    n: new THREE.Vector3(-p.ns, 0, p.nz).normalize(),
    b: Y,
  }))
  return sweepRect(frames, P.ribWidth, ...ribSpan(P))
}

// Cross bar from y0 to y1 at the start (bottom, on the plinth) or end (free edge
// of the canopy) of the profile, set just inside the sheet edge.
export function crossBarGeometry(P, prof, y0, y1, at = 'end') {
  const pts = prof.pts
  const edge = at === 'end' ? pts[pts.length - 1] : pts[0]
  const inner = at === 'end' ? pts[pts.length - 2] : pts[1]
  const n = new THREE.Vector3(-edge.ns, 0, edge.nz).normalize()
  const frames = [y0, y1].map((y) => {
    const p = toWorld(P, prof, edge, y)
    const b = toWorld(P, prof, inner, y).sub(p).normalize() // points into the sheet
    return { p: p.addScaledVector(b, P.ribWidth / 2), n, b }
  })
  return sweepRect(frames, P.ribWidth, ...ribSpan(P))
}

export const endTrimGeometry = (P, prof, y0, y1) => crossBarGeometry(P, prof, y0, y1, 'end')

// Offset range of a profile along the inward normal of the mesh surface.
// Behind: sits between the mesh and the wall/ceiling (negative = away from the viewer).
// In front: sits on the room side of the mesh.
export function ribSpan(P) {
  const gap = 0.003 // keeps the steel from touching/flickering with the mesh plane
  return P.ribsBehind ? [-gap - P.ribDepth, -gap] : [0, P.ribDepth]
}

// Box in Rhino world coords with UVs = world position in metres
// (so textures line up across neighbouring pieces).
export function boxGeometry(min, max) {
  const dx = max[0] - min[0]
  const dy = max[1] - min[1]
  const dz = max[2] - min[2]
  const g = new THREE.BoxGeometry(Math.max(dx, 1e-4), Math.max(dy, 1e-4), Math.max(dz, 1e-4))
  g.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
  worldUV(g)
  return g
}

export function worldUV(g) {
  const pos = g.attributes.position
  const nor = g.attributes.normal
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i))
    const ay = Math.abs(nor.getY(i))
    const az = Math.abs(nor.getZ(i))
    let u, v
    if (ax >= ay && ax >= az) {
      u = pos.getY(i)
      v = pos.getZ(i)
    } else if (ay >= az) {
      u = pos.getX(i)
      v = pos.getZ(i)
    } else {
      u = pos.getX(i)
      v = pos.getY(i)
    }
    uv[i * 2] = u
    uv[i * 2 + 1] = v
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}

// Side plate closing the far-end drop of a section, in the plane of the section
// edge y. Seen from the side it fills from where the return bend starts out to
// the back of the tray (depth t), with the outer corner following the bend.
// Built in profile space (s, z) and bent onto the canopy like everything else.
export function finGeometry(P, prof, y, t, thick = 0.005) {
  const pts = prof.pts
  const end = pts[pts.length - 1]
  const Zc = P.canopyHeight
  const s0 = prof.sA + prof.D // start of the return bend
  const rr = Math.max(0.01, Math.min(P.returnRadius, P.returnDrop))
  const zb = end.z
  const shape = new THREE.Shape()
  shape.moveTo(s0, zb)
  shape.lineTo(s0, Zc + t)
  shape.absarc(s0, Zc - rr, rr + t, Math.PI / 2, 0, true)
  shape.lineTo(s0 + rr + t, zb)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 16 })
  const pos = g.attributes.position
  const p = { s: 0, z: 0, ns: 0, nz: 0 }
  for (let i = 0; i < pos.count; i++) {
    p.s = pos.getX(i)
    p.z = pos.getY(i)
    const w = toWorld(P, prof, p, y + pos.getZ(i) - thick / 2)
    pos.setXYZ(i, w.x, w.y, w.z)
  }
  g.computeVertexNormals()
  return g
}

// Plate standing on the free end of a section that stops on the ceiling,
// closing the gap up to the ceiling above it (e.g. the stair void).
export function endPlateGeometry(P, prof, y0, y1, top, t = 0.005) {
  const end = prof.pts[prof.pts.length - 1]
  const a = toWorld(P, prof, end, y0)
  const b = toWorld(P, prof, end, y1)
  return boxGeometry([a.x - t, a.y, end.z], [a.x, b.y, top])
}
