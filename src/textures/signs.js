// Canvas textures for the floor directory plates (Persian RTL or English).
import * as THREE from 'three'
import { drawFloorGlyph } from './floorGlyphs'
import { bridgeIslands } from './laserCut'

// Sign typefaces. Vazirmatn comes from Google Fonts (index.html); Shabnam is
// self-hosted in public/fonts/shabnam (@font-face in styles.css).
export const SIGN_FONTS = [
  { id: 'vazirmatn', name: 'Vazirmatn', family: 'Vazirmatn' },
  { id: 'shabnam', name: 'Shabnam', family: 'Shabnam' },
]
const FALLBACK = 'Tahoma, "Geeza Pro", sans-serif'
export const fontStack = (id) => {
  const f = SIGN_FONTS.find((x) => x.id === id) || SIGN_FONTS[0]
  return `${f.family}, ${FALLBACK}`
}
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
export const toFa = (s) => String(s).replace(/\d/g, (d) => FA_DIGITS[d])

// `cut`: the plate is laser-cut where its light text is, with a white board behind
// it, so that text shows white through the plate (see plateFace below).
export const SIGN_MATERIALS = {
  blackSteel: { base: '#1c1d1f', text: '#f3f2ee', sub: '#a9aaad', metalness: 0.35, roughness: 0.5, edge: '#2a2b2e', cut: true },
  stainless: { base: '#c3c5c8', text: '#18191b', sub: '#4a4c50', metalness: 0.85, roughness: 0.3, edge: '#9a9ca0', brushed: true },
  whiteAcrylic: { base: '#f7f7f4', text: '#1b1c1e', sub: '#62646a', metalness: 0, roughness: 0.16, edge: '#e4e6e3' },
  blackAcrylic: { base: '#121213', text: '#ffffff', sub: '#b4b5b8', metalness: 0, roughness: 0.1, edge: '#1e1f21', cut: true },
}
export const WHITE_BOARD = '#f4f3ef'

const TEXT = {
  fa: { floor: 'طبقه', unit: 'واحد', name: 'نام واحد' },
  en: { floor: 'FLOOR', unit: 'UNIT', name: 'Unit name' },
}

const PPM = 2000 // canvas pixels per metre (high enough for clean laser-cut edges)
const CLEAR = 'rgba(0,0,0,0)'
const BRIDGE = 0.0025 // laser bridge width (m) holding counters such as م و ه in place

function makeCanvas(wm, hm) {
  const c = document.createElement('canvas')
  c.width = Math.round(wm * PPM)
  c.height = Math.round(hm * PPM)
  return [c, c.getContext('2d')]
}

function fillBase(ctx, w, h, m, ink) {
  ctx.fillStyle = ink(m.base)
  ctx.fillRect(0, 0, w, h)
  if (m.brushed) {
    for (let i = 0; i < h * 3; i++) {
      const y = Math.random() * h
      ctx.fillStyle = ink(`rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`)
      ctx.fillRect(0, y, w, 2)
    }
  }
}

// Set the font and shrink it until the text fits maxW.
function fit(ctx, font, text, maxW, size, weight) {
  let s = size
  for (; s > 10; s -= 2) {
    ctx.font = `${weight} ${s}px ${font}`
    if (ctx.measureText(text).width <= maxW) break
  }
  return s
}

function toTexture(c, color = true) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 8
  return t
}

// Draw a plate face. `draw(ctx, ink)` paints everything with `ctx.fillStyle = ink(colour)`,
// and light text with `ink(colour, true)`. On a `cut` material that text is left off the
// face and drawn into a second canvas instead, as a hole in an alpha mask (white = plate,
// black = cut out), so the white board behind shows through. Any plate left loose inside
// a cut (an island) gets a thin straight bridge, so the plate stays in one piece.
// Returns { map, alpha } (alpha is null for plates that are not cut).
function plateFace(wm, hm, m, draw) {
  const [c, ctx] = makeCanvas(wm, hm)
  draw(ctx, (colour, cut) => (cut && m.cut ? CLEAR : colour))
  if (!m.cut) return { map: toTexture(c), alpha: null }
  const [mc, mctx] = makeCanvas(wm, hm)
  mctx.fillStyle = '#ffffff'
  mctx.fillRect(0, 0, mc.width, mc.height)
  draw(mctx, (colour, cut) => (cut ? '#000000' : CLEAR))
  bridgeIslands(mctx, BRIDGE * PPM)
  return { map: toTexture(c), alpha: toTexture(mc, false) }
}

