import React, { useEffect, useState } from 'react'
import { getRanchById, getRanches } from '../api/ranches'   
import { useToken } from '../api/useToken'
import { useAppContext } from '../context'
import { RanchSwitcher } from './components/ranchSwitcher'
import { NavLink, useLocation, useParams } from 'react-router-dom'
import { ChevronDown, Container, FileClock, FileText, LayoutDashboard, PencilLine, ReceiptText, Settings, Sheet, Tag, Truck } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "@components/ui/sidebar"


export function AppSidebar() {
    
    const { id } = useParams()
    const location = useLocation()
    const token = useToken()
    const { ranch, setRanch, ranches, setRanches } = useAppContext()
    const [ loading, setLoading ] =useState(Boolean(id))
    const [openCalvesMenu, setOpenCalvesMenu] = useState(false)

    useEffect(() => {
      if (!id) {
        setLoading(false)
        return
      }
      if (!token) return

      const fetchRanchData = async () => {
        try {
          const data = await getRanchById(id, token)
          const ranchList = await getRanches(token)
          setRanch(data)
          setRanches(ranchList.filter(r => r.id !== data.id))
        } catch (err) {
          console.error("Error loading ranch:", err)
        } finally {
          setLoading(false)
        }
      }

      fetchRanchData()
    }, [id, token, setRanch, setRanches])

    const calfItems = [
      {
        title: "Add Calves",
        url: ranch?.id ? `/ranches/${ranch.id}/add-calves` : "",
        icon: Sheet,
      },
      {
        title: "Manage Calves",
        url: ranch?.id ? `/ranches/${ranch.id}/manage-calves` : "",
        icon: PencilLine,
      },
    ]

    const isCalvesRoute = calfItems.some((item) =>
      item.url && (location.pathname === item.url || location.pathname + location.search === item.url)
    )

    useEffect(() => {
      if (isCalvesRoute) {
        setOpenCalvesMenu(true)
      }
    }, [isCalvesRoute])

    const hasSelectedRanch = Boolean(ranch?.id)

    if(loading) return null

    const items = [
      {
        title: "Inventory",
        url: ranch?.id ? `/ranches/${ranch.id}/inventory` : "",
        icon: Container,
      },
      {
        title: "Historical",
        url: ranch?.id ? `/ranches/${ranch.id}/historical` : "",
        icon: FileClock,
      },
      {
        title: "Loads",
        url: ranch?.id ? `/ranches/${ranch.id}/loads` : "",
        icon: Truck,
      },
    ]

  return (

    <Sidebar collapsible="icon" className="border-none">
      <SidebarContent>
        <SidebarGroup className="pt-3">
          <SidebarGroupContent className="px-0">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <SidebarMenuButton asChild className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <NavLink to="/ranches">
                  <LayoutDashboard />
                  <span>Ranches</span>
                </NavLink>
              </SidebarMenuButton>
              <SidebarTrigger className="size-7 shrink-0 rounded-md border border-primary-border/40 bg-sidebar hover:bg-primary-border/10" />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
        {hasSelectedRanch && Array.isArray(ranches) && (
          <div className="group-data-[collapsible=icon]:hidden">
            <RanchSwitcher currentRanch={ranch} ranches={ranches}/>
          </div>
        )}
        </SidebarGroup>
        {hasSelectedRanch && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setOpenCalvesMenu((prev) => !prev)}
                    className="cursor-pointer"
                    data-active={isCalvesRoute}
                  >
                    <Tag />
                    <span>Calves</span>
                    <ChevronDown className={`ml-auto transition-transform group-data-[collapsible=icon]:hidden ${openCalvesMenu ? "rotate-180" : ""}`} />
                  </SidebarMenuButton>
                  {openCalvesMenu && (
                    <SidebarMenuSub>
                      {calfItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild>
                            <NavLink to={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Billing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/statements">
                    <FileText />
                    <span>Statements</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/invoices">
                    <ReceiptText />
                    <span>Invoices</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto border-t border-primary-border/20 pt-3">
          <SidebarGroupContent>
            <SidebarMenu>
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
