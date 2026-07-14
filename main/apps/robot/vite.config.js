import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import svgr from 'vite-plugin-svgr'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const apiEnv = loadEnv(mode, resolve(__dirname, '../../packages/apis'), 'VITE_')
  const envDefines = Object.keys(apiEnv).reduce((acc, key) => {
    acc[`import.meta.env.${key}`] = JSON.stringify(apiEnv[key])
    return acc
  }, {})

  return {
    define: envDefines,
    plugins: [
      federation({
        name: 'robot',
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
      svgr({ include: '**/*.svg' }),
      tailwindcss()
    ],
    worker: {
      // 플러그인 없음. 필요하면 여기에도 동일한 플러그인 배열을 직접 넣어주세요.
      format: 'es'
    },
    base: '/robot/',
    server: {
      port: 5175
      // hmr: {
      //   clientPort: 5173
      // }
    },
    preview: {
      port: 4175
    },
    build: {
      outDir: '../../apps-dist/robot',
      emptyOutDir: false
    },
    // Wasm을 정적 자산으로 인식(일반적으로 없어도 동작하지만 안전망으로)
    assetsInclude: ['**/*.wasm'],
    optimizeDeps: {
      force: true, // 락 변경/그래프 변경 시 재최적화 강제
      // 프리번들에 필요한 모듈만 포함하고,
      // node_modules 내 Wasm 래퍼를 esbuild가 건드리지 않게 제외하는게 안정적입니다.
      include: [
        '@mcap/support',
        '@mcap/core',
        '@mcap/browser',
        '@lichtblick/cdr',
        '@lichtblick/rosmsg2-serialization',
        '@lichtblick/ros2idl-parser',
        '@lichtblick/rosmsg'
      ]
    },
    resolve: {
      alias: [{ find: /^@\/(.*)/, replacement: resolve(__dirname, 'src/$1') }],
      preserveSymlinks: false
    }
  }
})