export const disposeFace = (f) => {
  f?.map?.dispose()
  f?.alpha?.dispose()
}

// Floor number: the custom laser-cut numerals for Persian, the sign font for English.
// `h` is the numeral height in px; `breakout` lets a numeral run off the plate edge.
function floorNumber(ctx, font, floor, lang, cx, cy, h, breakout = false) {
  if (lang === 'fa' && drawFloorGlyph(ctx, floor, cx, cy, h, { breakout })) return
  const num = lang === 'fa' ? toFa(floor) : String(floor)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  fit(ctx, font, num, h * 1.2, h * 1.25, 800)
  ctx.fillText(num, cx, cy + h * 0.06)
}

// Floor carrier plate: floor-number panel on the reading-start side; the rest is
// where the two unit plates sit.
export function floorCarrierTexture({ font, w, h, zoneW, floor, lang, material, accent }) {
  const m = SIGN_MATERIALS[material]
  const T = TEXT[lang]
  const rtl = lang === 'fa'
  return plateFace(w, h, m, (ctx, ink) => {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    fillBase(ctx, W, H, m, ink)
    const zw = zoneW * PPM
    const zx = rtl ? W - zw : 0
    ctx.fillStyle = ink(accent)
    ctx.fillRect(zx, 0, zw, H)
    ctx.fillStyle = ink('#ffffff', true)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.direction = rtl ? 'rtl' : 'ltr'
    fit(ctx, font, T.floor, zw * 0.8, H * 0.16, 600)
    ctx.fillText(T.floor, zx + zw / 2, H * 0.22)
    floorNumber(ctx, font, floor, lang, zx + zw / 2, H * 0.62, H * 0.5)
  })
}

// Replaceable unit plate: floor + unit number, unit name.
export function unitTexture({ font, w, h, floor, unitNo, name, lang, material, accent }) {
  const m = SIGN_MATERIALS[material]
  const T = TEXT[lang]
  const rtl = lang === 'fa'
  return plateFace(w, h, m, (ctx, ink) => {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    fillBase(ctx, W, H, m, ink)
    const pad = H * 0.12
    const bar = Math.max(6, H * 0.05)
    ctx.fillStyle = ink(accent)
    ctx.fillRect(rtl ? W - bar : 0, 0, bar, H)

    const x = rtl ? W - bar - pad : bar + pad
    const maxW = W - bar - 2 * pad
    ctx.textAlign = rtl ? 'right' : 'left'
    ctx.textBaseline = 'middle'
    ctx.direction = rtl ? 'rtl' : 'ltr'

    const n = (v) => (rtl ? toFa(v) : v)
    const tag = `${T.unit} ${n(unitNo)}   ·   ${T.floor} ${n(floor)}`
    ctx.fillStyle = ink(accent)
    fit(ctx, font, tag, maxW, H * 0.13, 600)
    ctx.fillText(tag, x, H * 0.24)

    const nm = name?.trim() || T.name
    ctx.fillStyle = ink(name?.trim() ? m.text : m.sub, true)
    fit(ctx, font, nm, maxW, H * 0.32, 800)
    ctx.fillText(nm, x, H * 0.62)
  })
}

// ---- Guide board 2 · Rail & cassettes ------------------------------------

