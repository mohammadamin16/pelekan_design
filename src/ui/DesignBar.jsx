import { useEffect } from 'react'
import {
  SIGN_STYLES,
  allDesigns,
  createFrom,
  isBuiltin,
  isEdited,
  remove,
  rename,
  step,
  switchTo,
  useDesigns,
} from '../designs'

const typing = (e) => {
  const t = e.target
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

// Bottom bar: one button per design. `apply` pushes values into the panel.
export function DesignBar({ P, apply }) {
  const s = useDesigns()
  const list = allDesigns(s)
  const active = list.find((d) => d.id === s.active)

  useEffect(() => {
    const onKey = (e) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '[') apply(step(-1))
      if (e.key === ']') apply(step(1))
      if (e.key === 'g' || e.key === 'G') {
        const i = SIGN_STYLES.findIndex((x) => x.id === P.signStyle)
        apply({ signStyle: SIGN_STYLES[(i + 1) % SIGN_STYLES.length].id })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [apply, P.signStyle])

  const copy = () => {
    const name = prompt('Name for the new design:', `${active?.name || 'Design'} copy`)
    if (name?.trim()) apply(createFrom(P, name.trim()))
  }

  return (
    <div className="group designbar">
      <span className="label">Design</span>
      {list.map((d) => (
        <button
          key={d.id}
          className={d.id === s.active ? 'on' : ''}
          onClick={() => apply(switchTo(d.id))}
          title={`${d.note || 'saved in this browser'}${isEdited(d.id, s) ? ' · changed in the panel' : ''}`}
        >
          {d.name}
          {isEdited(d.id, s) && <i className="dot" />}
        </button>
      ))}
      <button onClick={copy} title="Save the current values as a new design">
        + Copy
      </button>
      {active && !isBuiltin(active.id) && (
        <>
          <button
            onClick={() => {
              const name = prompt('Rename design:', active.name)
              if (name?.trim()) rename(active.id, name.trim())
            }}
          >
            Rename
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete "${active.name}"?`)) apply(remove(active.id))
            }}
          >
            Delete
          </button>
        </>
      )}
      <span className="keys">[ ]</span>
      <span className="sep" />
      <span className="label">Guide board</span>
      {SIGN_STYLES.map((g) => (
        <button
          key={g.id}
          className={P.signStyle === g.id ? 'on' : ''}
          onClick={() => apply({ signStyle: g.id, showSigns: true })}
          title={g.note}
        >
          {g.name}
        </button>
      ))}
      <span className="keys">G</span>
    </div>
  )
}
