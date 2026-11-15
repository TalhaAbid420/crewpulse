import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { resetDemoData } from './db/seed'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/600.css'
import './index.css'

// Allow resetting directly via ?demo=1 query parameter
const params = new URLSearchParams(window.location.search)
if (params.get('demo') === '1') {
  void resetDemoData()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
