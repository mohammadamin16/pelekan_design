// Procedural, tileable canvas textures: red marble cladding, travertine floor,
// expanded-metal mesh. No external assets needed.
import * as THREE from 'three'

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Periodic value noise; px/py = lattice period (integer) so the result tiles on [0,1).
function periodicNoise(seed, px, py) {
  const rand = mulberry32(seed)
  const g = new Float32Array(px * py)
  for (let i = 0; i < g.length; i++) g[i] = rand()
  return (u, v) => {
    const x = u * px
    const y = v * py
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const sx = xf * xf * (3 - 2 * xf)
    const sy = yf * yf * (3 - 2 * yf)
    const ix = ((xi % px) + px) % px
    const iy = ((yi % py) + py) % py
    const ix1 = (ix + 1) % px
    const iy1 = (iy + 1) % py
    const a = g[iy * px + ix]
    const b = g[iy * px + ix1]
    const c = g[iy1 * px + ix]
    const d = g[iy1 * px + ix1]
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
  }
}

function fbm(seed, bx, by, octaves) {
  const layers = []
  for (let o = 0; o < octaves; o++) layers.push(periodicNoise(seed + o * 101, bx << o, by << o))
  return (u, v) => {
    let sum = 0
    let amp = 0.5
    let norm = 0
    for (const n of layers) {
      sum += n(u, v) * amp
      norm += amp
      amp *= 0.5
    }
    return sum / norm
  }
}

const mix = (a, b, t) => a + (b - a) * t
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t)
const smooth = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

