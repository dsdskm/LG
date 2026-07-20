const fs = require('fs')
const path = require('path')

const appName = process.argv[2]
if (!appName) {
  console.error('Please provide an app name: node scripts/add-app.js <app-name>')
  process.exit(1)
}

const ROOT_DIR = path.resolve(__dirname, '..')
const APPS_DIR = path.join(ROOT_DIR, 'apps')
const NEW_APP_DIR = path.join(APPS_DIR, appName)

if (fs.existsSync(NEW_APP_DIR)) {
  console.error(`Error: Directory ${NEW_APP_DIR} already exists.`)
  process.exit(1)
}

// 1. Determine Ports
const mainViteConfigPath = path.join(APPS_DIR, 'main', 'vite.config.js')
const mainViteConfig = fs.readFileSync(mainViteConfigPath, 'utf8')

// Extract server ports
const serverProxyMatch = mainViteConfig.match(/server: \{[\s\S]+?proxy: \{([\s\S]+?)\}\s*\}/)
const serverPorts = serverProxyMatch
  ? [...serverProxyMatch[1].matchAll(/localhost:(\d+)/g)].map((m) => parseInt(m[1], 10))
  : []
const nextServerPort = serverPorts.length > 0 ? Math.max(...serverPorts) + 1 : 5174

// Extract preview ports
const previewProxyMatch = mainViteConfig.match(/preview: \{[\s\S]+?proxy: \{([\s\S]+?)\}\s*\}/)
const previewPorts = previewProxyMatch
  ? [...previewProxyMatch[1].matchAll(/localhost:(\d+)/g)].map((m) => parseInt(m[1], 10))
  : []
const nextPreviewPort = previewPorts.length > 0 ? Math.max(...previewPorts) + 1 : 4174

console.log(`> Using ports: Server=${nextServerPort}, Preview=${nextPreviewPort} for ${appName}`)

// 2. Create Files in apps/{appName}
console.log(`> Creating apps/${appName}...`)
fs.mkdirSync(path.join(NEW_APP_DIR, 'src'), { recursive: true })
fs.mkdirSync(path.join(NEW_APP_DIR, 'locales', 'ko-KR'), { recursive: true })
fs.mkdirSync(path.join(NEW_APP_DIR, 'locales', 'en-US'), { recursive: true })
fs.mkdirSync(path.join(NEW_APP_DIR, 'locales', 'ja-JP'), { recursive: true })

const pkgJson = {
  name: appName,
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'vite build --mode prod',
    'build:dev': 'vite build --mode dev',
    'build:qa': 'vite build --mode qa',
    format: 'npx prettier . --write',
    lint: 'eslint .',
    preview: 'vite preview'
  },
  dependencies: {
    '@originjs/vite-plugin-federation': '^1.4.1',
    '@repo/apis': 'workspace:*',
    '@repo/constants': 'workspace:*',
    '@repo/hooks': 'workspace:*',
    '@repo/locales': 'workspace:*',
    '@repo/stores': 'workspace:*',
    '@repo/ui': 'workspace:*',
    '@repo/utils': 'workspace:*',
    i18next: '25.8.0',
    'i18next-browser-languagedetector': '8.2.0',
    'i18next-http-backend': '3.0.2',
    react: '19.2.0',
    'react-dom': '19.2.0',
    'react-router-dom': '7.1.3',
    'styled-components': '^6.3.8',
    'react-i18next': '16.5.3',
    'react-spinners': '^0.17.0',
    'react-toastify': '^11.0.5',
    'vite-plugin-svgr': '^4.5.0',
    zustand: '^5.0.10'
  },
  devDependencies: {
    '@vitejs/plugin-react': '^5.1.1',
    vite: '^7.2.4'
  }
}

fs.writeFileSync(path.join(NEW_APP_DIR, 'package.json'), JSON.stringify(pkgJson, null, 2))

// Locales initialization
;['ko-KR', 'en-US', 'ja-JP'].forEach((lang) => {
  const routeJson = lang === 'ko-KR' ? { home: '홈' } : lang === 'en-US' ? { home: 'Home' } : { home: 'ホーム' }
  fs.writeFileSync(path.join(NEW_APP_DIR, 'locales', lang, 'route.json'), JSON.stringify(routeJson, null, 2))
})

// Locales index.js
const localesIndexJs = `import koRoute from './ko-KR/route.json'
import enRoute from './en-US/route.json'
import jaRoute from './ja-JP/route.json'

export const translations = {
  'ko-KR': {
    route: koRoute
  },
  'en-US': {
    route: enRoute
  },
  'ja-JP': {
    route: jaRoute
  }
}
`
fs.writeFileSync(path.join(NEW_APP_DIR, 'locales', 'index.js'), localesIndexJs)

