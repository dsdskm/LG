import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import federation from '@originjs/vite-plugin-federation'

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
        name: 'init-setup',
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
      port: 5181,
      hmr: {
        clientPort: 5181
      },
      watch: {
      usePolling: true,  // 파일 변경 감지를 폴링 방식으로 전환
      interval: 100      // 100ms 주기로 검사
    }
    },
    preview: {
      port: 4181
    },
    build: {
      outDir: '../../apps-dist/init-setup',
      emptyOutDir: true
    },
    resolve: {
      alias: [{ find: /^@\/(.*)/, replacement: resolve(__dirname, 'src/$1') }]
    }
  }
})
