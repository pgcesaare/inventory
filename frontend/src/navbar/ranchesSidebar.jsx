import { useAuth0 } from "@auth0/auth0-react"
import { NavLink } from "react-router-dom"
import { LayoutDashboard, Settings } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar"

export function RanchesSidebar() {
  const { isAuthenticated } = useAuth0()
  if (!isAuthenticated) return null

  return (
    <Sidebar className="border-none">
      <SidebarContent>
        <div className="px-3 pt-4 pb-3">
          <div className="rounded-2xl border border-primary-border/35 bg-gradient-to-br from-action-blue/10 to-background px-3 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-action-blue/20 flex items-center justify-center text-base">
                <span role="img" aria-label="Cow">🐄</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-primary leading-tight">Cattle Inventory</p>
                <p className="text-[11px] text-secondary leading-tight">General workspace</p>
              </div>
            </div>
          </div>
        </div>
        <SidebarGroup className="mt-auto border-t border-primary-border/20 pt-3">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/ranches">
                    <LayoutDashboard />
                    <span>Ranches</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/settings">
                    <Settings />
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
