# 새로운 애플리케이션 추가 가이드

이 가이드는 `opcon` 모노레포에 새로운 마이크로 프론트엔드 애플리케이션을 추가하는 단계를 설명합니다.

## 자동화 스크립트 사용 (권장)
다음 명령어를 통해 새로운 앱을 자동으로 생성하고 필요한 모든 설정을 업데이트할 수 있습니다:

```bash
pnpm add:app {app-name}
```

스크립트가 실행하는 작업:
- `apps/{app-name}` 디렉토리 및 기본 React 구조 생성
- `main` 앱의 `vite.config.js`에 Remote 및 Proxy 등록
- `main` 앱의 `App.jsx`에 라우팅 추가
- `Dockerfile` 빌드 검증 로직 추가
- 모든 `nginx.*.conf` 파일에 라우팅 설정 추가

이후 `pnpm install`을 실행하여 워크스페이스를 연동하세요.

---

## 수동 추가 단계 (참고용)
자동화 스크립트를 사용하지 않을 경우 아래 단계를 따릅니다.
기존 앱(예: `apps/ota`)의 구조를 새로운 디렉토리 `apps/{app-name}`으로 복사합니다.

### 필수 파일:
- `package.json`: `name`을 `{app-name}`으로 설정하고 버전을 `0.0.0`으로 업데이트합니다. 또한 아래와 같은 공통 의존성을 포함해야 합니다:
  ```json
  "dependencies": {
    "@originjs/vite-plugin-federation": "^1.4.1",
    "@repo/apis": "workspace:*",
    "@repo/constants": "workspace:*",
    "@repo/hooks": "workspace:*",
    "@repo/locales": "workspace:*",
    "@repo/stores": "workspace:*",
    "@repo/ui": "workspace:*",
    "@repo/utils": "workspace:*",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "react-router-dom": "7.1.3",
    "styled-components": "^6.3.8",
    "react-i18next": "16.5.3",
    "react-spinners": "^0.17.0",
    "react-toastify": "^11.0.5",
    "vite-plugin-svgr": "^4.5.0",
    "zustand": "^5.0.10"
  },
  ```
- `vite.config.js`:
    - `base`를 `'/{app-name}/'`로 설정합니다.
    - `federation` 플러그인을 설정합니다:
        - `name: '{app-name}'`
        - `exposes: { './App': './src/App.jsx' }`
    - `build.outDir`을 `'../../apps-dist/{app-name}'`으로 설정합니다.
    - `server` 및 `preview`에 사용할 고유 포트 번호를 할당합니다. (기존 앱들의 포트에서 각각 1씩 증가 시킵니다.)
- `index.html`: `<title>`과 root 엘리먼트가 올바른지 확인합니다.
- `src/App.jsx`: 노출될 메인 애플리케이션 컴포넌트를 작성합니다.
- `src/main.jsx`: 로컬 개발용 엔트리 포인트를 작성합니다.

## 2. Main 앱에 Remote 등록
`main` 앱(쉘)이 새로운 원격 앱을 인식할 수 있도록 설정해야 합니다.

### `apps/main/vite.config.js` 업데이트:
1. `federation.remotes`에 추가:
   ```javascript
   {app-name}: isProd ? '/{app-name}/assets/remoteEntry.js' : '/{app-name}/remoteEntry.js'
   ```
2. `server.proxy` 및 `preview.proxy`에 추가:
   ```javascript
   '/{app-name}': {
     target: 'http://localhost:{port}',
     changeOrigin: true,
     ws: true,
     rewrite: (path) => (path === '/{app-name}' ? '/{app-name}/' : path)
   }
   ```

### `apps/main/src/App.jsx` 업데이트:
1. 원격 앱을 Lazy 로딩으로 임포트:
   ```javascript
   const NewApp = React.lazy(() => import('{app-name}/App'))
   ```
2. 라우트 추가:
   ```javascript
   <Route
     path="/{app-name}/*"
     element={
       <MainLayout currentApp={appPrefix}>
         <NewApp />
       </MainLayout>
     }
   />
   ```

## 3. 인프라 설정

### `Dockerfile` 업데이트:
빌드가 성공했는지 확인하는 검증 로직을 추가합니다:
```dockerfile
RUN test -f apps-dist/{app-name}/index.html || (echo "❌ {app-name} app index.html missing" && exit 1)
```

### Nginx 설정 업데이트:
`nginx.dev.conf`, `nginx.qa.conf`, `nginx.prod.conf` 파일을 업데이트합니다:
```nginx
location /{app-name}/ {
  alias /usr/share/nginx/html/{app-name}/;
  try_files $uri $uri/ /{app-name}/index.html;
}

# Static Assets 섹션
location ~* ^/(assets|ota/assets|robot/assets|{app-name}/assets)/ { ... }
```

## 4. Header 링크 등록
상단 헤더 전역 내비게이션(GNB)에 새로운 앱 링크를 추가합니다.

### `packages/constants/src/routes.js` 업데이트:
`COMMON_GNB` 배열에 새로운 앱의 정보를 객체 형태로 추가합니다. (기존 앱들의 구조를 따릅니다.)

```javascript
export const COMMON_GNB = [
  { name: 'robot', path: '/robot/', prefix: 'robot', icon: 'robot' },
  { name: 'ota', path: '/ota/', prefix: 'ota', icon: 'ota' },
  { name: '{app-name}', path: '/{app-name}/', prefix: '{app-name}', icon: '{app-name}' } // 새 앱 추가
]
```

## 5. 다국어 번역 추가
헤더에 표시될 앱 이름의 번역을 추가합니다.

### `packages/locales/src/*/layout.json` 업데이트:
`ko`, `en`, `ja` 등 모든 언어 파일의 `SideBar.gnb` 섹션에 앱 이름을 추가합니다:
```json
{
  "SideBar": {
    "gnb": {
      ...
      "{app-name}": "앱 이름"
    }
  }
}
```

## 6. 빌드 확인
루트 디렉토리에서 다음 명령어를 실행합니다:
```bash
pnpm build
```
`apps-dist/{app-name}` 디렉토리에 결과물이 생성되었는지 확인합니다.
