// Guide board 3 · Spine & chevrons.
//
// Two hidden 20x40 bars behind the mesh (top + bottom of the board)
// └ 1 central vertical 20x40 spine on the mesh (20 side to the viewer), bolted through
//   └ 5 floor crossbars (20x40, 20 high facing the viewer), one bolt each to the spine
//     ├ hexagonal floor plate (pointed sides) with a raised floor numeral — 2 thumb nuts
//     └ 2 chevron unit tags (unit no., floor no., name), each on its own 2 screws.
//       The inner notch of each tag wraps the point of the hexagon; the outer end points
//       out toward the unit. A whole floor lifts off the spine; any tag comes off alone.
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { boxGeometry, ribSpan } from '../geometry/ribPath'
import { SIGN_MATERIALS, hexFloorTexture, railInsertTexture, railNumeralTexture } from '../textures/signs'
import { BASIS, Cyl, signRows } from './signParts'

const PROF_W = 0.02 // 20 to the viewer
const PROF_D = 0.04 // 40 deep
const Z0 = 0.004 // profiles start just off the mesh
const SPACER = 0.006 // plates stand off the crossbar
const T_HEX = 0.004
const T_TAG = 0.003
const GAP = 0.01 // between hexagon point and tag notch
const NUM_LAYERS = 5
const NUM_T = 0.004
const RUN = 0.07 // spine runs past the top and bottom floors

// Six-point outline: flat top/bottom, pointed (convex) or notched (concave) ends.
// left/right: +1 = pointing outward, -1 = notched inward.
function outline(len, t, p, left, right) {
  const s = new THREE.Shape()
  const L = len / 2
  s.moveTo(-L + (left < 0 ? 0 : p), t)
  s.lineTo(L - (right > 0 ? p : 0), t)
  s.lineTo(right > 0 ? L : L - p, 0)
  s.lineTo(L - (right > 0 ? p : 0), -t)
  s.lineTo(-L + (left < 0 ? 0 : p), -t)
  s.lineTo(left > 0 ? -L : -L + p, 0)
  s.closePath()
  return s
}

const extrude = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })

// Map a canvas texture over a shape's bounding box (ExtrudeGeometry caps use UV = x, y).
function fitTexture(tex, w, h) {
  tex.repeat.set(1 / w, 1 / h)
  tex.offset.set(0.5, 0.5)
  return tex
}

