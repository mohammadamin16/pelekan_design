import { useEffect, useMemo } from 'react'
import { featureLayout } from '../params'
import {
  boxGeometry,
  buildProfile,
  crossBarGeometry,
  endTrimGeometry,
  panelGeometry,
  ribGeometry,
  ribSpan,
} from '../geometry/ribPath'

// The designed element: pilasters, plinth, white backing, mesh canopy and steel ribs.
export function Feature({ P, M }) {
  const parts = useMemo(() => {
    const L = featureLayout(P)
    const prof = buildProfile(P, P.plinthHeight)
    const list = []
    const { wallX: X } = P
    const wallTop = P.canopyHeight - Math.min(P.filletRadius, P.canopyHeight - P.plinthHeight - 0.01)

    const sep = P.separateFrames
    const steel = (key, geometry) => list.push({ key, geometry, mat: 'steel', cast: true })
    const rail = (key, y0, y1) => {
      // same 20x40 profile: face (ribWidth) to the viewer, depth (ribDepth) into the wall
      const xm = X - P.meshOffset
      const [k0, k1] = ribSpan(P)
      steel(key, boxGeometry([xm - k1, y0, P.railHeight - P.ribWidth / 2], [xm - k0, y1, P.railHeight + P.ribWidth / 2]))
    }

    // marble strips in the gaps between sections
    L.ribYs.forEach((y, i) => {
      list.push({
        key: `pil${i}`,
        geometry: boxGeometry(
          [X - P.pilasterDepth, y - P.pilasterWidth / 2, 0],
          [X, y + P.pilasterWidth / 2, P.marbleTop]
        ),
        mat: 'marble',
        cast: true,
      })
    })

    L.bayRanges.forEach((b) => {
      // plinth
      if (P.plinthHeight > 0.001) {
        list.push({
          key: `plinth${b.i}`,
          geometry: boxGeometry([X - P.plinthDepth, b.y0 + 0.004, 0], [X, b.y1 - 0.004, P.plinthHeight]),
          mat: 'marble',
          cast: true,
        })
      }
      // white backing board behind the mesh
      if (b.white) {
        list.push({
          key: `back${b.i}`,
          geometry: boxGeometry(
            [X - Math.max(0.005, P.meshOffset - 0.006 - (P.ribsBehind ? P.ribDepth : 0.014)), b.y0, P.plinthHeight],
            [X - 0.001, b.y1, wallTop]
          ),
          mat: 'backing',
        })
      }
      // mesh panel following the canopy profile. When the sheets cover the ribs,
      // neighbouring panels run over the pilaster gap and meet on the rib centre line.
      const joint = 0.002
      const half = P.pilasterWidth / 2 - joint
      const first = b.i === 0
      const last = b.i === L.bayRanges.length - 1
      const cover = P.meshCoversRibs && !sep
      const my0 = cover && !first ? b.y0 - half : b.y0
      const my1 = cover && !last ? b.y1 + half : b.y1
      list.push({
        key: `mesh${b.i}`,
        geometry: panelGeometry(P, prof, my0, my1),
        mat: 'mesh',
        cast: P.meshShadows,
      })

      // separate closed frame per section: two side profiles along the sheet edges,
      // a bottom bar on the plinth, an end bar at the canopy edge, and its own rail
      if (sep) {
        const h = P.ribWidth / 2
        steel(`f${b.i}a`, ribGeometry(P, prof, b.y0 + h))
        steel(`f${b.i}b`, ribGeometry(P, prof, b.y1 - h))
        steel(`f${b.i}bot`, crossBarGeometry(P, prof, b.y0 + 2 * h, b.y1 - 2 * h, 'start'))
        steel(`f${b.i}end`, crossBarGeometry(P, prof, b.y0 + 2 * h, b.y1 - 2 * h, 'end'))
        if (P.showRail) rail(`f${b.i}rail`, b.y0 + 2 * h, b.y1 - 2 * h)
      }
    })

    if (!sep) {
      // shared ribs on the joints between sections
      const ribYs = [...L.ribYs]
      if (P.edgeRibs) ribYs.unshift(L.y0 + P.ribWidth / 2), ribYs.push(L.y1 - P.ribWidth / 2)
      ribYs.forEach((y, i) => steel(`rib${i}`, ribGeometry(P, prof, y)))
      if (P.endTrim) steel('trim', endTrimGeometry(P, prof, L.y0, L.y1))
      if (P.showRail) rail('rail', L.y0, L.y1)
    }
    return list
  }, [P])

  useEffect(() => () => parts.forEach((p) => p.geometry.dispose()), [parts])

  return parts.map((p) => (
    <mesh key={p.key} geometry={p.geometry} material={M[p.mat]} castShadow={!!p.cast} receiveShadow />
  ))
}
