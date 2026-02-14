import { useLocation } from "react-router-dom"
import { AppSidebar } from "../appSidebar"
import { RanchesSidebar } from "../ranchesSidebar"
 
export default function NavbarLayout({ children }) {
  const location = useLocation()
  const isRanchDetailsRoute = /^\/ranches\/\d+/.test(location.pathname)

  return (
    <>
      {isRanchDetailsRoute ? <AppSidebar /> : <RanchesSidebar />}
      <main>
        {children}
      </main>
    </>
  )
}
