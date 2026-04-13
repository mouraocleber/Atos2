import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'

import { GoogleOAuthProvider } from '@react-oauth/google'

// O CLIENT ID pode vir do .env do Vite (ex: VITE_GOOGLE_CLIENT_ID) 
// ou ficar vazio provisoriamente para testes de interface.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'COLOQUE_SEU_CLIENT_ID_AQUI';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)

