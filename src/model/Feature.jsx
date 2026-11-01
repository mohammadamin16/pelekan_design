import { useEffect, useMemo } from 'react'
import { canopyParts, sectionNumber, withCanopy } from '../params'
import { ceilingAt } from '../geometry/rhino006'
import {
  boxGeometry,
  ceilingV,
  cutProfile,
  buildProfile,
  crossBarGeometry,
  endPlateGeometry,
  endTrimGeometry,
  finGeometry,
  panelGeometry,
  ribGeometry,
  ribSpan,
  sliceProfile,
} from '../geometry/ribPath'
import { expandedMetalGeometry } from '../geometry/expandedMetal'

// Parameters the 3D strands depend on (rebuilding them is the expensive part).
const MESH_KEYS = [
  'mesh3D', 'meshCellW', 'meshCellH', 'meshStrandW', 'meshTilt',
  'canopyHeight', 'filletRadius', 'ceilingRun', 'returnDrop', 'returnRadius',
  'fanSpread', 'featureY', 'wallX', 'meshOffset', 'plinthHeight', 'meshBreak', 'breakGap', 'ceilingBreaks',
]

// The designed element: pilasters, plinth, white backing, mesh canopy and steel ribs.
export function Feature({ P, M }) {
  const { parts, spans } = useMemo(() => {
    const { L, parts: cparts } = canopyParts(P)
    const prof = buildProfile(P, P.plinthHeight)
    const list = []
    const spans = []
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
    if (P.pilasterDepth > 0.001) L.ribYs.forEach((y, i) => {
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
      if (P.plinthHeight > 0.001 && P.plinthDepth > 0.001) {
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
    })

    const lastBay = L.bayRanges.length - 1
    // each part's own canopy (run / drop can differ per section and per part)
    const built = cparts.map((c) => {
      const BP = withCanopy(P, c.run, c.drop)
      return { BP, bprof: buildProfile(BP, P.plinthHeight) }
    })
    // Where a section is split, its parts share the wall, the bend and the start of
    // the ceiling run; they only differ after that. Arc length where they part ways:
    const vSplit = (a, b) => a.pts[1].v + (Math.PI / 2) * a.sA + Math.min(a.D, b.D)
    cparts.forEach((c, idx) => {
      const b = c.bay
      const key = `${b.i}.${c.j}`
      const { BP, bprof } = built[idx]
      // neighbouring part of the same section on each side (null at the section edges)
      const nb0 = c.j > 0 ? built[idx - 1].bprof : null
      const nb1 = c.j < c.n - 1 ? built[idx + 1].bprof : null
      // mesh panel following the canopy profile. When the sheets cover the ribs,
      // neighbouring panels run over the pilaster gap and meet on the rib centre line.
      const joint = 0.002
      const half = P.pilasterWidth / 2 - joint
      const cover = P.meshCoversRibs && !sep
      const my0 = cover && c.j === 0 && b.i > 0 ? c.y0 - half : c.y0
      const my1 = cover && c.j === c.n - 1 && b.i < lastBay ? c.y1 + half : c.y1
      // sheets: cut into separate panels at the breaks (above the wall part, and
      // once more on the ceiling at this section's distance from the wall)
      const g = P.breakGap
      const gaps = []
      if (P.meshBreak) gaps.push([bprof.pts[1].v - g, bprof.pts[1].v])
      const vc = ceilingV(bprof, sectionNumber(P.ceilingBreaks, b.i))
      if (vc != null) gaps.push([vc - g / 2, vc + g / 2])
      const pieces = cutProfile(bprof, gaps)
      pieces.forEach((pc, k) => {
        if (P.mesh3D) spans.push([my0, my1, c.run, c.drop, pc.pts[0].v, pc.pts[pc.pts.length - 1].v])
        else
          list.push({
            key: `mesh${key}.${k}`,
            geometry: panelGeometry(BP, pc, my0, my1),
            mat: 'mesh',
            cast: P.meshShadows,
          })
      })

      const h = P.ribWidth / 2
      if (sep) {
        // separate closed frame per panel: side profiles along the sheet edges, a bar
        // along the bottom and along the top/free edge. Inside a split section there is
        // no profile where the parts are one continuous sheet, only where they differ.
        const edge = (pc, nb) => {
          const v1 = pc.pts[pc.pts.length - 1].v
          if (!nb) return { prof: pc, from: pc.pts[0].v }
          const v0 = Math.max(vSplit(bprof, nb), pc.pts[0].v)
          return v1 - v0 < 0.01 ? null : { prof: sliceProfile(bprof, v0, v1), from: v0 }
        }
        pieces.forEach((pc, k) => {
          const e0 = edge(pc, nb0)
          const e1 = edge(pc, nb1)
          if (e0) steel(`f${key}.${k}a`, ribGeometry(BP, e0.prof, c.y0 + h))
          if (e1) steel(`f${key}.${k}b`, ribGeometry(BP, e1.prof, c.y1 - h))
          // bars stop short of a side profile, or run to the edge where there is none
          const start = pc.pts[0].v
          const ya = (atStart) => c.y0 + (e0 && (!atStart || e0.from <= start + 1e-6) ? 2 * h : 0)
          const yb = (atStart) => c.y1 - (e1 && (!atStart || e1.from <= start + 1e-6) ? 2 * h : 0)
          steel(`f${key}.${k}bot`, crossBarGeometry(BP, pc, ya(true), yb(true), 'start'))
          steel(`f${key}.${k}end`, crossBarGeometry(BP, pc, ya(false), yb(false), 'end'))
        })
        if (P.showRail && !P.meshBreak) rail(`f${key}rail`, c.y0 + 2 * h, c.y1 - 2 * h)
      } else {
        // shared ribs run through; 20x40 bars on both edges of every break
        pieces.slice(1).forEach((pc, k) => {
          steel(`brk${key}.${k}a`, crossBarGeometry(BP, pieces[k], c.y0, c.y1, 'end'))
          steel(`brk${key}.${k}b`, crossBarGeometry(BP, pc, c.y0, c.y1, 'start'))
        })
      }

      const drops = c.drop > 0.005
      // side plates closing the drop on the column side
      if (P.sideFins && drops) {
        const t = P.meshOffset
        steel(`fin${key}a`, finGeometry(BP, bprof, c.y0 + 0.0025, t))
        steel(`fin${key}b`, finGeometry(BP, bprof, c.y1 - 0.0025, t))
      }
      // part that stops on the ceiling: close it up to the ceiling above
      if (P.endPlates && !drops && c.run > 0.001) {
        const end = bprof.pts[bprof.pts.length - 1]
        const xe = X - P.meshOffset - end.s
        const top = ceilingAt(P, xe - 0.02, (c.y0 + c.y1) / 2)
        if (top - end.z > 0.005) steel(`endplate${key}`, endPlateGeometry(BP, bprof, c.y0, c.y1, top))
      }
    })

    if (!sep) {
      // shared ribs on the joints between sections
      const ribYs = [...L.ribYs]
      if (P.edgeRibs) ribYs.unshift(L.y0 + P.ribWidth / 2), ribYs.push(L.y1 - P.ribWidth / 2)
      ribYs.forEach((y, i) => steel(`rib${i}`, ribGeometry(P, prof, y)))
      if (P.endTrim) steel('trim', endTrimGeometry(P, prof, L.y0, L.y1))
      if (P.showRail && !P.meshBreak) rail('rail', L.y0, L.y1)
    }
    return { parts: list, spans }
  }, [P])

  useEffect(() => () => parts.forEach((p) => p.geometry.dispose()), [parts])

  // 3D expanded metal, one merged geometry per section
  const meshKey = JSON.stringify([spans, MESH_KEYS.map((k) => P[k])])
  const strands = useMemo(() => {
    return spans.map(([y0, y1, run, drop, v0, v1]) => {
      const BP = withCanopy(P, run, drop)
      return expandedMetalGeometry(BP, sliceProfile(buildProfile(BP, P.plinthHeight), v0, v1), y0, y1)
    })
  }, [meshKey]) // eslint-disable-line
  useEffect(() => () => strands.forEach((g) => g.dispose()), [strands])

  return (
    <>
      {parts.map((p) => (
        <mesh key={p.key} geometry={p.geometry} material={M[p.mat]} castShadow={!!p.cast} receiveShadow />
      ))}
      {strands.map((g, i) => (
        <mesh key={`strands${i}`} geometry={g} material={M.mesh3d} castShadow={P.meshShadows} receiveShadow />
      ))}
    </>
  )
}
