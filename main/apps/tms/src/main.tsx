import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@repo/ui/styles/vars.css'
import '@repo/ui/assets/fonts.css'
import './i18n'
import App from './App.js'

import "@xyflow/react/dist/style.css"; // ✅ ReactFlow CSS는 여기서 딱 1번

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
