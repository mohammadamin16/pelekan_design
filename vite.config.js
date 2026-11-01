import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

// Reference photos (public/refs) and the Rhino model (public/reference) are for
// local dev only — keep them out of deployed builds.
const stripRefs = {
  name: 'strip-refs',
  apply: 'build',
  closeBundle() {
    for (const d of ['refs', 'reference']) rmSync(resolve(__dirname, 'dist', d), { recursive: true, force: true })
  },
}

export default defineConfig({
  base: './',
  plugins: [react(), stripRefs],
  server: { port: 5173, open: false },
})
