// Real (3D) expanded metal: every strand is a ribbon tilted about its own axis,
// like a sheet that has been slit and stretched. Seen at an angle the strands
// read as louvres with gaps between them, instead of a flat printed pattern.
//
// Built in panel space (u = plan position y, v = arc length along the canopy
// profile, w = offset along the inward normal) and then bent onto the profile,
// so it follows wall -> bend -> ceiling exactly like the ribs.
import * as THREE from 'three'
import { profileAt, toWorld } from './ribPath'

// Clip segment A->B to the rectangle (Liang-Barsky). Returns [t0, t1] or null.
function clip(ax, ay, bx, by, x0, x1, y0, y1) {
  let t0 = 0
  let t1 = 1
  const dx = bx - ax
  const dy = by - ay
  for (const [p, q] of [
    [-dx, ax - x0],
    [dx, x1 - ax],
    [-dy, ay - y0],
    [dy, y1 - ay],
  ]) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return null
    } else {
      const r = q / p
      if (p < 0) t0 = Math.max(t0, r)
      else t1 = Math.min(t1, r)
    }
  }
  return t1 - t0 > 1e-6 ? [t0, t1] : null
}

export const strandDepth = (P) => (P.mesh3D ? P.meshStrandW * Math.sin((P.meshTilt * Math.PI) / 180) : 0)

export function expandedMetalGeometry(P, prof, y0, y1) {
  const cw = Math.max(0.005, P.meshCellW) // long way of the diamond, along the wall
  const ch = Math.max(0.003, P.meshCellH) // short way, along the profile
  const sw = P.meshStrandW
  const tilt = (P.meshTilt * Math.PI) / 180
  // the profile may be a slice (panel above / below a break), so clip to its own v range
  const vMin = prof.pts[0].v
  const vMax = prof.pts[prof.pts.length - 1].v
  const ext = sw * 0.35 // strands run a little into the knots so the joints read solid
  const half = (sw / 2) * Math.cos(tilt) // in-plane half width
  const rise = sw * Math.sin(tilt) // how far the high edge stands proud of the sheet

  const pos = []
  const idx = []
  const tmp = new THREE.Vector3()
  const put = (u, v, w) => {
    tmp.copy(toWorld(P, prof, profileAt(prof, v), u, w))
    pos.push(tmp.x, tmp.y, tmp.z)
  }

  const rows = Math.ceil(vMax / (ch / 2)) + 2
  const cols = Math.ceil((y1 - y0) / cw) + 2
  for (let k = Math.floor(vMin / (ch / 2)) - 1; k < rows; k++) {
    const v = (k * ch) / 2
    const shift = (k & 1) * (cw / 2)
    for (let m = -1; m < cols; m++) {
      const u = y0 + m * cw + shift
      // each knot sends one strand up-right and one up-left
      for (const dir of [1, -1]) {
        const bu = u + (dir * cw) / 2
        const bv = v + ch / 2
        const L = Math.hypot(cw / 2, ch / 2)
        const du = (dir * cw) / 2 / L
        const dv = ch / 2 / L
        const au = u - du * ext
        const av = v - dv * ext
        const eu = bu + du * ext
        const ev = bv + dv * ext
        const c = clip(au, av, eu, ev, y0, y1, vMin, vMax)
        if (!c) continue
        const [t0, t1] = c
        const pu = au + (eu - au) * t0
        const pv = av + (ev - av) * t0
        const qu = au + (eu - au) * t1
        const qv = av + (ev - av) * t1
        // in-plane perpendicular, always leaning "up" the profile so every strand
        // tilts the same way, as in a real stretched sheet
        let nu = -dv
        let nv = du
        if (nv < 0) (nu = -nu), (nv = -nv)
        const base = pos.length / 3
        // low edge on the sheet plane, high edge standing proud toward the room
        put(pu - nu * half, pv - nv * half, 0)
        put(qu - nu * half, qv - nv * half, 0)
        put(qu + nu * half, qv + nv * half, rise)
        put(pu + nu * half, pv + nv * half, rise)
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
