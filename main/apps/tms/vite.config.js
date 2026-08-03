import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import federation from '@originjs/vite-plugin-federation'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const apiEnv = loadEnv(mode, resolve(__dirname, '../../packages/apis'), 'VITE_')
  const envDefines = Object.keys(apiEnv).reduce((acc, key) => {
    acc[`import.meta.env.${key}`] = JSON.stringify(apiEnv[key])
    return acc
  }, {})

  return {
    define: envDefines,
    plugins: [
      react(),
      federation({
        name: 'tms',
        filename: 'remoteEntry.js',
        exposes: {
          './App': './src/App.tsx'
        },
        shared: {
          react: { singleton: true },
          'react-dom': { singleton: true },
          'react-router-dom': { singleton: true },
          i18next: { singleton: true },
          'react-i18next': { singleton: true },
          'styled-components': { singleton: true },
          'i18next-http-backend': { singleton: true },
          'i18next-browser-languagedetector': { singleton: true }
        }
      }),
      svgr({ include: '**/*.svg' }),
      tailwindcss()
    ],
    base: '/tms',
    server: {
      port: 5179,
    },
    preview: { port: 4179 },
    build: {
      outDir: '../../apps-dist/tms',
      emptyOutDir: false,
      cssCodeSplit: false
    },
    resolve: {
      alias: [{ find: /^@\/(.*)/, replacement: resolve(__dirname, 'src/$1') }]
    }
  }
})
