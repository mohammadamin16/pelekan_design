import { create } from 'zustand'

export const useApp = create((set) => ({
  mode: 'orbit', // 'orbit' | 'walk'
  setMode: (mode) => set({ mode }),
  locked: false,
  setLocked: (locked) => set({ locked }),
  // last orbit target in three.js coords, used when (re)mounting OrbitControls
  lastTarget: [-10.954, 1.36, -9.331],
  setLastTarget: (lastTarget) => set({ lastTarget }),
  // camera preset request
  view: null,
  goView: (name) => set({ view: { name, t: performance.now() } }),
  // reference overlay
  refImage: 'none',
  setRefImage: (refImage) => set({ refImage }),
  refOpacity: 0.5,
  setRefOpacity: (refOpacity) => set({ refOpacity }),
  gl: null,
  setGl: (gl) => set({ gl }),
}))

if (import.meta.env.DEV) window.__app = useApp
