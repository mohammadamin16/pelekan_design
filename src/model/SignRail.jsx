// Guide board 2 · Rail & cassettes.
//
// Two hidden 20x40 bars behind the mesh (top + bottom of the board)
// └ 2 vertical 20x40 posts on the mesh (20 side to the viewer), bolted through to those bars
//   └ 5 floor cassettes, one per floor: a folded metal channel that hooks onto the posts
//     and lifts off by hand. Centre: floor tile with a raised laser-cut floor numeral.
//     └ 2 unit inserts per floor (unit no., floor no., name) slide into the channel
//       from its two open ends, one each side of the floor tile. Each end is closed by its
//       own end cap with a thumb screw, so one unit comes out without touching the other.
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { boxGeometry, ribSpan } from '../geometry/ribPath'
import { SIGN_MATERIALS, railInsertTexture, railNumeralTexture, railTileTexture } from '../textures/signs'
import { BASIS, Cyl, signRows } from './signParts'

const POST_W = 0.02 // 20 to the viewer
const POST_D = 0.04 // 40 deep
const POST_Z0 = 0.004 // off the mesh
const TRAY_T = 0.002
const LIP_H = 0.012
const LIP_D = 0.014
const TILE_T = 0.003
const INSERT_T = 0.003
const CAP_W = 0.012
const STOP_W = 0.006
const NUM_LAYERS = 5 // stacked planes give the raised numeral its 4 mm thickness
const NUM_T = 0.004
const POST_RUN = 0.07 // posts run past the top and bottom cassettes

