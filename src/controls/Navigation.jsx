import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { COLUMNS, PRESETS, r2t, t2r } from '../params'
import { useApp } from '../store'

const isTyping = (e) => {
  const t = e.target
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

// Rhino 35 mm lens -> three.js vertical FOV. Rhino maps the smaller viewport
// dimension to the 24 mm side of the 35 mm frame.
export function LensSync({ lens }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height
    const half = Math.atan(12 / lens)
    camera.fov = THREE.MathUtils.radToDeg(aspect >= 1 ? 2 * half : 2 * Math.atan(Math.tan(half) / aspect))
    camera.updateProjectionMatrix()
  }, [camera, lens, size])
  return null
}

function Orbit() {
  const ref = useRef()
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.target.set(...useApp.getState().lastTarget)
    c.update()
    const onEnd = () => useApp.getState().setLastTarget(c.target.toArray())
    c.addEventListener('end', onEnd)
    return () => c.removeEventListener('end', onEnd)
  }, [])
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      zoomSpeed={0.8}
      screenSpacePanning
      maxDistance={80}
      minDistance={0.2}
    />
  )
}

function Walk({ P }) {
  const { camera } = useThree()
  const keys = useRef({})
  const setLocked = useApp((s) => s.setLocked)

  useEffect(() => {
    camera.position.y = P.eyeHeight
    const down = (e) => !isTyping(e) && (keys.current[e.code] = true)
    const up = (e) => (keys.current[e.code] = false)
    const blur = () => (keys.current = {})
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      // hand a sensible target back to orbit mode
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      useApp.getState().setLastTarget(camera.position.clone().addScaledVector(dir, 3).toArray())
      setLocked(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fwd = new THREE.Vector3()
  const right = new THREE.Vector3()
  useFrame((_, dt) => {
    const k = keys.current
    const speed = (k.ShiftLeft || k.ShiftRight ? 4.5 : 1.6) * Math.min(dt, 0.1)
    camera.getWorldDirection(fwd)
    fwd.y = 0
    fwd.normalize()
    right.crossVectors(fwd, camera.up).normalize()
    if (k.KeyW || k.ArrowUp) camera.position.addScaledVector(fwd, speed)
    if (k.KeyS || k.ArrowDown) camera.position.addScaledVector(fwd, -speed)
    if (k.KeyD || k.ArrowRight) camera.position.addScaledVector(right, speed)
    if (k.KeyA || k.ArrowLeft) camera.position.addScaledVector(right, -speed)
    if (k.KeyE) camera.position.y += speed
    if (k.KeyQ) camera.position.y -= speed
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.2, P.ceilingHeight - 0.1)

    // collisions in Rhino plan coords
    const R = 0.25
    let [x, y] = t2r(camera.position.toArray())
    x = Math.min(x, P.wallX - P.meshOffset - (P.ribsBehind ? 0 : P.ribDepth) - R)
    if (P.showColumns) {
      for (const c of COLUMNS) {
        const b =
          c.kind === 'pier'
            ? { x0: P.wallX - c.depth, x1: P.wallX, y0: c.y0, y1: c.y1 }
            : c
        if (x > b.x0 - R && x < b.x1 + R && y > b.y0 - R && y < b.y1 + R) {
          const pushes = [
            [b.x0 - R - x, 0],
            [b.x1 + R - x, 0],
            [0, b.y0 - R - y],
            [0, b.y1 + R - y],
          ]
          pushes.sort((a, b2) => Math.hypot(...a) - Math.hypot(...b2))
          x += pushes[0][0]
          y += pushes[0][1]
        }
      }
    }
    camera.position.x = x
    camera.position.z = -y
  })

  return (
    <PointerLockControls
      selector="#lock-overlay"
      onLock={() => setLocked(true)}
      onUnlock={() => setLocked(false)}
    />
  )
}

// Applies camera presets requested from the toolbar.
function ViewApplier({ onLens }) {
  const view = useApp((s) => s.view)
  const { camera, controls } = useThree()
  useEffect(() => {
    if (!view) return
    const p = PRESETS[view.name]
    if (!p) return
    const target = r2t(p.target)
    // flush any leftover orbit momentum so it can't rotate the preset away
    if (controls?.update) {
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.update()
      controls.enableDamping = damping
    }
    camera.position.set(...r2t(p.cam))
    camera.lookAt(...target)
    useApp.getState().setLastTarget(target)
    useApp.getState().setMode('orbit')
    if (controls?.target) {
      controls.target.set(...target)
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.update()
      controls.enableDamping = damping
    }
    onLens(p.lens)
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export function Navigation({ P, onLens }) {
  const mode = useApp((s) => s.mode)
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(e)) return
      if (e.code === 'Tab') {
        e.preventDefault()
        const s = useApp.getState()
        s.setMode(s.mode === 'orbit' ? 'walk' : 'orbit')
      }
      const n = { Digit1: 'view1', Digit2: 'view2', Digit3: 'directory', Digit4: 'overview', Digit5: 'side', Digit6: 'top' }[e.code]
      if (n && useApp.getState().mode === 'orbit') useApp.getState().goView(n)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <>
      {mode === 'orbit' ? <Orbit /> : <Walk P={P} />}
      <ViewApplier onLens={onLens} />
    </>
  )
}
