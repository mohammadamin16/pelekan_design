// Guide board 3 · Hexagons & chevrons.
//
// 5 floor crossbars (20x40, 20 high facing the viewer), each bolted through the mesh
// ├ hexagonal floor plate: copper-coloured steel with the floor numeral laser-cut through it
// │ (custom numerals, some running out through the plate edge), white board behind
// └ 2 chevron unit tags (unit no., floor no., name), white board behind each.
//   The inner notch of each tag wraps the point of the hexagon; the outer end points
//   out toward the unit.
// Fixing (see "Magnetic fixing" in signParts): each white board is screwed to the crossbar
// on spacers by its own countersunk pot magnets; the face plate just sticks on, located by
// two studs on its back. No fixings show on any face. Any face pulls off by hand; a whole
// floor comes off on its bar.
// (No spine and no bars behind the mesh: the floors fix straight to the sheet.)
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { strandDepth } from '../geometry/expandedMetal'
import { SIGN_MATERIALS, disposeFace, hexFloorTexture, railInsertTexture, fontStack } from '../textures/signs'
import {
  BASIS,
  Cyl,
  LocatingStud,
  PotMagnet,
  WHITE_INSET,
  WHITE_T,
  faceMaterial,
  plateGeometry,
  signRows,
  wallMaterial,
  whiteBoardMaterial,
} from './signParts'

const PROF_W = 0.02 // 20 to the viewer
const PROF_D = 0.04 // 40 deep
const Z0 = 0.004 // profiles start just off the mesh
const SPACER = 0.006 // white boards stand off the crossbar
const T_HEX = 0.004
const T_TAG = 0.003
const GAP = 0.01 // between hexagon point and tag notch
const COPPER = { metalness: 0.65, roughness: 0.33 }

// Six-point outline: flat top/bottom, pointed (convex) or notched (concave) ends.
// left/right: +1 = pointing outward, -1 = notched inward.
function outline(len, t, p, left, right) {
  const L = len / 2
  return [
    [-L + (left < 0 ? 0 : p), t],
    [L - (right > 0 ? p : 0), t],
    [right > 0 ? L : L - p, 0],
    [L - (right > 0 ? p : 0), -t],
    [-L + (left < 0 ? 0 : p), -t],
    [left > 0 ? -L : -L + p, 0],
  ].map(([x, y]) => new THREE.Vector2(x, y))
}
// the same outline 3 mm in all round (white boards), keeping the point angle
const inset = (len, t, p, left, right) =>
  outline(len - 2 * WHITE_INSET, t - WHITE_INSET, (p * (t - WHITE_INSET)) / t, left, right)

