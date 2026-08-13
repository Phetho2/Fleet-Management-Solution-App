import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth/AuthProvider'
import { DriverProvider } from './context/DriverContext'
import { ShiftProvider } from './context/ShiftContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DriverProvider>
        <ShiftProvider>
          <App />
        </ShiftProvider>
      </DriverProvider>
    </AuthProvider>
  </StrictMode>,
)