export function SpineSign({ P, M, bay, fontsReady }) {
  const rtl = P.signLang === 'fa'
  const mat = SIGN_MATERIALS[P.signMaterial] || SIGN_MATERIALS.blackSteel

  const L = useMemo(() => {
    const { w, h, rows } = signRows(P, bay)
    const t = (h * 0.85) / 2 // plate half-height
    const p = t * 0.6 // point depth (≈59°, close to the mesh diamonds)
    const hexFlat = Math.min(0.22, w * 0.18)
    const hexW = hexFlat + 2 * p
    const xi = hexFlat / 2 + GAP // tag inner corner
    const tagLen = w / 2 - xi // inner corner to outer point
    const tagCx = xi + tagLen / 2
    // unit 1 at the reading start: right for Persian, left for English
    const unitX = rtl ? [tagCx, -tagCx] : [-tagCx, tagCx]
    const barLen = 2 * (w / 2 - p - 0.02)
    const top = rows[0].y + h / 2 + RUN
    const bottom = rows[rows.length - 1].y - h / 2 - RUN
    return { w, h, rows, t, p, hexFlat, hexW, xi, tagLen, tagCx, unitX, barLen, top, bottom }
  }, [bay.y0, bay.y1, P.signMargin, P.signRowH, P.signTop, P.signGap, rtl]) // eslint-disable-line

  const textKey = JSON.stringify([
    P.signLang,
    P.signMaterial,
    P.signAccent,
    Object.keys(P).filter((k) => /^f\d[ab]/.test(k)).map((k) => P[k]),
  ])
  const ink = '#17181a'
  const textures = useMemo(() => {
    const common = { lang: P.signLang, material: P.signMaterial, accent: P.signAccent }
    const H = 2 * L.t
    return {
      hex: fitTexture(hexFloorTexture({ ...common, w: L.hexW, h: H, ink }), L.hexW, H),
      rows: L.rows.map(({ floor }) => ({
        numeral: railNumeralTexture({ ...common, w: L.hexW, h: H, floor }),
        units: ['a', 'b'].map((k) =>
          fitTexture(
            railInsertTexture({
              ...common,
              w: L.tagLen,
              h: H,
              inset: L.p + 0.018,
              floor,
              unitNo: P[`f${floor}${k}No`],
              name: P[`f${floor}${k}Name`],
            }),
            L.tagLen,
            H
          )
        ),
      })),
    }
  }, [L, fontsReady, textKey]) // eslint-disable-line
  useEffect(
    () => () => [textures.hex, ...textures.rows.flatMap((r) => [r.numeral, ...r.units])].forEach((t) => t.dispose()),
    [textures]
  )

  const mats = useMemo(() => {
    const metal = new THREE.MeshStandardMaterial({ color: P.signAccent, metalness: 0.65, roughness: 0.33 })
    const prof = new THREE.MeshStandardMaterial({ color: mat.edge, metalness: 0.4, roughness: 0.5 })
    const edge = new THREE.MeshStandardMaterial({ color: mat.edge, metalness: mat.metalness, roughness: mat.roughness })
    const fixing = new THREE.MeshStandardMaterial({ color: '#c9cbce', metalness: 0.9, roughness: 0.28 })
    const hexFace = new THREE.MeshStandardMaterial({ map: textures.hex, metalness: 0.65, roughness: 0.33 })
    return {
      metal,
      prof,
      edge,
      fixing,
      hex: [hexFace, metal],
      rows: textures.rows.map((r) => ({
        numeral: new THREE.MeshStandardMaterial({
          color: ink,
          alphaMap: r.numeral,
          alphaTest: 0.5,
          metalness: 0.3,
          roughness: 0.45,
        }),
        units: r.units.map(
          (tex) => [new THREE.MeshStandardMaterial({ map: tex, metalness: mat.metalness, roughness: mat.roughness }), edge]
        ),
      })),
    }
  }, [textures, mat, P.signAccent])
  useEffect(
    () => () => {
      ;[mats.metal, mats.prof, mats.edge, mats.fixing, mats.hex[0]].forEach((m) => m.dispose())
      mats.rows.forEach((r) => [r.numeral, ...r.units.map((u) => u[0])].forEach((m) => m.dispose()))
    },
    [mats]
  )

  const geos = useMemo(() => {
    const H = 2 * L.t
    // right-hand tag: notched inner end, pointed outer end; left-hand one is its mirror
    return {
      spine: new THREE.BoxGeometry(PROF_W, L.top - L.bottom, PROF_D),
      bar: new THREE.BoxGeometry(L.barLen, PROF_W, PROF_D),
      hex: extrude(outline(L.hexW, L.t, L.p, 1, 1), T_HEX),
      tagR: extrude(outline(L.tagLen, L.t, L.p, -1, 1), T_TAG),
      tagL: extrude(outline(L.tagLen, L.t, L.p, 1, -1), T_TAG),
      numeral: new THREE.PlaneGeometry(L.hexW, H),
    }
  }, [L])
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos])

  const supports = useMemo(() => {
    const xm = P.wallX - P.meshOffset
    const [k0, k1] = ribSpan(P)
    const inset = P.separateFrames ? P.ribWidth : 0
    return [L.top - 0.03, L.bottom + 0.03].map((z) =>
      boxGeometry([xm - k1, bay.y0 + inset, z - P.ribWidth / 2], [xm - k0, bay.y1 - inset, z + P.ribWidth / 2])
    )
  }, [L, bay.y0, bay.y1, P.wallX, P.meshOffset, P.ribDepth, P.ribWidth, P.ribsBehind, P.separateFrames]) // eslint-disable-line
  useEffect(() => () => supports.forEach((g) => g.dispose()), [supports])

  const ex = P.signExplode
  const yc = (bay.y0 + bay.y1) / 2
  const zBarFront = Z0 + PROF_D
  const zPlate = zBarFront + SPACER
  // fixing points (local to each plate)
  const hexPins = [-1, 1].map((s) => s * (L.hexFlat / 2 + L.p * 0.35))
  const tagPins = [-(L.tagLen / 2) + L.p + 0.012, L.tagLen / 2 - L.p * 0.6] // right-hand tag; mirrored for left

  return (
    <>
      {supports.map((g, i) => (
        <mesh key={`sup${i}`} geometry={g} material={M.steel} castShadow />
      ))}
      <group position={[P.wallX - P.meshOffset, yc, 0]} quaternion={BASIS}>
        {/* central spine, bolted through the mesh top and bottom */}
        <mesh geometry={geos.spine} material={M.steel} position={[0, (L.top + L.bottom) / 2, Z0 + PROF_D / 2]} castShadow />
        {[L.top - 0.03, L.bottom + 0.03].map((y, j) => (
          <Cyl key={j} x={0} y={y} z0={-0.045} z1={zBarFront + 0.003} r={0.005} material={mats.fixing} />
        ))}

        {L.rows.map((r, i) => (
          <group key={r.floor} position={[0, r.y, 0]}>
            {/* floor crossbar (hidden behind the plates, shows in the gaps) */}
            <group position={[0, 0, ex * 0.05]}>
              <mesh geometry={geos.bar} material={M.steel} position={[0, 0, Z0 + PROF_D / 2 + 0.0005]} castShadow />
            </group>

            {/* hexagonal floor plate */}
            <group position={[0, 0, ex * 0.12]}>
              <mesh geometry={geos.hex} material={mats.hex} position={[0, 0, zPlate]} castShadow />
              {Array.from({ length: NUM_LAYERS }, (_, k) => (
                <mesh
                  key={`num${k}`}
                  geometry={geos.numeral}
                  material={mats.rows[i].numeral}
                  position={[0, 0, zPlate + T_HEX + 0.0005 + (k * NUM_T) / (NUM_LAYERS - 1)]}
                  castShadow={k === NUM_LAYERS - 1}
                />
              ))}
              {hexPins.map((x, j) => (
                <group key={`hp${j}`}>
                  <Cyl x={x} y={0} z0={zBarFront} z1={zPlate} r={0.005} material={mats.fixing} />
                  <Cyl
                    x={x}
                    y={0}
                    z0={zPlate + T_HEX + ex * 0.04}
                    z1={zPlate + T_HEX + 0.006 + ex * 0.04}
                    r={0.009}
                    material={mats.fixing}
                  />
                </group>
              ))}
            </group>

            {/* chevron unit tags */}
            {L.unitX.map((x, k) => {
              const dir = Math.sign(x)
              return (
                <group key={`tag${k}`} position={[x + dir * ex * 0.06, 0, ex * 0.2]}>
                  <mesh
                    geometry={dir > 0 ? geos.tagR : geos.tagL}
                    material={mats.rows[i].units[k]}
                    position={[0, 0, zPlate]}
                    castShadow
                  />
                  {tagPins.map((px, j) => (
                    <group key={`tp${j}`}>
                      <Cyl x={px * dir} y={0} z0={zBarFront} z1={zPlate} r={0.004} material={mats.fixing} />
                      <Cyl
                        x={px * dir}
                        y={0}
                        z0={zPlate + T_TAG + ex * 0.04}
                        z1={zPlate + T_TAG + 0.003 + ex * 0.04}
                        r={0.0055}
                        material={mats.fixing}
                      />
                    </group>
                  ))}
                </group>
              )
            })}
          </group>
        ))}
      </group>
    </>
  )
}
