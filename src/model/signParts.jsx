// Shared bits for the guide-board (floor directory) variants.
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { featureLayout } from '../params'
import { SIGN_FONTS, WHITE_BOARD } from '../textures/signs'

// local board space: +x = viewer's right (world -Y), +y = up (world +Z), +z = toward viewer (world -X)
export const BASIS = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0))
)

export function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    Promise.all(
      SIGN_FONTS.flatMap(({ family }) => [
        document.fonts.load(`800 40px ${family}`, 'طبقه 5'),
        document.fonts.load(`600 40px ${family}`, 'واحد'),
        document.fonts.load(`400 40px ${family}`, 'طبقه ۵'),
      ])
    )
      .catch(() => {})
      .finally(() => alive && setReady(true))
    return () => (alive = false)
  }, [])
  return ready
}

// Laser-cut text: the plate face is cut out (alphaMap) where its light text is, and a
// white board sits right behind the plate, so the text reads white through the plate.
export const WHITE_T = 0.005 // 5 mm white acrylic behind the plate (deep enough to bury the pot magnets)
export const WHITE_INSET = 0.003 // kept 3 mm inside the plate outline so its edge doesn't show

export function faceMaterial({ map, alpha }, mat) {
  return new THREE.MeshStandardMaterial({
    map,
    alphaMap: alpha,
    alphaTest: alpha ? 0.5 : 0,
    metalness: mat.metalness,
    roughness: mat.roughness,
  })
}

// Edge walls of a cut plate: plain colour, trimmed by the same cut mask (see plateGeometry).
export function wallMaterial(color, alpha, mat) {
  return new THREE.MeshStandardMaterial({
    color,
    alphaMap: alpha,
    alphaTest: alpha ? 0.5 : 0,
    metalness: mat.metalness,
    roughness: mat.roughness,
  })
}

// A plate from a closed outline (local x, y) and thickness `depth` (along +z, from z = 0).
// Groups: 0 = front + back faces, 1 = edge walls. Every vertex carries uv = its own (x, y),
// the walls included, so ONE cut mask (alphaMap) trims both the faces and — where a cut
// runs out through the edge — the wall there as well, leaving a clean notch.
export function plateGeometry(points, depth) {
  let pts = points.slice()
  if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-9) pts.pop()
  if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse()
  const tris = THREE.ShapeUtils.triangulateShape(pts, [])
  const pos = []
  const nor = []
  const uv = []
  const idx = []
  const vert = (x, y, z, nx, ny, nz) => {
    pos.push(x, y, z)
    nor.push(nx, ny, nz)
    uv.push(x, y)
    return pos.length / 3 - 1
  }
  const front = pts.map((p) => vert(p.x, p.y, depth, 0, 0, 1))
  const back = pts.map((p) => vert(p.x, p.y, 0, 0, 0, -1))
  for (const [a, b, c] of tris) idx.push(front[a], front[b], front[c], back[a], back[c], back[b])
  const faceCount = idx.length
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const nx = (b.y - a.y) / len
    const ny = -(b.x - a.x) / len
    const v0 = vert(a.x, a.y, 0, nx, ny, 0)
    const v1 = vert(b.x, b.y, 0, nx, ny, 0)
    const v2 = vert(b.x, b.y, depth, nx, ny, 0)
    const v3 = vert(a.x, a.y, depth, nx, ny, 0)
    idx.push(v0, v1, v2, v0, v2, v3)
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.addGroup(0, faceCount, 0)
  g.addGroup(faceCount, idx.length - faceCount, 1)
  return g
}

// ---- Magnetic fixing -------------------------------------------------------------
// Every face plate is held on magnets alone, with nothing showing on its face:
//  - countersunk pot magnets (steel cup, Ø16 x 4.5, ~8 kg pull each) sit in counterbores in
//    the white board, flush with its front. The pot magnet's own countersunk screw is what fixes
//    the white board to its spacer/bar, so one part both holds the board and grips the plate;
//  - the face plate is mild steel (black or copper-coloured coating) and sticks straight on;
//    a non-magnetic face (acrylic, stainless) gets a steel disc bonded behind each magnet;
//  - two short locating studs on the back of the face plate drop into holes in the white board,
//    so the plate can't slide (magnets resist pulling far better than sliding) and lines up exactly.
export const MAG_R = 0.008
export const MAG_H = 0.0045
export const STUD_R = 0.002
export const STUD_L = 0.004
const magnetCup = new THREE.MeshStandardMaterial({ color: '#b6b9bd', metalness: 0.9, roughness: 0.25 })
const magnetScrew = new THREE.MeshStandardMaterial({ color: '#4a4c50', metalness: 0.8, roughness: 0.35 })
const studMat = new THREE.MeshStandardMaterial({ color: '#2b2c2f', metalness: 0.6, roughness: 0.4 })

// Pot magnet whose front face sits flush with z = `front` (the white board's front).
export function PotMagnet({ x, y, front }) {
  return (
    <>
      <Cyl x={x} y={y} z0={front - MAG_H} z1={front + 0.0002} r={MAG_R} material={magnetCup} />
      <Cyl x={x} y={y} z0={front} z1={front + 0.0003} r={0.0035} material={magnetScrew} />
    </>
  )
}

// Locating stud on the back of a face plate whose back is at z = `back`.
export function LocatingStud({ x, y, back }) {
  return <Cyl x={x} y={y} z0={back - STUD_L} z1={back} r={STUD_R} material={studMat} />
}

export const whiteBoardMaterial = () =>
  new THREE.MeshStandardMaterial({ color: WHITE_BOARD, metalness: 0, roughness: 0.35 })

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
