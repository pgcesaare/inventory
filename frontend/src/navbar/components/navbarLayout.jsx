import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar"
import { AppSidebar } from "../appSidebar"
 
export default function NavbarLayout({ children }) {
  return (
    <>
      <AppSidebar />
      <main>
        {children}
      </main>
    </>
  )
}