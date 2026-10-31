// Canvas textures for the floor directory plates (Persian RTL or English).
import * as THREE from 'three'

export const FONT = 'Vazirmatn, Tahoma, "Geeza Pro", sans-serif'
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
export const toFa = (s) => String(s).replace(/\d/g, (d) => FA_DIGITS[d])

export const SIGN_MATERIALS = {
  blackSteel: { base: '#1c1d1f', text: '#f3f2ee', sub: '#a9aaad', metalness: 0.35, roughness: 0.5, edge: '#2a2b2e' },
  stainless: { base: '#c3c5c8', text: '#18191b', sub: '#4a4c50', metalness: 0.85, roughness: 0.3, edge: '#9a9ca0', brushed: true },
  whiteAcrylic: { base: '#f7f7f4', text: '#1b1c1e', sub: '#62646a', metalness: 0, roughness: 0.16, edge: '#e4e6e3' },
  blackAcrylic: { base: '#121213', text: '#ffffff', sub: '#b4b5b8', metalness: 0, roughness: 0.1, edge: '#1e1f21' },
}

const TEXT = {
  fa: { floor: 'طبقه', unit: 'واحد', name: 'نام واحد', branch: 'شعبه' },
  en: { floor: 'FLOOR', unit: 'UNIT', name: 'Unit name', branch: 'Branch' },
}

const PPM = 1000 // canvas pixels per metre

function makeCanvas(wm, hm) {
  const c = document.createElement('canvas')
  c.width = Math.round(wm * PPM)
  c.height = Math.round(hm * PPM)
  return [c, c.getContext('2d')]
}

function fillBase(ctx, w, h, m) {
  ctx.fillStyle = m.base
  ctx.fillRect(0, 0, w, h)
  if (m.brushed) {
    for (let i = 0; i < h * 3; i++) {
      const y = Math.random() * h
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`
      ctx.fillRect(0, y, w, 1)
    }
  }
}

// Set the font and shrink it until the text fits maxW.
function fit(ctx, text, maxW, size, weight) {
  let s = size
  for (; s > 10; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONT}`
    if (ctx.measureText(text).width <= maxW) break
  }
  return s
}

function toTexture(c) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

// Floor carrier plate: floor-number panel on the reading-start side; the rest is
// where the two unit plates sit.
export function floorCarrierTexture({ w, h, zoneW, floor, lang, material, accent }) {
  const m = SIGN_MATERIALS[material]
  const T = TEXT[lang]
  const rtl = lang === 'fa'
  const [c, ctx] = makeCanvas(w, h)
  const W = c.width
  const H = c.height
  fillBase(ctx, W, H, m)
  const zw = zoneW * PPM
  const zx = rtl ? W - zw : 0
  ctx.fillStyle = accent
  ctx.fillRect(zx, 0, zw, H)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.direction = rtl ? 'rtl' : 'ltr'
  fit(ctx, T.floor, zw * 0.8, H * 0.16, 600)
  ctx.fillText(T.floor, zx + zw / 2, H * 0.22)
  const num = rtl ? toFa(floor) : String(floor)
  fit(ctx, num, zw * 0.8, H * 0.58, 800)
  ctx.fillText(num, zx + zw / 2, H * 0.62)
  return toTexture(c)
}

// Replaceable unit plate: floor + unit number, unit name, branch.
export function unitTexture({ w, h, floor, unitNo, name, branch, lang, material, accent }) {
  const m = SIGN_MATERIALS[material]
  const T = TEXT[lang]
  const rtl = lang === 'fa'
  const [c, ctx] = makeCanvas(w, h)
  const W = c.width
  const H = c.height
  fillBase(ctx, W, H, m)
  const pad = H * 0.12
  const bar = Math.max(6, H * 0.05)
  ctx.fillStyle = accent
  ctx.fillRect(rtl ? W - bar : 0, 0, bar, H)

  const x = rtl ? W - bar - pad : bar + pad
  const maxW = W - bar - 2 * pad
  ctx.textAlign = rtl ? 'right' : 'left'
  ctx.textBaseline = 'middle'
  ctx.direction = rtl ? 'rtl' : 'ltr'

  const n = (v) => (rtl ? toFa(v) : v)
  const tag = `${T.unit} ${n(unitNo)}   ·   ${T.floor} ${n(floor)}`
  ctx.fillStyle = accent
  fit(ctx, tag, maxW, H * 0.13, 600)
  ctx.fillText(tag, x, H * 0.2)

  const nm = name?.trim() || T.name
  ctx.fillStyle = name?.trim() ? m.text : m.sub
  fit(ctx, nm, maxW, H * 0.27, 800)
  ctx.fillText(nm, x, H * 0.52)

  const br = branch?.trim() || T.branch
  ctx.fillStyle = m.sub
  fit(ctx, br, maxW, H * 0.15, 400)
  ctx.fillText(br, x, H * 0.81)
  return toTexture(c)
}
