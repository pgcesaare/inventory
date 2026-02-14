import "@fontsource/manrope";
import "@fontsource/manrope/200.css"
import "@fontsource/manrope/300.css"
import "@fontsource/manrope/400.css"
import "@fontsource/manrope/500.css"
import "@fontsource/manrope/600.css"
import "@fontsource/manrope/700.css"
import "@fontsource/manrope/800.css"

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
      redirect_uri: window.location.origin,
      audience: apiAudience,
      scope: "openid profile email read:current_user update:current_user_metadata"
    }}
  >
    <AppProvider>
      <App />
    </AppProvider>
  </Auth0Provider>
  
  </StrictMode>,
)
