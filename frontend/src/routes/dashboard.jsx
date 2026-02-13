import React, { useEffect, useState } from 'react'
import { getRanches, getRanchById, updateRanch, deleteRanch } from '../api/ranches'
import { useToken } from '../api/useToken'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppContext } from '../context'
import { formatDateMMDDYYYY } from '../utils/dateFormat'
import { useAuth0 } from "@auth0/auth0-react"

import RanchCard from '../components/dashboard/ranchCard'
import EditRanchModal from '../components/dashboard/editRanchModal'
import CreateButton from '../components/create'

import { Search, ArrowUpDown, TrendingUp, Building2, Beef, Truck, CalendarClock, LogOut, X } from 'lucide-react'

const Dashboard = () => {

  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [editingRanch, setEditingRanch] = useState(null)
  const [isSavingRanch, setIsSavingRanch] = useState(false)
  const [highlightRanchId, setHighlightRanchId] = useState(null)

  const token = useToken()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { logout } = useAuth0()
  const { ranches, setRanches, ranch, setRanch, setShowCreateNewRanchPopup, confirmAction, showSuccess, showError } = useAppContext()

  useEffect(() => {
    if (!token) return

    const fetchRanches = async () => {
      try {
        const data = await getRanches(token)
        setRanches(data)
      } catch (error) {
        console.error("Error fetching ranches:", error)
      }
    }

    fetchRanches()
  }, [token, setRanches])

  const handleCreate = () => {
    setShowCreateNewRanchPopup(true)
  }

  const handleSelect = async (data) => {
    try {
      const ranchData = await getRanchById(data.id, token)
      setRanch(ranchData)
      navigate(`/dashboard/ranch/${ranchData.id}/historical`)
    } catch (error) {
      console.error('Error fetching ranch details:', error)
    }
  }

  const handleEdit = (selectedRanch) => {
    setEditingRanch(selectedRanch)
  }

  const handleSaveRanch = async (changes) => {
    if (!editingRanch || !token) return

    try {
      setIsSavingRanch(true)
      const updated = await updateRanch(editingRanch.id, changes, token)

      setRanches((prev) => prev.map((item) => (
        item.id === editingRanch.id ? { ...item, ...updated } : item
      )))

      if (ranch?.id === editingRanch.id) {
        setRanch((prev) => ({ ...(prev || {}), ...updated }))
      }

      setEditingRanch(null)
    } catch (error) {
      console.error("Error updating ranch:", error)
    } finally {
      setIsSavingRanch(false)
    }
  }

  const handleDelete = async (selectedRanch) => {
    if (!token) return
    const confirmed = await confirmAction({
      title: "Delete Ranch",
      message: `Delete ranch "${selectedRanch.name}"? This action cannot be undone.`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    try {
      await deleteRanch(selectedRanch.id, token)

      setRanches((prev) => prev.filter((item) => item.id !== selectedRanch.id))

      if (ranch?.id === selectedRanch.id) {
        setRanch(null)
      }
      showSuccess(`Ranch "${selectedRanch.name}" deleted successfully.`, "Deleted")
    } catch (error) {
      console.error("Error deleting ranch:", error)
      showError(error?.response?.data?.message || "Could not delete ranch.")
    }
  }

  const normalizeText = (value) => (typeof value === "string" ? value.toLowerCase() : "")
  const searchTerm = normalizeText(search)

  const formatLastUpdated = (value) => {
    return formatDateMMDDYYYY(value, "N/A")
  }

  const enrichedRanches = ranches.map((item) => ({
    ...item,
    totalCattle: Number(item.totalCattle || 0),
    activeLots: Number(item.activeLots || 0),
    managerName: item.managerName || item.manager || "N/A",
    lastUpdated: formatLastUpdated(item.lastUpdated),
  }))

  const filteredRanches = enrichedRanches
    .filter(ranch => {
      const ranchName = normalizeText(ranch.name)
      const ranchCity = normalizeText(ranch.city)
      const ranchState = normalizeText(ranch.state)
      const ranchZipCode = normalizeText(ranch.zipCode)

      return (
        ranchName.includes(searchTerm) ||
        ranchCity.includes(searchTerm) ||
        ranchState.includes(searchTerm) ||
        ranchZipCode.includes(searchTerm)
      )
    })
    .sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "")
      if (sortBy === "cattle") return b.totalCattle - a.totalCattle
      return 0
    })

  const totalRanches = enrichedRanches.length
  const totalCattle = enrichedRanches.reduce((acc, item) => acc + Number(item.totalCattle || 0), 0)
  const totalActiveLoads = enrichedRanches.reduce((acc, item) => acc + Number(item.activeLots || 0), 0)
  const latestUpdated = enrichedRanches.reduce((latest, item) => {
    if (!item.lastUpdated || item.lastUpdated === "N/A") return latest
    const parsed = new Date(item.lastUpdated)
    const time = Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
    return time > latest ? time : latest
  }, 0)

  useEffect(() => {
    const newRanchIdParam = searchParams.get("newRanchId")
    if (!newRanchIdParam) return

    const parsedId = Number(newRanchIdParam)
    if (!Number.isFinite(parsedId)) return

    const targetId = `ranch-card-${parsedId}`
    const timeoutId = window.setTimeout(() => {
      const target = document.getElementById(targetId)
      if (!target) return
      target.scrollIntoView({ behavior: "smooth", block: "center" })
      setHighlightRanchId(parsedId)
      window.setTimeout(() => setHighlightRanchId(null), 2600)

      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete("newRanchId")
      setSearchParams(nextParams, { replace: true })
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [searchParams, setSearchParams, filteredRanches.length])

  return (
    <div className='w-full min-h-screen bg-background flex justify-center px-6 py-8 lg:py-10'>

      <div className='w-full max-w-[1320px] flex flex-col gap-7 lg:gap-8'>

        {/* Header */}
        <div className='
          rounded-3xl
          border border-primary-border/30 dark:border-primary-border/60
          bg-gradient-to-r from-surface via-surface to-background
          dark:from-surface dark:via-surface dark:to-surface
          px-5 py-5 lg:px-7 lg:py-6
          shadow-sm
          flex flex-col gap-2
        '>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 rounded-xl bg-action-blue/15 dark:bg-action-blue/20 text-action-blue flex items-center justify-center'>
              <TrendingUp className="h-5 w-5" />
            </div>
            <h1 className='text-primary text-title-h2'>Ranch Dashboard</h1>
          </div>
          <p className='text-secondary text-sm'>
            Overview of ranches, cattle inventory, and active load activity.
          </p>
        </div>

        {/* Summary cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
          <div className='rounded-2xl border border-primary-border/30 bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-secondary uppercase tracking-wide'>Ranches</span>
              <Building2 className='h-4 w-4 text-action-blue' />
            </div>
            <p className='mt-2 text-2xl font-semibold text-primary'>{totalRanches}</p>
          </div>
          <div className='rounded-2xl border border-primary-border/30 bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-secondary uppercase tracking-wide'>Cattle</span>
              <Beef className='h-4 w-4 text-action-blue' />
            </div>
            <p className='mt-2 text-2xl font-semibold text-primary'>{totalCattle}</p>
          </div>
          <div className='rounded-2xl border border-primary-border/30 bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-secondary uppercase tracking-wide'>Active Loads</span>
              <Truck className='h-4 w-4 text-action-blue' />
            </div>
            <p className='mt-2 text-2xl font-semibold text-primary'>{totalActiveLoads}</p>
          </div>
          <div className='rounded-2xl border border-primary-border/30 bg-white p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-secondary uppercase tracking-wide'>Last Updated</span>
              <CalendarClock className='h-4 w-4 text-action-blue' />
            </div>
            <p className='mt-2 text-sm font-semibold text-primary'>
              {latestUpdated ? formatDateMMDDYYYY(latestUpdated, "N/A") : "N/A"}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className='
          w-full
          flex flex-col lg:flex-row
          lg:items-center
          lg:justify-between
          gap-4
          p-4 lg:p-5
          rounded-3xl
          border border-primary-border/30
          bg-white
          shadow-sm
        '>

          {/* Left side: Search */}
          <div className='relative w-full lg:w-[360px]'>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary opacity-70" />
            <input
              type="text"
              placeholder="Search by name, city, state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='
                w-full
                pl-10 pr-10
                py-2.5 lg:py-3
                rounded-xl
                border border-primary-border/40
                text-sm
                focus:outline-none
                focus:ring-2
                focus:ring-primary-border
              '
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary hover:bg-primary-border/10"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right side: Sort + Create */}
          <div className='flex flex-wrap items-center gap-3'>

            <div className='flex items-center gap-2 rounded-xl border border-primary-border/40 px-3 py-2.5'>
              <ArrowUpDown className="h-4 w-4 text-secondary opacity-70" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className='bg-transparent text-sm focus:outline-none'
              >
                <option value="name">Name</option>
                <option value="cattle">Cattle</option>
              </select>
            </div>

            <CreateButton
              text="New Ranch"
              onClick={handleCreate}
            />
            <button
              type="button"
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>

          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'>
          {filteredRanches.map(ranch => (
            <RanchCard
              key={ranch.id}
              ranchId={ranch.id}
              ranchName={ranch.name}
              ranchAddress={ranch.address}
              ranchCity={ranch.city}
              ranchZipCode={ranch.zipCode}
              ranchState={ranch.state}
              ranchColor={ranch.color}
              totalCattle={ranch.totalCattle}
              activeLots={ranch.activeLots}
              managerName={ranch.managerName}
              lastUpdated={ranch.lastUpdated}
              isHighlighted={highlightRanchId === ranch.id}
              onClick={() => handleSelect(ranch)}
              onEdit={() => handleEdit(ranch)}
              onDelete={() => handleDelete(ranch)}
            />
          ))}
        </div>

        {filteredRanches.length === 0 && (
          <div className='rounded-2xl border border-dashed border-primary-border/50 bg-white/60 p-8 text-center text-secondary'>
            No ranches found with the current search.
          </div>
        )}

        {editingRanch && (
          <EditRanchModal
            ranch={editingRanch}
            loading={isSavingRanch}
            onClose={() => setEditingRanch(null)}
            onSave={handleSaveRanch}
          />
        )}

      </div>
    </div>
  )
}

export default Dashboard
