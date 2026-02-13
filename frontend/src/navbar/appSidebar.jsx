import React, { useEffect, useState } from 'react'
import { getRanchById, getRanches } from '../api/ranches'   
import { useToken } from '../api/useToken'
import { useAppContext } from '../context'
import { RanchSwitcher } from './components/ranchSwitcher'
import { NavLink, useLocation, useParams } from 'react-router-dom'
import { Beef, ChevronDown, Container, FileClock, LayoutDashboard, PencilLine, Settings, Sheet, Truck } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@components/ui/sidebar"


export function AppSidebar() {
    
    const { id } = useParams()
    const location = useLocation()
    const token = useToken()
    const { ranch, setRanch, ranches, setRanches } = useAppContext()
    const [ loading, setLoading ] =useState(true)
    const [openCalvesMenu, setOpenCalvesMenu] = useState(false)

    useEffect(() => {
      if (token && id) {
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
      }
    }, [id, token, setRanch, setRanches])

    const calfItems = [
      {
        title: "Add Calves",
        url: ranch?.id ? `/dashboard/ranch/${ranch.id}/add-calves` : "",
        icon: Sheet,
      },
      {
        title: "Manage Calves",
        url: ranch?.id ? `/dashboard/ranch/${ranch.id}/inventory?mode=manage` : "",
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

    if(loading) return null
    if(!ranch) return null
    if(!ranches) return null

    const items = [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Inventory",
        url: `/dashboard/ranch/${ranch.id}/inventory`,
        icon: Container,
      },
      {
        title: "Historical",
        url: `/dashboard/ranch/${ranch.id}/historical`,
        icon: FileClock,
      },
      {
        title: "Loads",
        url: `/dashboard/ranch/${ranch.id}/loads`,
        icon: Truck,
      },
    ]

  return (

    <Sidebar className="border-none">
      {ranch &&
      <SidebarContent>
        <RanchSwitcher currentRanch={ranch} ranches={ranches}/>
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
                  <Beef />
                  <span>Calves</span>
                  <ChevronDown className={`ml-auto transition-transform ${openCalvesMenu ? "rotate-180" : ""}`} />
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
        <SidebarGroup className="mt-auto border-t border-primary-border/20 pt-3">
          <SidebarGroupContent>
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-secondary">Configuration</p>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to={`/dashboard/ranch/${ranch.id}/settings`}>
                    <Settings />
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      }
    </Sidebar>
  )
}
