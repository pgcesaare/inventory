import "@fontsource/manrope"

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import { AppProvider } from './context'
import './index.css'
import App from './App.jsx'

const domain = "dev-jkrxg2g38tkvt41z.us.auth0.com"
const clientId = "3oSuyTGiYxQvLx24fTsn3otKY7XPpmOY"
const apiAudience = "http://localhost:3000/api/v1/"

createRoot(document.getElementById('root')).render(
  <StrictMode>
  <Auth0Provider
    domain={domain}
    clientId={clientId}
    authorizationParams={{
      redirect_uri: "http://localhost:5173/dashboard",
      audience: apiAudience,
      scope: "read:current_user update:current_user_metadata"
    }}
  >
    <AppProvider>
      <App />
    </AppProvider>
  </Auth0Provider>
  
  </StrictMode>,
)
