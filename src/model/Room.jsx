import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { COLUMNS } from '../params'
import { boxGeometry, worldUV } from '../geometry/ribPath'
import { rhino006Room } from '../geometry/rhino006'

const FLOOR = { x0: -32, x1: 0, y0: -8, y1: 28 }
const SKIRT = 0.25

function useDisposable(build, deps) {
  const geos = useMemo(build, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geos.forEach((g) => g.geometry.dispose()), [geos])
  return geos
}

// Floor, ceiling, cladded feature wall, columns. All in Rhino coords.
export function Room({ P, M }) {
  const { wallX, wallYMin, wallYMax, ceilingHeight: H, marbleTop } = P

  const parts = useDisposable(() => {
    if (P.roomPlan === 'rhino006') return rhino006Room(P)
    const list = []
    // floor (normal +Z)
    const floor = new THREE.PlaneGeometry(FLOOR.x1 - FLOOR.x0, FLOOR.y1 - FLOOR.y0)
    floor.translate((FLOOR.x0 + FLOOR.x1) / 2, (FLOOR.y0 + FLOOR.y1) / 2, 0)
    worldUV(floor)
    list.push({ key: 'floor', geometry: floor, mat: 'floor', receive: true })

    // ceiling (normal -Z, only visible from below so the top view sees inside)
    const ceil = new THREE.PlaneGeometry(FLOOR.x1 - FLOOR.x0, FLOOR.y1 - FLOOR.y0)
    ceil.rotateX(Math.PI)
    ceil.translate((FLOOR.x0 + FLOOR.x1) / 2, (FLOOR.y0 + FLOOR.y1) / 2, H)
    list.push({ key: 'ceil', geometry: ceil, mat: 'ceiling', receive: true, ceiling: true })

    // feature wall: marble cladding + plaster above
    list.push({
      key: 'wall-marble',
      geometry: boxGeometry([wallX, wallYMin, 0], [wallX + 0.3, wallYMax, marbleTop]),
      mat: 'marble',
      receive: true,
      cast: true,
    })
    list.push({
      key: 'wall-plaster',
      geometry: boxGeometry([wallX, wallYMin, marbleTop], [wallX + 0.3, wallYMax, H]),
      mat: 'plaster',
      receive: true,
      cast: true,
    })

    if (P.showColumns) {
      COLUMNS.forEach((c, i) => {
        const b =
          c.kind === 'pier'
            ? { x0: wallX - c.depth, x1: wallX, y0: c.y0, y1: c.y1 }
            : { x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1 }
        list.push({
          key: `col${i}`,
          geometry: boxGeometry([b.x0, b.y0, SKIRT], [b.x1, b.y1, H]),
          mat: 'plaster',
          receive: true,
          cast: true,
        })
        const e = 0.012
        list.push({
          key: `skirt${i}`,
          geometry: boxGeometry(
            [b.x0 - e, b.y0 - e, 0],
            [c.kind === 'pier' ? b.x1 : b.x1 + e, b.y1 + e, SKIRT]
          ),
          mat: 'marble',
          receive: true,
          cast: true,
        })
      })
    }
    return list
  }, [wallX, wallYMin, wallYMax, H, marbleTop, P.showColumns, P.roomPlan])

  return parts.map((p) =>
    p.ceiling && !P.showCeiling ? null : (
      <mesh
        key={p.key}
        geometry={p.geometry}
        material={M[p.mat]}
        receiveShadow={!!p.receive}
        castShadow={!!p.cast}
      />
    )
  )
}