function toTexture(canvas, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

// Red/brown marble cladding. One texture = 8 courses wide x 4 courses tall.
// Each slab samples the noise field at its own offset so slabs read as separate cuts.
export function makeMarbleTexture(w = 2048, h = 1024) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(w, h)
  const cloud = fbm(7, 6, 6, 6)
  const streak = fbm(19, 5, 9, 5)
  const vein = fbm(31, 5, 8, 6)
  const fine = fbm(53, 96, 64, 2)
  const rand = mulberry32(99)
  const courses = 4
  const rows = []
  for (let r = 0; r < courses; r++) {
    const n = 2 + Math.floor(rand() * 2)
    const start = rand()
    const cuts = Array.from({ length: n }, (_, k) => (start + k / n + (rand() - 0.5) * 0.12 + 1) % 1).sort()
    rows.push({ cuts, slabs: cuts.map(() => ({ ou: rand(), ov: rand(), tone: 0.93 + rand() * 0.14, warm: rand() })) })
  }
  const dark = [88, 34, 20]
  const base = [136, 58, 35]
  const light = [176, 92, 58]
  const pale = [206, 142, 104]
  const veinC = [70, 28, 16]
  for (let y = 0; y < h; y++) {
    const v = y / h
    const row = Math.floor(v * courses)
    const R = rows[row]
    const py = (v * courses - row) * (h / courses)
    for (let x = 0; x < w; x++) {
      const u = x / w
      // which slab are we in?
      let si = R.cuts.length - 1
      for (let k = 0; k < R.cuts.length; k++) if (u >= R.cuts[k]) si = k
      const S = R.slabs[si]
      const su = (u + S.ou) % 1
      const sv = (v + S.ov) % 1
      const cl = cloud(su, sv)
      const st = streak(su, sv)
      const t = smooth(0.25, 0.78, cl * 0.7 + st * 0.3)
      let r = t < 0.5 ? mix(dark[0], base[0], t * 2) : mix(base[0], light[0], t * 2 - 1)
      let g = t < 0.5 ? mix(dark[1], base[1], t * 2) : mix(base[1], light[1], t * 2 - 1)
      let b = t < 0.5 ? mix(dark[2], base[2], t * 2) : mix(base[2], light[2], t * 2 - 1)
      const pl = smooth(0.66, 0.82, streak((su + 0.5) % 1, (sv + 0.31) % 1)) * 0.35
      r = mix(r, pale[0], pl)
      g = mix(g, pale[1], pl)
      b = mix(b, pale[2], pl)
      const vn = (1 - smooth(0.0, 0.015, Math.abs(vein(su, sv) - 0.5))) * 0.3
      r = mix(r, veinC[0], vn)
      g = mix(g, veinC[1], vn)
      b = mix(b, veinC[2], vn)
      const f = (fine(u, v) - 0.5) * 14
      const warm = (S.warm - 0.5) * 14
      r = (r + f + warm) * S.tone
      g = (g + f) * S.tone
      b = (b + f - warm * 0.5) * S.tone
      // pale groove line on each course joint (as in the Rhino render), shadow under it
      if (py < 2.5) {
        r = 214; g = 178; b = 160
      } else if (py < 4.5) {
        r *= 0.8; g *= 0.8; b *= 0.8
      }
      // slab joints: hairline
      for (const cu of R.cuts) {
        const dx = Math.abs(((u - cu + 1.5) % 1) - 0.5) * w
        if (dx < 1) {
          r *= 0.82; g *= 0.82; b *= 0.82
        }
      }
      const i = (y * w + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(c)
}

// Travertine tiles: texture = 8 rows (u / X) x 6 tiles (v / Y), running bond.
export function makeTravertineTexture(size = 1024) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(size, size)
  const rows = 8
  const perRow = 6
  const rand = mulberry32(4242)
  const palette = [
    [214, 208, 196],
    [200, 190, 172],
    [192, 189, 182],
    [226, 222, 212],
    [206, 197, 180],
    [182, 175, 162],
    [172, 167, 158],
  ]
  const tiles = []
  for (let r = 0; r < rows; r++) {
    tiles.push([])
    for (let k = 0; k < perRow; k++) {
      const p = palette[Math.floor(rand() * palette.length)]
      const j = 0.94 + rand() * 0.1
      tiles[r].push({ col: p.map((v) => v * j), seed: rand() })
    }
  }
  const pores = fbm(11, 24, 80, 3)
  const band = fbm(23, 2, 14, 4)
  const grain = fbm(77, 48, 48, 2)
  const groutW = 2
  const rowPx = size / rows
  const tilePx = size / perRow
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const row = Math.floor(x / rowPx)
      const off = row % 2 ? tilePx / 2 : 0
      const ty = (y + off) % size
      const k = Math.floor(ty / tilePx)
      const tile = tiles[row][k]
      const lx = x - row * rowPx
      const ly = ty - k * tilePx
      const u = x / size
      const v = y / size
      let [r, g, b] = tile.col
      // travertine banding runs along the tile length (v)
      const bd = (band(u, v) - 0.5) * 26
      const pr = pores(u, v)
      const pore = smooth(0.66, 0.72, pr) * 16
      const gr = (grain(u, v) - 0.5) * 10
      r += bd - pore + gr
      g += bd - pore * 1.05 + gr
      b += bd - pore * 1.15 + gr
      if (lx < groutW || ly < groutW) {
        r = 182; g = 176; b = 168
      } else if (lx < groutW + 1 || ly < groutW + 1) {
        r *= 0.93; g *= 0.93; b *= 0.93
      }
      const i = (y * size + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(c)
}

// Expanded metal: one diamond cell per texture tile. Returns { map, alphaMap }.
export function makeMeshTextures(strand = 0.16, size = 256) {
  const t = strand * (size / 2)
  const diamonds = (ctx, inset) => {
    const h = size / 2
    for (const [cx, cy] of [
      [h, h],
      [0, 0],
      [size, 0],
      [0, size],
      [size, size],
    ]) {
      ctx.beginPath()
      ctx.moveTo(cx, cy - h + inset)
      ctx.lineTo(cx + h - inset, cy)
      ctx.lineTo(cx, cy + h - inset)
      ctx.lineTo(cx - h + inset, cy)
      ctx.closePath()
      ctx.fill()
    }
  }
  // alpha: white = metal, black = hole
  const a = document.createElement('canvas')
  a.width = a.height = size
  const actx = a.getContext('2d')
  actx.fillStyle = '#fff'
  actx.fillRect(0, 0, size, size)
  actx.fillStyle = '#000'
  diamonds(actx, t)

  // colour: light strand centre, darker edges for a bit of depth
  const m = document.createElement('canvas')
  m.width = m.height = size
  const mctx = m.getContext('2d')
  mctx.fillStyle = '#f2f2f2'
  mctx.fillRect(0, 0, size, size)
  mctx.fillStyle = '#b4b4b4'
  diamonds(mctx, t * 0.5)
  mctx.fillStyle = '#6a6a6a'
  diamonds(mctx, t * 0.9)

  return { map: toTexture(m), alphaMap: toTexture(a, false) }
}