// Centre floor tile: just the small "floor" label; the numeral is a separate raised piece.
export function railTileTexture({ font, w, h, lang, material }) {
  const m = SIGN_MATERIALS[material]
  const T = TEXT[lang]
  return plateFace(w, h, m, (ctx, ink) => {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    fillBase(ctx, W, H, m, ink)
    ctx.fillStyle = ink(m.sub, true)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.direction = lang === 'fa' ? 'rtl' : 'ltr'
    fit(ctx, font, T.floor, W * 0.8, H * 0.12, 600)
    ctx.fillText(T.floor, W / 2, H * 0.15)
  })
}

// Raised laser-cut floor numeral (white mask; the material gives it its colour).
// One piece with no loose bits (see floorGlyphs.js).
export function railNumeralTexture({ font, w, h, floor, lang }) {
  const [c, ctx] = makeCanvas(w, h)
  ctx.fillStyle = '#ffffff'
  floorNumber(ctx, font, floor, lang, c.width / 2, c.height * 0.58, c.height * 0.6)
  return toTexture(c)
}

// Slide-in unit insert: number block on the reading-start side, then the unit name.
// `inset` (m) keeps the text clear of shaped plate ends (used by the chevron tags).
export function railInsertTexture({ font, w, h, floor, unitNo, name, lang, material, accent, inset = 0 }) {
  const m = SIGN_MATERIALS[material]
  const T = TEXT[lang]
  const rtl = lang === 'fa'
  return plateFace(w, h, m, (ctx, ink) => {
    fillBase(ctx, ctx.canvas.width, ctx.canvas.height, m, ink)
    const ip = inset * PPM
    ctx.translate(ip, 0)
    const W = ctx.canvas.width - 2 * ip
    const H = ctx.canvas.height
    const n = (v) => (rtl ? toFa(v) : v)
    ctx.textBaseline = 'middle'
    ctx.direction = rtl ? 'rtl' : 'ltr'

    // number block
    const nb = Math.min(W * 0.3, H * 1.2)
    const bx = rtl ? W - nb / 2 : nb / 2
    ctx.textAlign = 'center'
    ctx.fillStyle = ink(m.sub, true)
    fit(ctx, font, T.unit, nb * 0.8, H * 0.11, 600)
    ctx.fillText(T.unit, bx, H * 0.2)
    ctx.fillStyle = ink(accent)
    fit(ctx, font, n(unitNo), nb * 0.82, H * 0.36, 800)
    ctx.fillText(n(unitNo), bx, H * 0.48)
    ctx.fillStyle = ink(m.sub, true)
    const fl = `${T.floor} ${n(floor)}`
    fit(ctx, font, fl, nb * 0.8, H * 0.12, 400)
    ctx.fillText(fl, bx, H * 0.78)

    // divider
    const dx = rtl ? W - nb : nb
    const dw = 0.003 * PPM
    ctx.fillStyle = ink(accent)
    ctx.fillRect(dx - dw / 2, H * 0.16, dw, H * 0.68)

    // unit name
    const pad = H * 0.1
    const x = rtl ? W - nb - pad : nb + pad
    const maxW = W - nb - 2 * pad
    ctx.textAlign = rtl ? 'right' : 'left'
    const nm = name?.trim() || T.name
    ctx.fillStyle = ink(name?.trim() ? m.text : m.sub, true)
    fit(ctx, font, nm, maxW, H * 0.28, 800)
    ctx.fillText(nm, x, H * 0.52)
  })
}

// ---- Guide board 3 · Hexagons & chevrons ------------------------------------

// Hexagonal floor plate: accent metal with the floor numeral laser-cut through it, so the
// white board behind shows the number. Some numerals run out through the plate edge
// ("break the frame"); the plate geometry is cut there too (see plateGeometry).
export function hexFloorTexture({ font, w, h, floor, lang, accent }) {
  return plateFace(w, h, { base: accent, cut: true }, (ctx, ink) => {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    ctx.fillStyle = ink(accent)
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = ink('#ffffff', true)
    floorNumber(ctx, font, floor, lang, W / 2, H * 0.52, H * 0.72, true)
  })
}
