import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import './styles/variables.css'
import './styles/layout.css'
import './styles/buttons.css'
import './styles/dashboard.css'
import './styles/bills.css'
import './styles/modal.css'
import './styles/pages.css'
import './styles/auth.css'
import './styles/responsive.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
