import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import federation from '@originjs/vite-plugin-federation'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const apiEnv = loadEnv(mode, resolve(__dirname, '../../packages/apis'), 'VITE_')
  const envDefines = Object.keys(apiEnv).reduce((acc, key) => {
    acc[`import.meta.env.${key}`] = JSON.stringify(apiEnv[key])
    return acc
  }, {})

  return {
    define: envDefines,
    plugins: [
      federation({
        name: 'setup',
        filename: 'remoteEntry.js',
        exposes: {
          './App': './src/App.jsx'
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
      react(),
      svgr({ include: '**/*.svg' })
    ],
    base: '/',
    server: {
      host: '0.0.0.0',
      port: 5177,
      allowedHosts: true,
      hmr: {
        clientPort: 5173
      }
    },
    preview: {
      port: 4177
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src')
      }
    }
  }
})
