// Floor directory (guide board) on one of the middle mesh sections, never the first or last.
// Variants: 1 · Plates (below), 2 · Rail & cassettes (SignRail.jsx), 3 · Hexagons & chevrons (SignSpine.jsx).
//
// 1 · Plates assembly, per floor (all separately removable by hand):
//   hidden 20x40 support bar behind the mesh (part of the section frame)
//   └ 4 standoffs through the mesh
//     └ carrier white board, screwed to the standoffs by its 4 pot magnets
//       └ floor carrier face plate (floor number cut through) — on the magnets, 2 locating studs
//         └ 4 threaded spacers welded to each unit position on the carrier face
//           └ unit white board, screwed to them by its 4 pot magnets
//             └ unit face plate (unit no., floor no., name) — on the magnets, 2 locating studs
// No fixings show on any face (see "Magnetic fixing" in signParts). Without a white board
// (non-cut materials) the pot magnets screw straight onto the standoffs/spacers.
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { strandDepth } from '../geometry/expandedMetal'
import { boxGeometry, ribSpan } from '../geometry/ribPath'
import { SIGN_MATERIALS, disposeFace, floorCarrierTexture, unitTexture, fontStack } from '../textures/signs'
import {
  BASIS,
  Cyl,
  LocatingStud,
  MAG_H,
  PotMagnet,
  WHITE_INSET,
  WHITE_T,
  faceMaterial,
  signBay,
  useFontsReady,
  whiteBoardMaterial,
} from './signParts'
import { RailSign } from './SignRail'
import { SpineSign } from './SignSpine'

const T_CARRIER = 0.004 // 4 mm plate
const T_UNIT = 0.003 // 3 mm plate
const UNIT_SPACER = 0.012 // carrier face front to unit face back
const ZONE_W = 0.2 // floor-number panel width
const PAD = 0.022

