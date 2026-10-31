// Floor directory (guide board) on one of the middle mesh sections, never the first or last.
// Variants: 1 · Plates (below), 2 · Rail & cassettes (SignRail.jsx), 3 · Spine & chevrons (SignSpine.jsx).
//
// 1 · Plates assembly, per floor (all separately removable by hand):
//   hidden 20x40 support bar behind the mesh (part of the section frame)
//   └ 4 standoffs through the mesh
//     └ floor carrier plate (floor number) — held by 4 thumb nuts
//       └ 2 unit plates (unit no., floor no., name) — 4 screws each
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { boxGeometry, ribSpan } from '../geometry/ribPath'
import { SIGN_MATERIALS, floorCarrierTexture, unitTexture } from '../textures/signs'
import { BASIS, Cyl, signBay, useFontsReady } from './signParts'
import { RailSign } from './SignRail'
import { SpineSign } from './SignSpine'

const T_CARRIER = 0.004 // 4 mm plate
const T_UNIT = 0.003 // 3 mm plate
const UNIT_SPACER = 0.012 // unit plates stand proud of the carrier and hide its nuts
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
    P.signLang,
    P.signMaterial,
    P.signAccent,
    Object.keys(P).filter((k) => /^f\d[ab]/.test(k)).map((k) => P[k]),
  ])
  const textures = useMemo(() => {
    if (!layout) return null
    const common = { lang: P.signLang, material: P.signMaterial, accent: P.signAccent }
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
  useEffect(() => () => textures?.forEach((r) => [r.carrier, ...r.units].forEach((t) => t.dispose())), [textures])

  const mats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: mat.edge, metalness: mat.metalness, roughness: mat.roughness })
    const fixing = new THREE.MeshStandardMaterial({ color: '#c9cbce', metalness: 0.9, roughness: 0.28 })
    const face = (map) =>
      new THREE.MeshStandardMaterial({ map, metalness: mat.metalness, roughness: mat.roughness })
    const rows = textures?.map((r) => ({
      carrier: [edge, edge, edge, edge, face(r.carrier), edge],
      units: r.units.map((t) => [edge, edge, edge, edge, face(t), edge]),
    }))
    return { edge, fixing, rows }
  }, [textures, mat])
  useEffect(
    () => () => {
      mats.edge.dispose()
      mats.fixing.dispose()
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
    }
  }, [layout])
  useEffect(() => () => geos && (geos.carrier.dispose(), geos.unit.dispose()), [geos])

  if (!P.showSigns || !layout || !bay || !mats.rows) return null

  const yc = (bay.y0 + bay.y1) / 2
  const so = P.signStandoff
  const ex = P.signExplode
  const zCarrier = so + T_CARRIER / 2 + ex * 0.12
  const zUnit = so + T_CARRIER + UNIT_SPACER + T_UNIT / 2 + ex * 0.28
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

  return (
    <>
      {supports.map((g, i) => (
        <mesh key={`sup${i}`} geometry={g} material={M.steel} castShadow />
      ))}
      <group position={[P.wallX - P.meshOffset, yc, 0]} quaternion={BASIS}>
        {layout.rows.map((r, i) => (
          <group key={r.floor} position={[0, r.y, 0]}>
            {/* standoffs from the hidden bar, through the mesh */}
            {corners(sx, sy).map(([x, y], j) => (
              <Cyl key={`so${j}`} x={x} y={y} z0={-0.045} z1={so} r={0.006} material={mats.fixing} />
            ))}
            {/* floor carrier plate */}
            <mesh geometry={geos.carrier} material={mats.rows[i].carrier} position={[0, 0, zCarrier]} castShadow />
            {/* thumb nuts holding the carrier */}
            {corners(sx, sy).map(([x, y], j) => (
              <Cyl
                key={`tn${j}`}
                x={x}
                y={y}
                z0={zCarrier + T_CARRIER / 2 + ex * 0.05}
                z1={zCarrier + T_CARRIER / 2 + 0.006 + ex * 0.05}
                r={0.011}
                material={mats.fixing}
              />
            ))}
            {/* two replaceable unit plates, each with its own 4 screws */}
            {layout.unitX.map((x, k) => (
              <group key={k} position={[x, 0, 0]}>
                {corners(ux, uy).map(([cx, cy], j) => (
                  <Cyl
                    key={`sp${j}`}
                    x={cx}
                    y={cy}
                    z0={zCarrier + T_CARRIER / 2}
                    z1={zUnit - T_UNIT / 2}
                    r={0.004}
                    material={mats.fixing}
                  />
                ))}
                <mesh geometry={geos.unit} material={mats.rows[i].units[k]} position={[0, 0, zUnit]} castShadow />
                {corners(ux, uy).map(([cx, cy], j) => (
                  <Cyl
                    key={`sc${j}`}
                    x={cx}
                    y={cy}
                    z0={zUnit + T_UNIT / 2 + ex * 0.04}
                    z1={zUnit + T_UNIT / 2 + 0.003 + ex * 0.04}
                    r={0.0055}
                    material={mats.fixing}
                  />
                ))}
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
