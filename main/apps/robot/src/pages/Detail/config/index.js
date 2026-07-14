// src/config/index.js
const environment = import.meta.env.MODE || 'development'

const configs = {
  development: {
    proxyServerUrl: import.meta.env.REACT_APP_PROXY_SERVER_URL || 'http://localhost:8080',
    wsUrl: import.meta.env.REACT_APP_WS_URL || 'ws://localhost:8080',
    debug: true,
    logLevel: 'debug'
  },
  qa: {
    proxyServerUrl: import.meta.env.REACT_APP_PROXY_SERVER_URL || 'https://robot-proxy.qa.hcrsp.com',
    wsUrl: import.meta.env.REACT_APP_WS_URL || 'wss://robot-proxy-ws.qa.hcrsp.com',
    debug: true,
    logLevel: 'info'
  },
  production: {
    proxyServerUrl: import.meta.env.REACT_APP_PROXY_SERVER_URL || 'https://robot-proxy.hcrsp.com',
    wsUrl: import.meta.env.REACT_APP_WS_URL || 'wss://robot-proxy-ws.hcrsp.com',
    debug: false,
    logLevel: 'error'
  }
}

const config = {
  ...configs[environment],
  environment,
  isDevelopment: environment === 'development',
  isQA: environment === 'qa',
  isProduction: environment === 'production'
}

// 환경별 로그 출력
if (config.debug) {
  // console.log(`🌍 Environment: ${config.environment}`)
  // console.log(`🔗 Proxy Server: ${config.proxyServerUrl}`)
  // console.log(`🔗 ws URL: ${config.wsUrl}`)
  // console.log(`📝 MODE: ${import.meta.env.MODE}`)
}

export default config
