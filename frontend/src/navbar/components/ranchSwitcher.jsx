"use client"
import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@components/ui/sidebar"
import { useAppContext } from "../../context"
import { useNavigate } from "react-router-dom"

export function RanchSwitcher({ currentRanch, ranches }) {
  const { setShowCreateNewRanchPopup, setRanch } = useAppContext() // optional: set active ranch globally
  const { isMobile } = useSidebar()
  const navigate = useNavigate()

  const handleNewRanch = () => setShowCreateNewRanchPopup(true)

  const handleRanchSwitch = (ranch) => {
    // optional: store selected ranch in context
    if (setRanch) setRanch(ranch)

    // navigate using the clicked ranch directly (no stale state)
    navigate(`/dashboard/ranch/${ranch.id}/inventory`)
  }

  if (!currentRanch) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
            >
              <div
                style={{ backgroundColor: currentRanch.color }}
                className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{currentRanch.name}</span>
                <div className="flex flex-row gap-1">
                  <span className="truncate text-xs text-gray-600">{currentRanch.city},</span>
                  <span className="truncate text-xs text-gray-600">{currentRanch.state}</span>
                </div>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Ranches
            </DropdownMenuLabel>

            {ranches.map((ranch) => (
              <DropdownMenuItem
                key={ranch.id}         // use id instead of name
                onClick={() => handleRanchSwitch(ranch)}
                className="gap-2 p-2 cursor-pointer"
              >
                <div
                  style={{ backgroundColor: ranch.color }}
                  className="flex size-6 items-center justify-center rounded-md"
                />
                {ranch.name}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleNewRanch} className="gap-2 p-2 cursor-pointer">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add ranch</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
