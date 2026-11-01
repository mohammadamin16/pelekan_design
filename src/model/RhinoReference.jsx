// Your Rhino model (karimkhan 006.3dm) shown in place, in Rhino coordinates.
// 'ghost' = see-through over the parametric model, 'solid' = its own materials
// (the generated room is hidden then, so the two don't fight).
import { useEffect, useState } from 'react'
import * as THREE from 'three'

const FILE = 'reference/karimkhan-006.3dm'
const LIB = 'https://cdn.jsdelivr.net/npm/rhino3dm@8.4.0/'

const ghostMat = new THREE.MeshStandardMaterial({
  color: '#9fd3ff',
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
  side: THREE.DoubleSide,
})

let cached = null // loaded once per page

export function RhinoReference({ mode }) {
  const [obj, setObj] = useState(cached)

  useEffect(() => {
    if (mode === 'off' || obj || !import.meta.env.DEV) return // the .3dm is not deployed
    let alive = true
    import('three/examples/jsm/loaders/3DMLoader.js').then(({ Rhino3dmLoader }) => {
      const loader = new Rhino3dmLoader().setLibraryPath(LIB)
      loader.load(
        FILE,
        (o) => {
          cached = o
          if (alive) setObj(o)
        },
        undefined,
        (e) => console.error('Rhino reference failed to load', e)
      )
    })
    return () => {
      alive = false
    }
  }, [mode, obj])

  useEffect(() => {
    if (!obj) return
    obj.traverse((m) => {
      if (!m.isMesh) return
      m.userData.orig ||= m.material
      m.material = mode === 'ghost' ? ghostMat : m.userData.orig
      m.castShadow = m.receiveShadow = mode === 'solid'
      m.renderOrder = mode === 'ghost' ? 10 : 0
    })
  }, [obj, mode])

  if (!obj || mode === 'off' || !import.meta.env.DEV) return null
  return <primitive object={obj} />
}