// Guide board 1 · Plates
function PlateSign({ P, M, bay, fontsReady }) {
  const mat = SIGN_MATERIALS[P.signMaterial] || SIGN_MATERIALS.blackSteel
  const rtl = P.signLang === 'fa'

  const layout = useMemo(() => {
    if (!bay) return null
    const bw = bay.y1 - bay.y0
    const w = Math.max(0.3, bw - 2 * P.signMargin)
    const h = P.signRowH
    const unitW = (w - ZONE_W - 3 * PAD) / 2
    const unitH = h - 2 * PAD
    const rows = [5, 4, 3, 2, 1].map((floor, i) => ({ floor, y: P.signTop - h / 2 - i * (h + P.signGap) }))
    // unit 1 sits at the reading start (right for Persian, left for English)
    const zoneX = rtl ? w / 2 - ZONE_W / 2 : -w / 2 + ZONE_W / 2
    const regionL = rtl ? -w / 2 + PAD : -w / 2 + ZONE_W + PAD
    const ux = [regionL + unitW / 2, regionL + PAD + unitW * 1.5]
    const unitX = rtl ? [ux[1], ux[0]] : ux
    return { w, h, unitW, unitH, rows, zoneX, unitX }
  }, [bay?.y0, bay?.y1, P.signMargin, P.signRowH, P.signTop, P.signGap, rtl]) // eslint-disable-line

  // textures (rebuilt when text/material/layout changes)
  const textKey = JSON.stringify([
    P.signFont,
    P.signLang,
    P.signMaterial,
    P.signAccent,
    Object.keys(P).filter((k) => /^f\d[ab]/.test(k)).map((k) => P[k]),
  ])
  const textures = useMemo(() => {
    if (!layout) return null
    const common = { font: fontStack(P.signFont), lang: P.signLang, material: P.signMaterial, accent: P.signAccent }
    return layout.rows.map(({ floor }) => ({
      carrier: floorCarrierTexture({ ...common, w: layout.w, h: layout.h, zoneW: ZONE_W, floor }),
      units: ['a', 'b'].map((k) =>
        unitTexture({
          ...common,
          w: layout.unitW,
          h: layout.unitH,
          floor,
          unitNo: P[`f${floor}${k}No`],
          name: P[`f${floor}${k}Name`],
        })
      ),
    }))
  }, [layout, fontsReady, textKey]) // eslint-disable-line
  useEffect(() => () => textures?.forEach((r) => [r.carrier, ...r.units].forEach(disposeFace)), [textures])

  const mats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: mat.edge, metalness: mat.metalness, roughness: mat.roughness })
    const fixing = new THREE.MeshStandardMaterial({ color: '#c9cbce', metalness: 0.9, roughness: 0.28 })
    const face = (f) => faceMaterial(f, mat)
    const white = mat.cut ? whiteBoardMaterial() : null
    const rows = textures?.map((r) => ({
      carrier: [edge, edge, edge, edge, face(r.carrier), edge],
      units: r.units.map((t) => [edge, edge, edge, edge, face(t), edge]),
    }))
    return { edge, fixing, white, rows }
  }, [textures, mat])
  useEffect(
    () => () => {
      mats.edge.dispose()
      mats.fixing.dispose()
      mats.white?.dispose()
      mats.rows?.forEach((r) => [r.carrier[4], ...r.units.map((u) => u[4])].forEach((m) => m.dispose()))
    },
    [mats]
  )

  // hidden 20x40 support bars behind the mesh, one per floor, spanning the section frame
  const supports = useMemo(() => {
    if (!layout || !bay) return []
    const xm = P.wallX - P.meshOffset
    const [k0, k1] = ribSpan(P)
    const inset = P.separateFrames ? P.ribWidth : 0
    return layout.rows.map((r) =>
      boxGeometry(
        [xm - k1, bay.y0 + inset, r.y - P.ribWidth / 2],
        [xm - k0, bay.y1 - inset, r.y + P.ribWidth / 2]
      )
    )
  }, [layout, bay?.y0, bay?.y1, P.wallX, P.meshOffset, P.ribDepth, P.ribWidth, P.ribsBehind, P.separateFrames]) // eslint-disable-line
  useEffect(() => () => supports.forEach((g) => g.dispose()), [supports])

  const geos = useMemo(() => {
    if (!layout) return null
    return {
      carrier: new THREE.BoxGeometry(layout.w, layout.h, T_CARRIER),
      unit: new THREE.BoxGeometry(layout.unitW, layout.unitH, T_UNIT),
      carrierWhite: new THREE.BoxGeometry(layout.w - 2 * WHITE_INSET, layout.h - 2 * WHITE_INSET, WHITE_T),
      unitWhite: new THREE.BoxGeometry(layout.unitW - 2 * WHITE_INSET, layout.unitH - 2 * WHITE_INSET, WHITE_T),
    }
  }, [layout])
  useEffect(() => () => geos && Object.values(geos).forEach((g) => g.dispose()), [geos])

  if (!P.showSigns || !layout || !bay || !mats.rows) return null

  const yc = (bay.y0 + bay.y1) / 2
  const so = P.signStandoff // back of the carrier face plate
  const ex = P.signExplode
  const faceOut = ex * 0.07 // face plates pull off their magnets first
  const back = mats.white ? WHITE_T : MAG_H // what sits between a face plate and its standoffs
  const zCarrier = so + ex * 0.12 // carrier assembly: back of its face plate
  const zCarrierFace = zCarrier + faceOut // carrier face plate back, after pulling off
  const zUnit = so + T_CARRIER + UNIT_SPACER + ex * 0.28 // back of the unit face plates
  const sx = layout.w / 2 - 0.035
  const sy = layout.h / 2 - 0.035
  const ux = layout.unitW / 2 - 0.014
  const uy = layout.unitH / 2 - 0.014
  const corners = (a, b) => [
    [-a, -b],
    [a, -b],
    [-a, b],
    [a, b],
  ]
  // locating studs: clear of every cut letter so they never show through
  const carrierStuds = [-1, 1].map((s) => [s * sx, 0])
  const unitStuds = [-1, 1].map((s) => [s * (ux - 0.03), -uy])

  return (
    <>
      {supports.map((g, i) => (
        <mesh key={`sup${i}`} geometry={g} material={M.steel} castShadow />
      ))}
      <group position={[P.wallX - P.meshOffset - strandDepth(P), yc, 0]} quaternion={BASIS}>
        {layout.rows.map((r, i) => (
          <group key={r.floor} position={[0, r.y, 0]}>
            {/* standoffs from the hidden bar, through the mesh */}
            {corners(sx, sy).map(([x, y], j) => (
              <Cyl key={`so${j}`} x={x} y={y} z0={-0.045} z1={so - back} r={0.006} material={mats.fixing} />
            ))}
            {/* carrier white board + pot magnets, then the carrier face plate on them */}
            {mats.white && (
              <mesh geometry={geos.carrierWhite} material={mats.white} position={[0, 0, zCarrier - WHITE_T / 2]} />
            )}
            {corners(sx, sy).map(([x, y], j) => (
              <PotMagnet key={`cm${j}`} x={x} y={y} front={zCarrier} />
            ))}
            <mesh geometry={geos.carrier} material={mats.rows[i].carrier} position={[0, 0, zCarrierFace + T_CARRIER / 2]} castShadow />
            {carrierStuds.map(([x, y], j) => (
              <LocatingStud key={`cs${j}`} x={x} y={y} back={zCarrierFace} />
            ))}
            {/* two replaceable unit plates */}
            {layout.unitX.map((x, k) => (
              <group key={k} position={[x, 0, 0]}>
                {/* spacers welded to the carrier face */}
                {corners(ux, uy).map(([cx, cy], j) => (
                  <Cyl
                    key={`sp${j}`}
                    x={cx}
                    y={cy}
                    z0={zCarrierFace + T_CARRIER}
                    z1={zCarrierFace + T_CARRIER + UNIT_SPACER - back}
                    r={0.004}
                    material={mats.fixing}
                  />
                ))}
                {mats.white && (
                  <mesh geometry={geos.unitWhite} material={mats.white} position={[0, 0, zUnit - WHITE_T / 2]} />
                )}
                {corners(ux, uy).map(([cx, cy], j) => (
                  <PotMagnet key={`um${j}`} x={cx} y={cy} front={zUnit} />
                ))}
                <group position={[0, 0, faceOut]}>
                  <mesh geometry={geos.unit} material={mats.rows[i].units[k]} position={[0, 0, zUnit + T_UNIT / 2]} castShadow />
                  {unitStuds.map(([cx, cy], j) => (
                    <LocatingStud key={`us${j}`} x={cx} y={cy} back={zUnit} />
                  ))}
                </group>
              </group>
            ))}
          </group>
        ))}
      </group>
    </>
  )
}

export function Signage({ P, M }) {
  const fontsReady = useFontsReady()
  const bay = signBay(P)
  if (!P.showSigns || !bay) return null
  const Board = { rail: RailSign, spine: SpineSign }[P.signStyle] || PlateSign
  return <Board P={P} M={M} bay={bay} fontsReady={fontsReady} />
}
