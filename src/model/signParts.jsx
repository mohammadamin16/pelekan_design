// Shared bits for the guide-board (floor directory) variants.
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { featureLayout } from '../params'

// local board space: +x = viewer's right (world -Y), +y = up (world +Z), +z = toward viewer (world -X)
export const BASIS = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0))
)

export function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    Promise.all([
      document.fonts.load(`800 40px Vazirmatn`, 'طبقه 5'),
      document.fonts.load(`600 40px Vazirmatn`, 'واحد'),
      document.fonts.load(`400 40px Vazirmatn`, 'طبقه ۵'),
    ])
      .catch(() => {})
      .finally(() => alive && setReady(true))
    return () => (alive = false)
  }, [])
  return ready
}

const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 20).rotateX(Math.PI / 2) // axis along local z

export function Cyl({ x, y, z0, z1, r, material }) {
  return (
    <mesh
      geometry={cylGeo}
      material={material}
      position={[x, y, (z0 + z1) / 2]}
      scale={[r, r, Math.max(1e-4, z1 - z0)]}
      castShadow
    />
  )
}

// The section the board sits on: never the first or last one.
export function signBay(P) {
  const L = featureLayout(P)
  return L.bayRanges[Math.min(Math.max(1, P.signBay), Math.max(1, L.bayRanges.length - 2))]
}

// Board width and the five floor rows (floor 5 at the top), in local units.
export function signRows(P, bay) {
  const w = Math.max(0.3, bay.y1 - bay.y0 - 2 * P.signMargin)
  const h = P.signRowH
  const rows = [5, 4, 3, 2, 1].map((floor, i) => ({ floor, y: P.signTop - h / 2 - i * (h + P.signGap) }))
  return { w, h, rows }
}
