import { useLocation } from "react-router-dom"
import { AppSidebar } from "../appSidebar"
import { GeneralSidebar } from "../generalSidebar"
 
export default function NavbarLayout({ children }) {
  const location = useLocation()
  const isRanchDetailsRoute = /^\/ranches\/\d+/.test(location.pathname)

  return (
    <>
      {isRanchDetailsRoute ? <AppSidebar /> : <GeneralSidebar />}
      <main>
        {children}
      </main>
    </>
  )
}
