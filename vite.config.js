import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

// Reference photos (public/refs) are for local dev only — keep them out of deployed builds.
const stripRefs = {
  name: 'strip-refs',
  apply: 'build',
  closeBundle() {
    rmSync(resolve(__dirname, 'dist/refs'), { recursive: true, force: true })
  },
}

export default defineConfig({
  base: './',
  plugins: [react(), stripRefs],
  server: { port: 5173, open: false },
})
