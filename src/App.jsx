import { useCallback, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Leva, folder, useControls } from 'leva'
import * as THREE from 'three'
import { DEFAULTS, PRESETS, SCHEMA, r2t, t2r } from './params'
import { useApp } from './store'
import { useMaterials } from './model/materials'
import { Room } from './model/Room'
import { Feature } from './model/Feature'
import { Signage } from './model/Signage'
import { LensSync, Navigation } from './controls/Navigation'
import { Toolbar } from './ui/Toolbar'

const STORAGE_KEY = 'pelekan-design-params-v2'

function loadSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return Object.fromEntries(Object.entries(s).filter(([k]) => k in DEFAULTS))
  } catch {
    return {}
  }
}

function buildSchema() {
  const saved = loadSaved()
  return Object.fromEntries(
    Object.entries(SCHEMA).map(([name, fields]) => {
      // fields with a `group` go into a nested (collapsed) sub-folder
      const top = {}
      const groups = {}
      Object.entries(fields).forEach(([k, { group, ...def }]) => {
        const entry = { ...def, value: saved[k] ?? def.value }
        if (group) (groups[group] ||= {})[k] = entry
        else top[k] = entry
      })
      Object.entries(groups).forEach(([g, f]) => (top[g] = folder(f, { collapsed: true })))
      return [name, folder(top, { collapsed: !['Signage'].includes(name) })]
    })
  )
}

const REF_SIZE = { view1: [1212, 610], view2: [1225, 610] }

function Lights({ P }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    gl.toneMappingExposure = P.exposure
  }, [gl, P.exposure])
  useEffect(() => {
    scene.environmentIntensity = P.envIntensity
  }, [scene, P.envIntensity])

  const target = useRef(new THREE.Object3D())
  const bounceTarget = useRef(new THREE.Object3D())
  const tpos = r2t([P.wallX - 1.5, P.featureY, 0.5])
  return (
    <>
      <ambientLight intensity={P.ambient} />
      {/* soft up-light so the ceiling reads bright like Rhino's rendered view */}
      <primitive object={bounceTarget.current} position={r2t([P.wallX - 3, P.featureY, 10])} />
      <directionalLight
        position={r2t([P.wallX - 5, P.featureY - 2, -5])}
        target={bounceTarget.current}
        intensity={P.bounce}
        color="#fffdf8"
      />
      <primitive object={target.current} position={tpos} />
      <directionalLight
        position={r2t([P.wallX - 9, P.featureY - 6, 7.5])}
        target={target.current}
        intensity={P.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#c9c9c9']} />
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-12, 2, 0]} rotation-y={Math.PI / 2} scale={[20, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[12, 2, 0]} rotation-y={-Math.PI / 2} scale={[20, 4, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[30, 30, 1]} color="#e8dcc8" />
      </Environment>
    </>
  )
}

function Model({ P }) {
  const M = useMaterials(P)
  return (
    <group rotation-x={-Math.PI / 2}>
      <Room P={P} M={M} />
      <Feature P={P} M={M} />
      <Signage P={P} M={M} />
    </group>
  )
}

function HudUpdater() {
  const n = useRef(0)
  const dir = new THREE.Vector3()
  useFrame(({ camera }) => {
    if (n.current++ % 10) return
    const el = document.getElementById('hud-cam')
    if (!el) return
    camera.getWorldDirection(dir)
    const [x, y, z] = t2r(camera.position.toArray())
    const [dx, dy, dz] = t2r(dir.toArray())
    el.textContent = `camera  x ${x.toFixed(3)}  y ${y.toFixed(3)}  z ${z.toFixed(3)}   ·   dir ${dx.toFixed(2)} ${dy.toFixed(2)} ${dz.toFixed(2)}`
  })
  return null
}

export default function App() {
  const [P, set] = useControls(() => buildSchema())
  const mode = useApp((s) => s.mode)
  const locked = useApp((s) => s.locked)
  const refImage = useApp((s) => s.refImage)
  const refOpacity = useApp((s) => s.refOpacity)

  useEffect(() => {
    try {
      // only store what differs from the defaults, so improved defaults still apply
      const diff = Object.fromEntries(Object.entries(P).filter(([k, v]) => String(DEFAULTS[k]) !== String(v))) // leva turns "501" into 501
      localStorage.setItem(STORAGE_KEY, JSON.stringify(diff))
    } catch {}
  }, [P])

  const onLens = useCallback((lens) => set({ lens }), [set])
  if (import.meta.env.DEV) window.__set = set
  const onExport = () => {
    const blob = new Blob([JSON.stringify(P, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pelekan-design.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const onImport = (obj) => set(Object.fromEntries(Object.entries(obj).filter(([k]) => k in DEFAULTS)))
  const onReset = () => {
    if (confirm('Reset all parameters to the defaults?')) set(DEFAULTS)
  }

  const ref = REF_SIZE[refImage]
  const stageStyle = ref ? { aspectRatio: `${ref[0]} / ${ref[1]}`, maxWidth: `calc(100vh * ${ref[0]} / ${ref[1]})` } : undefined
  const v1 = PRESETS.view1

  return (
    <div className="app">
      <div className={`stage ${ref ? 'framed' : ''}`} style={stageStyle}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          camera={{ position: r2t(v1.cam), fov: 37.85, near: 0.05, far: 400 }}
          onCreated={({ gl, camera }) => {
            gl.toneMapping = THREE.NeutralToneMapping
            camera.lookAt(...r2t(v1.target))
            useApp.getState().setGl(gl)
          }}
        >
          <color attach="background" args={['#e9e8e4']} />
          <LensSync lens={P.lens} />
          <Lights P={P} />
          <Model P={P} />
          <Navigation P={P} onLens={onLens} />
          <HudUpdater />
        </Canvas>
        {ref && <img className="ref" src={`${import.meta.env.BASE_URL}refs/${refImage}.jpg`} style={{ opacity: refOpacity }} alt="" />}
        {mode === 'walk' && (
          <div id="lock-overlay" className={locked ? 'hidden' : ''}>
            <div>
              <b>Click to look around</b>
              <br />
              WASD / arrows move · Shift run · Q / E down / up · Esc release mouse · Tab back to orbit
            </div>
          </div>
        )}
      </div>
      <Toolbar onExport={onExport} onImport={onImport} onReset={onReset} />
      <div className="hud">
        <div id="hud-cam" />
        <div className="keys">
          {mode === 'orbit'
            ? 'Orbit: left-drag rotate · right-drag pan · wheel zoom · 1-6 views · Tab walk'
            : 'Walk: WASD move · Shift run · Q/E height · Tab orbit'}
        </div>
      </div>
      <Leva titleBar={{ title: 'Design' }} theme={{ sizes: { rootWidth: '320px', controlWidth: '150px' } }} />
    </div>
  )
}
