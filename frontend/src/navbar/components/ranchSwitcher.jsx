"use client"
import * as React from "react"
import { ChevronsUpDown, Pencil, Plus, Trash2 } from "lucide-react"
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
import { useToken } from "../../api/useToken"
import { deleteRanch, getRanches, updateRanch } from "../../api/ranches"
import EditRanchModal from "../../components/dashboard/editRanchModal"

export function RanchSwitcher({ currentRanch, ranches }) {
  const { setShowCreateNewRanchPopup, setRanch, setRanches, confirmAction, showSuccess, showError } = useAppContext()
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const token = useToken()
  const [editingRanch, setEditingRanch] = React.useState(null)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleNewRanch = () => setShowCreateNewRanchPopup(true)

  const handleRanchSwitch = (ranch) => {
    // optional: store selected ranch in context
    if (setRanch) setRanch(ranch)

    // navigate using the clicked ranch directly (no stale state)
    navigate(`/ranches/${ranch.id}/inventory`)
  }

  const handleEditCurrentRanch = () => {
    setEditingRanch(currentRanch)
  }

  const handleSaveRanch = async (changes) => {
    if (!editingRanch || !token) return

    try {
      setIsSaving(true)
      const updated = await updateRanch(editingRanch.id, changes, token)

      if (currentRanch?.id === updated.id && setRanch) {
        setRanch((prev) => ({ ...(prev || {}), ...updated }))
      }

      if (setRanches) {
        setRanches((prev) => prev.map((item) => (
          item.id === updated.id ? { ...item, ...updated } : item
        )))
      }

      setEditingRanch(null)
    } catch (error) {
      console.error("Error updating ranch:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCurrentRanch = async () => {
    if (!token || !currentRanch) return
    const confirmed = await confirmAction({
      title: "Delete Ranch",
      message: `Delete ranch "${currentRanch.name}"? This action cannot be undone.`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    try {
      await deleteRanch(currentRanch.id, token)
      const refreshed = await getRanches(token)

      if (!refreshed || refreshed.length === 0) {
        if (setRanch) setRanch(null)
        if (setRanches) setRanches([])
        navigate("/ranches")
        return
      }

      const nextRanch = refreshed[0]
      const rest = refreshed.filter((item) => item.id !== nextRanch.id)

      if (setRanch) setRanch(nextRanch)
      if (setRanches) setRanches(rest)
      navigate(`/ranches/${nextRanch.id}/inventory`)
      showSuccess(`Ranch "${currentRanch.name}" deleted successfully.`, "Deleted")
    } catch (error) {
      console.error("Error deleting ranch:", error)
      showError(error?.response?.data?.message || "Could not delete ranch.")
    }
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

            <DropdownMenuItem onClick={handleEditCurrentRanch} className="gap-2 p-2 cursor-pointer">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Pencil className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Edit current ranch</div>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleDeleteCurrentRanch} className="gap-2 p-2 cursor-pointer">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Trash2 className="size-4" />
              </div>
              <div className="text-red-600 font-medium">Delete current ranch</div>
            </DropdownMenuItem>

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

      {editingRanch && (
        <EditRanchModal
          ranch={editingRanch}
          loading={isSaving}
          onClose={() => setEditingRanch(null)}
          onSave={handleSaveRanch}
        />
      )}
    </SidebarMenu>
  )
}