// Map a canvas texture over a plate's bounding box (plateGeometry uses uv = x, y).
function fitTexture(tex, w, h) {
  tex.repeat.set(1 / w, 1 / h)
  tex.offset.set(0.5, 0.5)
  return tex
}
const fitFace = (f, w, h) => {
  fitTexture(f.map, w, h)
  if (f.alpha) fitTexture(f.alpha, w, h)
  return f
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
    return { w, h, rows, t, p, hexFlat, hexW, xi, tagLen, tagCx, unitX, barLen }
  }, [bay.y0, bay.y1, P.signMargin, P.signRowH, P.signTop, P.signGap, rtl]) // eslint-disable-line

  const textKey = JSON.stringify([
    P.signFont,
    P.signLang,
    P.signMaterial,
    P.signAccent,
    Object.keys(P).filter((k) => /^f\d[ab]/.test(k)).map((k) => P[k]),
  ])
  const textures = useMemo(() => {
    const common = { font: fontStack(P.signFont), lang: P.signLang, material: P.signMaterial, accent: P.signAccent }
    const H = 2 * L.t
    return L.rows.map(({ floor }) => ({
      hex: fitFace(hexFloorTexture({ ...common, w: L.hexW, h: H, floor }), L.hexW, H),
      units: ['a', 'b'].map((k) =>
        fitFace(
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
    }))
  }, [L, fontsReady, textKey]) // eslint-disable-line
  useEffect(() => () => textures.forEach((r) => [r.hex, ...r.units].forEach(disposeFace)), [textures])

  const mats = useMemo(() => {
    const prof = new THREE.MeshStandardMaterial({ color: mat.edge, metalness: 0.4, roughness: 0.5 })
    const fixing = new THREE.MeshStandardMaterial({ color: '#c9cbce', metalness: 0.9, roughness: 0.28 })
    const all = []
    const keep = (m) => (all.push(m), m)
    return {
      white: keep(whiteBoardMaterial()),
      prof: keep(prof),
      fixing: keep(fixing),
      rows: textures.map((r) => ({
        hex: [keep(faceMaterial(r.hex, COPPER)), keep(wallMaterial(P.signAccent, r.hex.alpha, COPPER))],
        units: r.units.map((f) => [keep(faceMaterial(f, mat)), keep(wallMaterial(mat.edge, f.alpha, mat))]),
      })),
      all,
    }
  }, [textures, mat, P.signAccent])
  useEffect(() => () => mats.all.forEach((m) => m.dispose()), [mats])

  const geos = useMemo(() => {
    const white = (pts) => new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: WHITE_T, bevelEnabled: false })
    // right-hand tag: notched inner end, pointed outer end; left-hand one is its mirror
    return {
      bar: new THREE.BoxGeometry(L.barLen, PROF_W, PROF_D),
      hex: plateGeometry(outline(L.hexW, L.t, L.p, 1, 1), T_HEX),
      tagR: plateGeometry(outline(L.tagLen, L.t, L.p, -1, 1), T_TAG),
      tagL: plateGeometry(outline(L.tagLen, L.t, L.p, 1, -1), T_TAG),
      hexWhite: white(inset(L.hexW, L.t, L.p, 1, 1)),
      tagRWhite: white(inset(L.tagLen, L.t, L.p, -1, 1)),
      tagLWhite: white(inset(L.tagLen, L.t, L.p, 1, -1)),
    }
  }, [L])
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos])

  const ex = P.signExplode
  const yc = (bay.y0 + bay.y1) / 2
  const zBarFront = Z0 + PROF_D
  const zWhite = zBarFront + SPACER // back of the white boards
  const zFace = zWhite + WHITE_T // front of the white boards = back of the face plates
  const faceOut = ex * 0.07 // face plates pull off their magnets first
  // magnets (on the plate centre line, clear of all lettering) and locating studs
  const hexMags = [-1, 1].map((s) => [s * (L.hexFlat / 2 + L.p * 0.35), 0])
  const hexStuds = [-1, 1].map((s) => [s * L.hexFlat * 0.4, -L.t * 0.7])
  const tagInner = -(L.tagLen / 2) + L.p + 0.012
  const tagMags = [
    [tagInner, 0],
    [L.tagLen / 2 - L.p * 0.6, 0],
  ] // right-hand tag; mirrored for the left
  const tagStuds = [-1, 1].map((s) => [tagInner, s * L.t * 0.45])

  // a white board with its pot magnets (and the spacers they screw through), plus its face plate
  const sandwich = ({ whiteGeo, faceGeo, faceMat, mags, studs, flip = 1 }) => (
    <>
      <mesh geometry={whiteGeo} material={mats.white} position={[0, 0, zWhite]} />
      {mags.map(([x, y], j) => (
        <group key={`m${j}`}>
          <Cyl x={x * flip} y={y} z0={zBarFront - ex * 0.02} z1={zWhite} r={0.005} material={mats.fixing} />
          <PotMagnet x={x * flip} y={y} front={zFace} />
        </group>
      ))}
      <group position={[0, 0, faceOut]}>
        <mesh geometry={faceGeo} material={faceMat} position={[0, 0, zFace]} castShadow />
        {studs.map(([x, y], j) => (
          <LocatingStud key={`s${j}`} x={x * flip} y={y} back={zFace} />
        ))}
      </group>
    </>
  )

  return (
    <>
      <group position={[P.wallX - P.meshOffset - strandDepth(P), yc, 0]} quaternion={BASIS}>
        {L.rows.map((r, i) => (
          <group key={r.floor} position={[0, r.y, 0]}>
            {/* floor crossbar (hidden behind the plates), bolted through the mesh at both ends */}
            <group position={[0, 0, ex * 0.05]}>
              <mesh geometry={geos.bar} material={M.steel} position={[0, 0, Z0 + PROF_D / 2 + 0.0005]} castShadow />
              {[-1, 1].map((sd) => (
                <Cyl key={sd} x={sd * (L.barLen / 2 - 0.03)} y={0} z0={-0.045} z1={zBarFront + 0.003} r={0.005} material={mats.fixing} />
              ))}
            </group>

            {/* hexagonal floor plate */}
            <group position={[0, 0, ex * 0.12]}>
              {sandwich({ whiteGeo: geos.hexWhite, faceGeo: geos.hex, faceMat: mats.rows[i].hex, mags: hexMags, studs: hexStuds })}
            </group>

            {/* chevron unit tags */}
            {L.unitX.map((x, k) => {
              const dir = Math.sign(x)
              return (
                <group key={`tag${k}`} position={[x + dir * ex * 0.06, 0, ex * 0.2]}>
                  {sandwich({
                    whiteGeo: dir > 0 ? geos.tagRWhite : geos.tagLWhite,
                    faceGeo: dir > 0 ? geos.tagR : geos.tagL,
                    faceMat: mats.rows[i].units[k],
                    mags: tagMags,
                    studs: tagStuds,
                    flip: dir,
                  })}
                </group>
              )
            })}
          </group>
        ))}
      </group>
    </>
  )
}