export function RailSign({ P, M, bay, fontsReady }) {
  const rtl = P.signLang === 'fa'
  const mat = SIGN_MATERIALS[P.signMaterial] || SIGN_MATERIALS.blackSteel

  const L = useMemo(() => {
    const { w, h, rows } = signRows(P, bay)
    const inner = h - 2 * LIP_H
    const tileW = Math.min(inner, w * 0.25)
    const insW = (w - tileW - 2 * STOP_W - 2 * CAP_W) / 2
    const insH = inner - 0.002
    const insX = tileW / 2 + STOP_W + insW / 2
    // unit 1 at the reading start: right for Persian, left for English
    const unitX = rtl ? [insX, -insX] : [-insX, insX]
    const top = rows[0].y + h / 2 + POST_RUN
    const bottom = rows[rows.length - 1].y - h / 2 - POST_RUN
    return { w, h, rows, inner, tileW, insW, insH, insX, unitX, top, bottom }
  }, [bay.y0, bay.y1, P.signMargin, P.signRowH, P.signTop, P.signGap, rtl]) // eslint-disable-line

  const textKey = JSON.stringify([
    P.signLang,
    P.signMaterial,
    P.signAccent,
    Object.keys(P).filter((k) => /^f\d[ab]/.test(k)).map((k) => P[k]),
  ])
  const textures = useMemo(() => {
    const common = { lang: P.signLang, material: P.signMaterial, accent: P.signAccent }
    const tile = railTileTexture({ ...common, w: L.tileW, h: L.inner })
    return {
      tile,
      rows: L.rows.map(({ floor }) => ({
        numeral: railNumeralTexture({ ...common, w: L.tileW, h: L.inner, floor }),
        units: ['a', 'b'].map((k) =>
          railInsertTexture({
            ...common,
            w: L.insW,
            h: L.insH,
            floor,
            unitNo: P[`f${floor}${k}No`],
            name: P[`f${floor}${k}Name`],
          })
        ),
      })),
    }
  }, [L, fontsReady, textKey]) // eslint-disable-line
  useEffect(
    () => () => [textures.tile, ...textures.rows.flatMap((r) => [r.numeral, ...r.units])].forEach((t) => t.dispose()),
    [textures]
  )

  const mats = useMemo(() => {
    const metal = new THREE.MeshStandardMaterial({ color: P.signAccent, metalness: 0.65, roughness: 0.33 })
    const post = new THREE.MeshStandardMaterial({ color: mat.edge, metalness: 0.4, roughness: 0.5 })
    const edge = new THREE.MeshStandardMaterial({ color: mat.edge, metalness: mat.metalness, roughness: mat.roughness })
    const fixing = new THREE.MeshStandardMaterial({ color: '#c9cbce', metalness: 0.9, roughness: 0.28 })
    const face = (map) => new THREE.MeshStandardMaterial({ map, metalness: mat.metalness, roughness: mat.roughness })
    const tileFace = face(textures.tile)
    return {
      metal,
      post,
      edge,
      fixing,
      tile: [edge, edge, edge, edge, tileFace, edge],
      rows: textures.rows.map((r) => ({
        numeral: new THREE.MeshStandardMaterial({
          color: P.signAccent,
          alphaMap: r.numeral,
          alphaTest: 0.5,
          metalness: 0.65,
          roughness: 0.33,
        }),
        units: r.units.map((t) => [edge, edge, edge, edge, face(t), edge]),
      })),
    }
  }, [textures, mat, P.signAccent])
  useEffect(
    () => () => {
      ;[mats.metal, mats.post, mats.edge, mats.fixing, mats.tile[4]].forEach((m) => m.dispose())
      mats.rows.forEach((r) => [r.numeral, ...r.units.map((u) => u[4])].forEach((m) => m.dispose()))
    },
    [mats]
  )

  const geos = useMemo(() => {
    const g = {
      post: new THREE.BoxGeometry(POST_W, L.top - L.bottom, POST_D),
      tray: new THREE.BoxGeometry(L.w - 2 * CAP_W, L.h, TRAY_T),
      lip: new THREE.BoxGeometry(L.w - 2 * CAP_W, LIP_H, LIP_D),
      cap: new THREE.BoxGeometry(CAP_W, L.h, TRAY_T + LIP_D + 0.002),
      stop: new THREE.BoxGeometry(STOP_W, L.inner, LIP_D * 0.7),
      tile: new THREE.BoxGeometry(L.tileW, L.inner, TILE_T),
      numeral: new THREE.PlaneGeometry(L.tileW, L.inner),
      insert: new THREE.BoxGeometry(L.insW, L.insH, INSERT_T),
    }
    return g
  }, [L])
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos])

  // hidden 20x40 bars behind the mesh at the post ends
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
  const postX = [-L.insX, L.insX]
  const zTray = POST_Z0 + POST_D + TRAY_T / 2
  const zIn = POST_Z0 + POST_D + TRAY_T // front of the tray, inside the channel
  const zLip = zIn + LIP_D / 2

  return (
    <>
      {supports.map((g, i) => (
        <mesh key={`sup${i}`} geometry={g} material={M.steel} castShadow />
      ))}
      <group position={[P.wallX - P.meshOffset, yc, 0]} quaternion={BASIS}>
        {/* posts + their bolts through the mesh */}
        {postX.map((x, i) => (
          <group key={`post${i}`}>
            <mesh
              geometry={geos.post}
              material={M.steel}
              position={[x, (L.top + L.bottom) / 2, POST_Z0 + POST_D / 2]}
              castShadow
            />
            {[L.top - 0.03, L.bottom + 0.03].map((y, j) => (
              <Cyl key={j} x={x} y={y} z0={-0.045} z1={POST_Z0 + POST_D + 0.003} r={0.005} material={mats.fixing} />
            ))}
          </group>
        ))}

        {L.rows.map((r, i) => (
          // whole cassette lifts forward off the post hooks
          <group key={r.floor} position={[0, r.y, ex * 0.12]}>
            <mesh geometry={geos.tray} material={mats.metal} position={[0, 0, zTray]} castShadow />
            {[1, -1].map((s) => (
              <mesh
                key={`lip${s}`}
                geometry={geos.lip}
                material={mats.metal}
                position={[0, s * (L.h / 2 - LIP_H / 2), zLip]}
                castShadow
              />
            ))}
            {/* slide stops either side of the floor tile */}
            {[1, -1].map((s) => (
              <mesh
                key={`stop${s}`}
                geometry={geos.stop}
                material={mats.metal}
                position={[s * (L.tileW / 2 + STOP_W / 2), 0, zIn + (LIP_D * 0.7) / 2]}
              />
            ))}
            {/* floor tile + raised numeral */}
            <mesh geometry={geos.tile} material={mats.tile} position={[0, 0, zIn + TILE_T / 2]} castShadow />
            {Array.from({ length: NUM_LAYERS }, (_, k) => (
              <mesh
                key={`num${k}`}
                geometry={geos.numeral}
                material={mats.rows[i].numeral}
                position={[0, 0, zIn + TILE_T + 0.0005 + (k * NUM_T) / (NUM_LAYERS - 1)]}
                castShadow={k === NUM_LAYERS - 1}
              />
            ))}
            {/* unit inserts slide out sideways through their own open end */}
            {L.unitX.map((x, k) => (
              <mesh
                key={`ins${k}`}
                geometry={geos.insert}
                material={mats.rows[i].units[k]}
                position={[x + Math.sign(x) * ex * (L.insW + 0.08), 0, zIn + INSERT_T / 2 + 0.0005]}
                castShadow
              />
            ))}
            {/* end caps with thumb screws */}
            {[1, -1].map((s) => {
              const cx = s * (L.w / 2 - CAP_W / 2 + ex * 0.05)
              const cz = ex * 0.03
              return (
                <group key={`cap${s}`} position={[cx, 0, cz]}>
                  <mesh
                    geometry={geos.cap}
                    material={mats.metal}
                    position={[0, 0, POST_Z0 + POST_D + (TRAY_T + LIP_D + 0.002) / 2]}
                    castShadow
                  />
                  <Cyl
                    x={0}
                    y={0}
                    z0={POST_Z0 + POST_D + TRAY_T + LIP_D + 0.002}
                    z1={POST_Z0 + POST_D + TRAY_T + LIP_D + 0.008}
                    r={0.0055}
                    material={mats.fixing}
                  />
                </group>
              )
            })}
          </group>
        ))}
      </group>
    </>
  )
}
