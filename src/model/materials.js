import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { makeMarbleTexture, makeMeshTextures, makeTravertineTexture } from '../textures/procedural'

let marbleTex, floorTex
const getMarble = () => (marbleTex ||= makeMarbleTexture())
const getFloor = () => (floorTex ||= makeTravertineTexture())

export function useMaterials(P) {
  const meshTex = useMemo(() => makeMeshTextures(P.meshStrand), [P.meshStrand])
  useEffect(() => () => (meshTex.map.dispose(), meshTex.alphaMap.dispose()), [meshTex])

  const M = useMemo(() => {
    const marble = new THREE.MeshStandardMaterial({ map: getMarble(), roughness: 0.32 })
    const floor = new THREE.MeshStandardMaterial({ map: getFloor(), roughness: 0.65 })
    const plaster = new THREE.MeshStandardMaterial({ color: '#f3f2ef', roughness: 0.92 })
    const ceiling = new THREE.MeshStandardMaterial({ color: '#f3f2ef', roughness: 0.95 })
    const backing = new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.85 })
    const steel = new THREE.MeshStandardMaterial({ color: '#0e0e0e', roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide })
    const mesh = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      alphaToCoverage: true,
      transparent: false,
    })
    return { marble, floor, plaster, ceiling, backing, steel, mesh }
  }, [])

  useEffect(() => () => Object.values(M).forEach((m) => m.dispose()), [M])

  // live-update material properties from params
  const mt = M.marble.map
  mt.repeat.set(1 / (8 * P.marbleCourse), 1 / (4 * P.marbleCourse))
  M.marble.color.set(P.marbleTint)
  M.marble.roughness = P.marbleRoughness

  M.floor.map.repeat.set(1 / (8 * P.floorTileX), 1 / (6 * P.floorTileY))
  M.floor.color.set(P.floorTint)

  M.plaster.color.set(P.plasterColor)
  M.ceiling.color.set(P.plasterColor)
  M.steel.color.set(P.ribColor)

  if (M.mesh.map !== meshTex.map) {
    M.mesh.map = meshTex.map
    M.mesh.alphaMap = meshTex.alphaMap
    M.mesh.needsUpdate = true
  }
  meshTex.map.repeat.set(1 / P.meshCellW, 1 / P.meshCellH)
  meshTex.alphaMap.repeat.set(1 / P.meshCellW, 1 / P.meshCellH)
  M.mesh.color.set(P.meshColor)
  M.mesh.metalness = P.meshMetalness
  M.mesh.roughness = P.meshRoughness

  return M
}
