import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@repo/ui/styles/vars.css'
import '@repo/ui/assets/fonts.css'
import './i18n'
import App from './App.jsx'

// import Router from './router/Router'

// const routes = [{ path: '/', element: <App /> }]

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
