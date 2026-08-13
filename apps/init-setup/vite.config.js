import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import federation from '@originjs/vite-plugin-federation'

// FE 빌드 정보를 dist/build-info.json 으로만 떨어뜨린다 (/version 페이지가 런타임에 읽는다).
// define 으로 번들에 굽지 않는 이유: dist 가 cloi_entropos 에 커밋되므로 빌드 시각이 번들
// 해시를 매번 흔들면 diff 가 커진다. 별도 파일이면 이 파일 한 줄만 바뀐다.
const buildInfoPlugin = (mode) => ({
  name: 'init-setup-build-info',
  apply: 'build',
  writeBundle(options) {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
    let commit = 'unknown'
    try {
      commit = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim()
    } catch {
      // git 없는 빌드 환경(컨테이너 등)에서는 commit 을 생략한다.
    }
    const info = { name: pkg.name, version: pkg.version, commit, mode, builtAt: new Date().toISOString() }
    writeFileSync(resolve(options.dir, 'build-info.json'), `${JSON.stringify(info, null, 2)}\n`)
  }
})

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
      svgr({ include: '**/*.svg' }),
      buildInfoPlugin(mode)
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
