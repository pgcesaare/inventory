import { useEffect, useState } from "react"
import { useAuth0 } from "@auth0/auth0-react"

export const useToken = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  const [token, setToken] = useState(null)

  useEffect(() => {
    const fetchToken = async () => {
      if (isAuthenticated) {
        try {
          const accessToken = await getAccessTokenSilently({
            audience: "http://localhost:3000/api/v1/",
          })
          setToken(accessToken)
        } catch (e) {
          console.error(e)
        }
      }
    }

    fetchToken()
  }, [isAuthenticated, getAccessTokenSilently])

  return token
}