// i18n.js
const i18nJs = `import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { translations as globalTranslations } from '@repo/locales'
import { translations as localTranslations } from '../locales'

const i18n = i18next.default || i18next

const mergeResources = (global, local) => {
  const merged = { ...global }
  Object.keys(local).forEach((lang) => {
    merged[lang] = { ...merged[lang], ...local[lang] }
  })
  return merged
}

const resources = mergeResources(globalTranslations, localTranslations)

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      supportedLngs: ['ko-KR', 'en-US', 'ja-JP'],
      fallbackLng: 'ko-KR',
      interpolation: {
        escapeValue: false
      },
      react: {
        useSuspense: false
      }
    })
}

export default i18n
`
fs.writeFileSync(path.join(NEW_APP_DIR, 'src', 'i18n.js'), i18nJs)

const viteConfig = `import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig(({ mode }) => {
  const apiEnv = loadEnv(mode, resolve(__dirname, '../../packages/apis'), 'VITE_')
  const envDefines = Object.keys(apiEnv).reduce((acc, key) => {
    acc[\`import.meta.env.\${key}\`] = JSON.stringify(apiEnv[key])
    return acc
  }, {})

  return {
    define: envDefines,
    plugins: [
      federation({
        name: '${appName}',
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
      port: ${nextServerPort},
      hmr: {
        clientPort: 5173
      }
    },
    preview: {
      port: ${nextPreviewPort}
    },
    build: {
      outDir: '../../apps-dist/${appName}',
      emptyOutDir: true
    },
    resolve: {
      alias: [{ find: /^@\\/(.*)/, replacement: resolve(__dirname, 'src/$1') }]
    }
  }
})
`
fs.writeFileSync(path.join(NEW_APP_DIR, 'vite.config.js'), viteConfig)

const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OPCON - ${appName.toUpperCase()}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
fs.writeFileSync(path.join(NEW_APP_DIR, 'index.html'), indexHtml)

const appJsx = `import React, { useMemo, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import Router from './router/Router'
import { appRoutes, getAppPrefix, flattenRoutes } from './router/routes'
import { GlobalStyle } from '@repo/ui/styles'
import { useWindowDimensions } from '@repo/hooks'
import { useTranslation } from 'react-i18next'
import { Toast } from '@repo/ui'
import 'react-toastify/dist/ReactToastify.css'

const App = () => {
  useWindowDimensions()
  const { pathname } = useLocation()
  const { t: layoutT } = useTranslation('layout')
  const { t: appT } = useTranslation('route')

  const appPrefix = useMemo(() => getAppPrefix(pathname), [pathname])

  const processedAppRoutes = useMemo(() => {
    const processRoutes = (routes) => {
      return routes.map((route) => {
        return {
          ...route,
          ...(route.depth && { depth: processRoutes(route.depth) })
        }
      })
    }

    return processRoutes(appRoutes)
  }, [])

  const allRoutes = useMemo(() => flattenRoutes(processedAppRoutes), [processedAppRoutes])
  const headerRoutes = useMemo(() => {
    return processedAppRoutes.map((route) => {
      return {
        name: route.name,
        path: route.path
      }
    })
  }, [processedAppRoutes])

  return (
    <>
      <GlobalStyle />
      <Toast />
      <Suspense fallback={<div>{layoutT('loading')}</div>}>
        <Router
          allRoutes={allRoutes}
          appPrefix={appPrefix}
          processedAppRoutes={processedAppRoutes}
          headerRoutes={headerRoutes}
          appT={appT}
        />
      </Suspense>
    </>
  )
}

export default App
`
fs.writeFileSync(path.join(NEW_APP_DIR, 'src', 'App.jsx'), appJsx)

const mainJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@repo/ui/styles/vars.css'
import '@repo/ui/assets/fonts.css'
import './i18n'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
`
fs.writeFileSync(path.join(NEW_APP_DIR, 'src', 'main.jsx'), mainJsx)

// 3. Update Main App (Shell)
console.log(`> Updating apps/main...`)
let mainViteUpdated = mainViteConfig.replace(
  /remotes:\s*\{/,
  (match) =>
    `${match}\n          ${appName}: isProd ? '/${appName}/assets/remoteEntry.js' : '/${appName}/remoteEntry.js',`
)
mainViteUpdated = mainViteUpdated.replace(
  /server:\s*\{[\s\S]+?proxy:\s*\{/,
  (match) =>
    `${match}\n        '/${appName}': {\n          target: 'http://localhost:${nextServerPort}',\n          changeOrigin: true,\n          ws: true,\n          rewrite: (path) => (path === '/${appName}' ? '/${appName}/' : path)\n        },`
)
// Update preview proxy as well
mainViteUpdated = mainViteUpdated.replace(
  /preview:\s*\{[\s\S]+?proxy:\s*\{/,
  (match) =>
    `${match}\n        '/${appName}': {\n          target: 'http://localhost:${nextPreviewPort}',\n          changeOrigin: true,\n          ws: true,\n          rewrite: (path) => (path === '/${appName}' ? '/${appName}/' : path)\n        },`
)
fs.writeFileSync(mainViteConfigPath, mainViteUpdated)

const mainAppJsxPath = path.join(APPS_DIR, 'main', 'src', 'App.jsx')
let mainAppJsx = fs.readFileSync(mainAppJsxPath, 'utf8')

// Add Lazy import if not exists
if (!mainAppJsx.includes(`import('${appName}/App')`)) {
  const matches = [...mainAppJsx.matchAll(/const \w+ = React\.lazy\(\(\) => import\('[^']+'\)\)/g)]
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1]
    const insertPos = lastMatch.index + lastMatch[0].length
    mainAppJsx =
      mainAppJsx.slice(0, insertPos) +
      `\nconst ${appName.toUpperCase()} = React.lazy(() => import('${appName}/App'))` +
      mainAppJsx.slice(insertPos)
  }
}

// Add Route if not exists
if (!mainAppJsx.includes(`path="/${appName}/*"`)) {
  const routeAddition = `          <Route\n            path="/${appName}/*"\n            element={\n              <MainLayout currentApp={appPrefix}>\n                <${appName.toUpperCase()} />\n              </MainLayout>\n            }\n          />\n`
  mainAppJsx = mainAppJsx.replace(/(\s*<\/Routes>)/, `\n${routeAddition}$1`)
}
fs.writeFileSync(mainAppJsxPath, mainAppJsx)

// 4. Update Infrastructure
console.log(`> Updating Infrastructure...`)
const dockerfilePath = path.join(ROOT_DIR, 'Dockerfile')
let dockerfile = fs.readFileSync(dockerfilePath, 'utf8')
dockerfile = dockerfile.replace(
  /(RUN test -f apps-dist\/robot\/index\.html[\s\S]+?\|\| exit 1\))/g,
  `$1\nRUN test -f apps-dist/${appName}/index.html \\\n || (echo "❌ ${appName} app index.html missing" && exit 1)`
)
fs.writeFileSync(dockerfilePath, dockerfile)

const nginxFiles = ['nginx.dev.conf', 'nginx.qa.conf', 'nginx.prod.conf']
nginxFiles.forEach((file) => {
  const filePath = path.join(ROOT_DIR, file)
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8')
    // Add location block
    content = content.replace(
      /(location \/robot\/ \{[\s\S]+?\})/g,
      `$1\n\n    # -------------------------\n    # ${appName.toUpperCase()} App\n    # -------------------------\n    location /${appName}/ {\n      alias /usr/share/nginx/html/${appName}/;\n      try_files $uri $uri/ /${appName}/index.html;\n    }`
    )
    // Add to static assets
    content = content.replace(
      /location ~\* \^\/\(assets\|ota\/assets\|robot\/assets\)\//,
      `location ~* ^/(assets|ota/assets|robot/assets|${appName}/assets)/`
    )
    fs.writeFileSync(filePath, content)
  }
})

// 5. Update Header Routes & Locales
console.log(`> Updating Header Routes & Locales...`)
const routesPath = path.join(ROOT_DIR, 'packages', 'constants', 'src', 'routes.js')
if (fs.existsSync(routesPath)) {
  let routesContent = fs.readFileSync(routesPath, 'utf8')
  routesContent = routesContent.replace(
    /\]/,
    ` ,{ name: '${appName}', path: '/', prefix: '${appName}', icon: '${appName}' }\n]`
  )
  fs.writeFileSync(routesPath, routesContent)
}

const localesDir = path.join(ROOT_DIR, 'packages', 'locales', 'src')
const locales = ['ko-KR', 'en-US', 'ja-JP']
locales.forEach((lang) => {
  const layoutJsonPath = path.join(localesDir, lang, 'layout.json')
  if (fs.existsSync(layoutJsonPath)) {
    let layout = JSON.parse(fs.readFileSync(layoutJsonPath, 'utf8'))
    if (layout.SideBar && layout.SideBar.gnb) {
      layout.SideBar.gnb[appName] = appName.toUpperCase()
      fs.writeFileSync(layoutJsonPath, JSON.stringify(layout, null, 2))
    }
  }
})

console.log(`\n✅ Successfully added ${appName}!`)
console.log(`- Local Dev: http://localhost:5173/`)
console.log(`- Remote Entry: http://localhost:${nextServerPort}/remoteEntry.js`)
console.log(`\nNext Steps:`)
console.log(`1. Run 'pnpm install' to link the new workspace.`)
console.log(`2. Run 'pnpm dev' and navigate to /.`)
