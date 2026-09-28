import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { transformWithOxc } from 'vite'

export default defineConfig({
  plugins: [{
    name: 'next-jsx-files',
    enforce: 'pre',
    transform(code, id) {
      if (/[\\/]components[\\/].*\.js$/.test(id)) {
        return transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic' } })
      }
    }
  }, react()],
  test: {
    environment: 'jsdom',
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
})
