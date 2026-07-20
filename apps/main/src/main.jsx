import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@repo/ui/styles/vars.css'
import '@repo/ui/assets/fonts.css'
import './i18n' // Side-effect: init i18n only in standalone mode

import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
