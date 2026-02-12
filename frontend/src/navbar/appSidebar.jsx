import React, { useEffect, useState } from 'react'
import { getRanchById, getRanches } from '../api/ranches'   
import { useToken } from '../api/useToken'
import { useAppContext } from '../context'
import { RanchSwitcher } from './components/ranchSwitcher'
import { NavLink, useParams } from 'react-router-dom'
import { Container, FileClock, LayoutDashboard, PencilLine, Sheet, Truck } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar"


export function AppSidebar() {
    
    const { id } = useParams()
    const token = useToken()
    const { ranch, setRanch, ranches, setRanches } = useAppContext()
    const [ loading, setLoading ] =useState(true)

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
      {
        title: "Add Calves",
        url: `/dashboard/ranch/${ranch.id}/add-calves`,
        icon: Sheet,
      },
      {
        title: "Manage Calves",
        url: `/dashboard/ranch/${ranch.id}/inventory?mode=manage`,
        icon: PencilLine,
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      }
    </Sidebar>
  )
}
