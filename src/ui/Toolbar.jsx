import { useRef } from 'react'
import { PRESETS } from '../params'
import { useApp } from '../store'

const REFS = {
  none: 'Off',
  view1: 'View 1 render',
  view2: 'View 2 render',
}

export function Toolbar({ onExport, onImport, onReset }) {
  const mode = useApp((s) => s.mode)
  const setMode = useApp((s) => s.setMode)
  const goView = useApp((s) => s.goView)
  const refImage = useApp((s) => s.refImage)
  const setRefImage = useApp((s) => s.setRefImage)
  const refOpacity = useApp((s) => s.refOpacity)
  const setRefOpacity = useApp((s) => s.setRefOpacity)
  const fileRef = useRef()

  const screenshot = () => {
    const gl = useApp.getState().gl
    if (!gl) return
    const a = document.createElement('a')
    a.href = gl.domElement.toDataURL('image/png')
    a.download = `pelekan-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`
    a.click()
  }

  return (
    <div className="toolbar">
      <div className="group">
        {Object.entries(PRESETS).map(([k, p], i) => (
          <button key={k} onClick={() => goView(k)} title={`Key ${i + 1}`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="group">
        <button className={mode === 'orbit' ? 'on' : ''} onClick={() => setMode('orbit')} title="Tab">
          Orbit
        </button>
        <button className={mode === 'walk' ? 'on' : ''} onClick={() => setMode('walk')} title="Tab">
          Walk
        </button>
      </div>
      {import.meta.env.DEV && (
      <div className="group">
        <label>
          Reference
          <select
            value={refImage}
            onChange={(e) => {
              const v = e.target.value
              setRefImage(v)
              if (v !== 'none') goView(v)
            }}
          >
            {Object.entries(REFS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {refImage !== 'none' && (
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={refOpacity}
            onChange={(e) => setRefOpacity(+e.target.value)}
            title="Overlay opacity"
          />
        )}
      </div>
      )}
      <div className="group">
        <button onClick={screenshot}>Screenshot</button>
        <button onClick={onExport}>Export JSON</button>
        <button onClick={() => fileRef.current.click()}>Import JSON</button>
        <button onClick={onReset}>Reset</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) onImport(JSON.parse(await f.text()))
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
