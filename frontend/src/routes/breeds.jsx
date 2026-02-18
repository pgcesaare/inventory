import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ChevronLeft, ChevronRight, GripVertical, Search } from "lucide-react"
import { createBreed, deleteBreed, getBreeds, updateBreed } from "../api/breeds"
import { getRanches } from "../api/ranches"
import { getCalvesByRanch, updateCalf } from "../api/calves"
import { useToken } from "../api/useToken"
import { useAppContext } from "../context"

const PAGE_SIZE_OPTIONS = [10, 25, 50]

const normalizeText = (value) => String(value || "").trim().toLowerCase()

const reorderById = (list, sourceId, targetId) => {
  const sourceIndex = list.findIndex((item) => Number(item.id) === Number(sourceId))
  const targetIndex = list.findIndex((item) => Number(item.id) === Number(targetId))
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return list

  const next = [...list]
  const [moved] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

const chunkArray = (items, size = 20) => {
  const source = Array.isArray(items) ? items : []
  const chunks = []
  for (let index = 0; index < source.length; index += size) {
    chunks.push(source.slice(index, index + size))
  }
  return chunks
}

const Breeds = () => {
  const token = useToken()
  const { showError, showSuccess, confirmAction } = useAppContext()

  const [breeds, setBreeds] = useState([])
  const [allCalves, setAllCalves] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingUsage, setLoadingUsage] = useState(true)

  const [createName, setCreateName] = useState("")
  const [createError, setCreateError] = useState("")

  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState("")
  const [editingError, setEditingError] = useState("")

  const [savingRowId, setSavingRowId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkMerging, setBulkMerging] = useState(false)

  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("order")
  const [sortDirection, setSortDirection] = useState("asc")
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [page, setPage] = useState(1)

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [mergeTargetId, setMergeTargetId] = useState("")

  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const dragStartOrderRef = useRef([])
  const dragDidDropRef = useRef(false)

  const busy = creating || savingRowId !== null || deletingId !== null || reordering || bulkDeleting || bulkMerging

  const loadBreeds = useCallback(async () => {
    if (!token) {
      setBreeds([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getBreeds(token)
      setBreeds(Array.isArray(data) ? data : [])
    } catch (error) {
      showError(error?.response?.data?.message || "Could not load breeds.")
    } finally {
      setLoading(false)
    }
  }, [token, showError])

  const loadUsageData = useCallback(async () => {
    if (!token) {
      setAllCalves([])
      setLoadingUsage(false)
      return
    }

    try {
      setLoadingUsage(true)
      const ranches = await getRanches(token)
      const ranchList = Array.isArray(ranches) ? ranches : []

      const calvesByRanch = await Promise.all(
        ranchList.map(async (ranch) => {
          try {
            return await getCalvesByRanch(ranch.id, token)
          } catch {
            return []
          }
        })
      )

      const uniqueById = new Map()
      calvesByRanch.flat().forEach((calf) => {
        if (!calf || calf.id === null || calf.id === undefined) return
        uniqueById.set(Number(calf.id), calf)
      })
      setAllCalves(Array.from(uniqueById.values()))
    } catch {
      setAllCalves([])
    } finally {
      setLoadingUsage(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setLoadingUsage(false)
      setBreeds([])
      setAllCalves([])
      return
    }

    loadBreeds()
    loadUsageData()
  }, [token, loadBreeds, loadUsageData])

  const usageByBreed = useMemo(() => {
    const map = new Map()
    allCalves.forEach((calf) => {
      const key = normalizeText(calf?.breed)
      if (!key) return
      map.set(key, (map.get(key) || 0) + 1)
    })
    return map
  }, [allCalves])

  const isDuplicateName = useCallback((value, excludeId = null) => {
    const next = normalizeText(value)
    if (!next) return false

    return breeds.some((item) => {
      if (excludeId !== null && Number(item.id) === Number(excludeId)) return false
      return normalizeText(item.name) === next
    })
  }, [breeds])

  const sourceBreeds = useMemo(() => (
    breeds.map((item, index) => ({
      ...item,
      usageCount: usageByBreed.get(normalizeText(item.name)) || 0,
      orderValue: Number.isFinite(Number(item.orderIndex)) ? Number(item.orderIndex) : index,
      originalIndex: index,
    }))
  ), [breeds, usageByBreed])

  const filteredBreeds = useMemo(() => {
    const query = normalizeText(search)

    const filtered = query
      ? sourceBreeds.filter((item) => normalizeText(item.name).includes(query))
      : sourceBreeds

    const sorted = [...filtered].sort((left, right) => {
      if (sortBy === "name") {
        const result = String(left.name || "").localeCompare(String(right.name || ""))
        return sortDirection === "asc" ? result : -result
      }

      if (sortBy === "usage") {
        const result = Number(left.usageCount || 0) - Number(right.usageCount || 0)
        return sortDirection === "asc" ? result : -result
      }

      const result = Number(left.originalIndex || 0) - Number(right.originalIndex || 0)
      return sortDirection === "asc" ? result : -result
    })

    return sorted
  }, [sourceBreeds, search, sortBy, sortDirection])

  const filteredIds = useMemo(() => filteredBreeds.map((item) => Number(item.id)), [filteredBreeds])

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(breeds.map((item) => Number(item.id)))
      const next = new Set([...prev].filter((id) => valid.has(Number(id))))
      return next
    })
  }, [breeds])

  useEffect(() => {
    setPage(1)
  }, [search, sortBy, sortDirection, rowsPerPage])

  const totalPages = useMemo(() => {
    const pages = Math.ceil(filteredBreeds.length / rowsPerPage)
    return pages > 0 ? pages : 1
  }, [filteredBreeds.length, rowsPerPage])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pagedBreeds = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    return filteredBreeds.slice(start, start + rowsPerPage)
  }, [filteredBreeds, page, rowsPerPage])

  const pageStart = filteredBreeds.length === 0 ? 0 : (page - 1) * rowsPerPage + 1
  const pageEnd = Math.min(page * rowsPerPage, filteredBreeds.length)

  const selectedItems = useMemo(
    () => breeds.filter((item) => selectedIds.has(Number(item.id))),
    [breeds, selectedIds]
  )

  useEffect(() => {
    if (selectedItems.length < 2) {
      setMergeTargetId("")
      return
    }
    const targetExists = selectedItems.some((item) => String(item.id) === String(mergeTargetId))
    if (!targetExists) setMergeTargetId(String(selectedItems[0].id))
  }, [selectedItems, mergeTargetId])

  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id))
  const canDrag = !busy && sortBy === "order" && sortDirection === "asc" && !search.trim()

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }
    setSortBy(field)
    setSortDirection(field === "usage" ? "desc" : "asc")
  }

  const onCreateNameChange = (value) => {
    setCreateName(value)
    if (!value.trim()) {
      setCreateError("")
      return
    }
    setCreateError(isDuplicateName(value) ? "This breed already exists." : "")
  }

  const handleCreate = async () => {
    if (!token || busy) return

    const trimmed = createName.trim()
    if (!trimmed) {
      setCreateError("Breed name is required.")
      return
    }
    if (isDuplicateName(trimmed)) {
      setCreateError("This breed already exists.")
      return
    }

    try {
      setCreating(true)
      await createBreed({ name: trimmed }, token)
      showSuccess("Breed created.")
      setCreateName("")
      setCreateError("")
      await loadBreeds()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not create breed.")
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (item) => {
    if (busy) return
    setEditingId(Number(item.id))
    setEditingName(String(item.name || ""))
    setEditingError("")
  }

  const cancelEdit = () => {
    if (busy) return
    setEditingId(null)
    setEditingName("")
    setEditingError("")
  }

  const saveEdit = async (item) => {
    if (!token || busy) return
    const trimmed = editingName.trim()
    if (!trimmed) {
      setEditingError("Breed name is required.")
      return
    }
    if (isDuplicateName(trimmed, item.id)) {
      setEditingError("This breed already exists.")
      return
    }

    try {
      setSavingRowId(Number(item.id))
      await updateBreed(item.id, { name: trimmed }, token)
      showSuccess("Breed updated.")
      cancelEdit()
      await loadBreeds()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not update breed.")
    } finally {
      setSavingRowId(null)
    }
  }

  const handleDelete = async (item) => {
    if (!token || busy) return

    const impact = usageByBreed.get(normalizeText(item.name)) || 0
    const confirmed = await confirmAction({
      title: "Delete Breed",
      message: impact > 0
        ? `Delete "${item.name}"? This is currently used by ${impact} calves.`
        : `Delete "${item.name}"?`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    try {
      setDeletingId(Number(item.id))
      await deleteBreed(item.id, token)
      showSuccess("Breed deleted.")
      if (editingId === Number(item.id)) cancelEdit()
      await loadBreeds()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(Number(item.id))
        return next
      })
    } catch (error) {
      showError(error?.response?.data?.message || "Could not delete breed.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filteredIds.forEach((id) => next.delete(id))
      } else {
        filteredIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleToggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(Number(id))) next.delete(Number(id))
      else next.add(Number(id))
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (!token || busy || selectedItems.length === 0) return

    const impacted = selectedItems.reduce((total, item) => (
      total + (usageByBreed.get(normalizeText(item.name)) || 0)
    ), 0)

    const confirmed = await confirmAction({
      title: "Delete Selected Breeds",
      message: impacted > 0
        ? `Delete ${selectedItems.length} breeds? ${impacted} calves currently reference these breeds.`
        : `Delete ${selectedItems.length} breeds?`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    try {
      setBulkDeleting(true)
      for (const item of selectedItems) {
        await deleteBreed(item.id, token)
      }
      showSuccess(`${selectedItems.length} breeds deleted.`)
      setSelectedIds(new Set())
      await loadBreeds()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not delete selected breeds.")
      await loadBreeds()
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkMerge = async () => {
    if (!token || busy || selectedItems.length < 2 || !mergeTargetId) return

    const target = selectedItems.find((item) => String(item.id) === String(mergeTargetId))
    if (!target) return

    const sourceItems = selectedItems.filter((item) => Number(item.id) !== Number(target.id))
    if (sourceItems.length === 0) return

    const sourceNameKeys = new Set(sourceItems.map((item) => normalizeText(item.name)).filter(Boolean))
    const calvesToUpdate = allCalves.filter((calf) => sourceNameKeys.has(normalizeText(calf?.breed)))

    const confirmed = await confirmAction({
      title: "Merge Breeds",
      message: `Merge ${sourceItems.length} breeds into "${target.name}"? ${calvesToUpdate.length} calves will be reassigned.`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    try {
      setBulkMerging(true)

      const calfChunks = chunkArray(calvesToUpdate, 20)
      for (const chunk of calfChunks) {
        const results = await Promise.allSettled(
          chunk.map((calf) => updateCalf(calf.id, { breed: target.name }, token))
        )
        const rejected = results.find((item) => item.status === "rejected")
        if (rejected) throw rejected.reason
      }

      for (const item of sourceItems) {
        await deleteBreed(item.id, token)
      }

      showSuccess(`Merged into ${target.name}.`)
      setSelectedIds(new Set([Number(target.id)]))
      await Promise.all([loadBreeds(), loadUsageData()])
    } catch (error) {
      showError(error?.response?.data?.message || "Could not merge breeds.")
      await Promise.all([loadBreeds(), loadUsageData()])
    } finally {
      setBulkMerging(false)
    }
  }

  const handleDragStart = (event, itemId) => {
    if (!canDrag) {
      event.preventDefault()
      return
    }

    dragDidDropRef.current = false
    dragStartOrderRef.current = breeds.map((item) => Number(item.id))
    setDraggingId(Number(itemId))
    setDragOverId(Number(itemId))

    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", String(itemId))
  }

  const handleDragEnter = (targetId) => {
    if (!canDrag || draggingId === null) return
    if (Number(targetId) === Number(draggingId)) return

    setBreeds((prev) => reorderById(prev, draggingId, targetId))
    setDragOverId(Number(targetId))
  }

  const resetDragState = () => {
    setDraggingId(null)
    setDragOverId(null)
    dragStartOrderRef.current = []
    dragDidDropRef.current = false
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    if (!token || draggingId === null || !canDrag) {
      resetDragState()
      return
    }

    dragDidDropRef.current = true
    const previousOrder = dragStartOrderRef.current
    const currentOrder = breeds.map((item) => Number(item.id))
    const changed = previousOrder.length === currentOrder.length && previousOrder.some((idValue, index) => idValue !== currentOrder[index])

    if (!changed) {
      resetDragState()
      return
    }

    try {
      setReordering(true)
      await Promise.all(
        breeds.map((item, index) => updateBreed(item.id, { orderIndex: index }, token))
      )
      showSuccess("Breed order updated.")
      await loadBreeds()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not save breed order.")
      await loadBreeds()
    } finally {
      setReordering(false)
      resetDragState()
    }
  }

  const handleDragEnd = () => {
    if (!dragDidDropRef.current && dragStartOrderRef.current.length > 0) {
      const orderMap = new Map(dragStartOrderRef.current.map((idValue, index) => [idValue, index]))
      setBreeds((prev) => [...prev].sort((left, right) => {
        const leftIndex = orderMap.has(Number(left.id)) ? orderMap.get(Number(left.id)) : Number.MAX_SAFE_INTEGER
        const rightIndex = orderMap.has(Number(right.id)) ? orderMap.get(Number(right.id)) : Number.MAX_SAFE_INTEGER
        return leftIndex - rightIndex
      }))
    }
    resetDragState()
  }

  return (
    <div className="w-full p-4 md:p-6 space-y-4">
      <div className="rounded-2xl border border-primary-border/50 bg-white p-5 shadow-sm space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-secondary">Catalogs</p>
          <h2 className="mt-1 text-xl font-semibold text-primary-text">Breeds</h2>
          <p className="mt-1 text-sm text-secondary">Manage standardized breeds with quick editing, ordering and bulk cleanup.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-primary-border/35 bg-primary-border/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-secondary">Total</p>
            <p className="text-lg font-semibold text-primary-text">{breeds.length}</p>
          </div>
          <div className="rounded-xl border border-primary-border/35 bg-primary-border/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-secondary">Referenced</p>
            <p className="text-lg font-semibold text-primary-text">{sourceBreeds.filter((item) => item.usageCount > 0).length}</p>
          </div>
          <div className="rounded-xl border border-primary-border/35 bg-primary-border/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-secondary">Usage Scan</p>
            <p className="text-sm font-semibold text-primary-text">{loadingUsage ? "Refreshing..." : `${allCalves.length} calves`}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-primary-border/50 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search breed..."
              className="w-full rounded-lg border border-primary-border/60 bg-white py-2 pl-9 pr-3 text-sm text-primary-text"
            />
          </div>

          <div className="inline-flex items-center rounded-lg border border-primary-border/60 bg-white p-1">
            {[
              { key: "order", label: "Order" },
              { key: "name", label: "Name" },
              { key: "usage", label: "Usage" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => toggleSort(option.key)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  sortBy === option.key ? "bg-primary-border/20 text-primary-text" : "text-secondary hover:bg-primary-border/10"
                }`}
              >
                {option.label}{sortBy === option.key ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
              </button>
            ))}
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <input
              type="text"
              value={createName}
              onChange={(event) => onCreateNameChange(event.target.value)}
              placeholder="New breed"
              className="w-full rounded-lg border border-primary-border/60 bg-white px-3 py-2 text-sm sm:w-[220px]"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy || !!createError || !createName.trim()}
              className="rounded-lg border border-action-blue/80 bg-action-blue px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Adding..." : "Add"}
            </button>
          </div>
        </div>

        {createError ? <p className="text-xs text-red-600">{createError}</p> : null}
        {!canDrag && breeds.length > 1 ? (
          <div className="inline-flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Drag reorder is enabled only with `Order` sort (ascending) and empty search.
          </div>
        ) : null}

        {selectedItems.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-xl border border-primary-border/60 bg-primary-border/5 p-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-primary-text">
              <span className="font-semibold">{selectedItems.length}</span> selected
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {selectedItems.length >= 2 ? (
                <>
                  <select
                    value={mergeTargetId}
                    onChange={(event) => setMergeTargetId(event.target.value)}
                    className="h-8 rounded-md border border-primary-border/60 bg-white px-2 text-xs"
                  >
                    {selectedItems.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        Merge into: {item.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleBulkMerge}
                    disabled={busy || !mergeTargetId}
                    className="rounded-md border border-primary-border/60 bg-white px-2.5 py-1.5 text-xs hover:bg-primary-border/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkMerging ? "Merging..." : "Merge Selected"}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={busy}
                className="rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkDeleting ? "Deleting..." : "Delete Selected"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-primary-border/40 bg-white">
          {loading ? (
            <p className="p-4 text-sm text-secondary">Loading breeds...</p>
          ) : breeds.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-secondary">No breeds yet.</p>
              <p className="mt-1 text-xs text-secondary">Create your first breed to standardize records.</p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => document.querySelector('input[placeholder="New breed"]')?.focus()}
                  className="rounded-lg border border-action-blue/80 bg-action-blue px-3 py-2 text-sm font-medium text-white"
                >
                  Create Breed
                </button>
              </div>
            </div>
          ) : filteredBreeds.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-secondary">No matching breeds.</p>
            </div>
          ) : (
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <th className="w-10 bg-primary-border/10 px-2 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleToggleAllFiltered}
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="w-10 bg-primary-border/10 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-secondary" />
                  <th className="bg-primary-border/10 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-secondary">Breed</th>
                  <th className="w-28 bg-primary-border/10 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-secondary">Usage</th>
                  <th className="w-56 bg-primary-border/10 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
                {pagedBreeds.map((item) => {
                  const itemId = Number(item.id)
                  const selected = selectedIds.has(itemId)
                  const rowSaving = savingRowId === itemId
                  const rowDeleting = deletingId === itemId
                  const rowBusy = busy || rowSaving || rowDeleting
                  const editing = editingId === itemId
                  const showPlaceholder = dragOverId !== null && Number(dragOverId) === itemId && draggingId !== null && Number(draggingId) !== itemId

                  return (
                    <Fragment key={item.id}>
                      {showPlaceholder ? (
                        <tr>
                          <td colSpan={5} className="px-0 py-0">
                            <div className="border-t-2 border-dashed border-action-blue/70" />
                          </td>
                        </tr>
                      ) : null}
                      <tr
                        onDragEnter={() => handleDragEnter(item.id)}
                        className={`border-t border-primary-border/25 align-top transition-colors ${draggingId === itemId ? "bg-primary-border/10 opacity-70" : ""}`}
                      >
                        <td className="px-2 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleToggleRow(item.id)}
                            disabled={busy}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <button
                            type="button"
                            draggable={canDrag}
                            onDragStart={(event) => handleDragStart(event, item.id)}
                            onDragEnd={handleDragEnd}
                            className={`rounded-md p-1 ${canDrag ? "cursor-grab text-secondary hover:bg-primary-border/20" : "cursor-not-allowed text-secondary/40"}`}
                            title={canDrag ? "Drag to reorder" : "Enable Order sort + clear search to reorder"}
                            aria-label="Drag to reorder"
                            disabled={!canDrag}
                          >
                            <GripVertical className="size-4" />
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          {editing ? (
                            <div>
                              <input
                                value={editingName}
                                onChange={(event) => {
                                  const value = event.target.value
                                  setEditingName(value)
                                  setEditingError(isDuplicateName(value, item.id) ? "This breed already exists." : "")
                                }}
                                className="w-full rounded-lg border border-primary-border/60 px-3 py-2 text-sm"
                                disabled={rowBusy}
                              />
                              {editingError ? <p className="mt-1 text-xs text-red-600">{editingError}</p> : null}
                            </div>
                          ) : (
                            <p className="text-sm text-primary-text">{item.name}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="inline-flex rounded-full border border-primary-border/50 bg-primary-border/10 px-2 py-0.5 text-xs font-medium text-secondary">
                            {item.usageCount}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-2">
                            {editing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveEdit(item)}
                                  disabled={rowBusy || !!editingError}
                                  className="rounded-md border border-action-blue/80 bg-action-blue px-2.5 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {rowSaving ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  disabled={rowBusy}
                                  className="rounded-md border border-primary-border/60 bg-white px-2.5 py-1.5 text-xs hover:bg-primary-border/15 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                disabled={busy}
                                className="rounded-md border border-primary-border/60 bg-white px-2.5 py-1.5 text-xs hover:bg-primary-border/15 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={busy}
                              className="rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {rowDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {filteredBreeds.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-primary-border/25 pt-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-secondary">Showing {pageStart}-{pageEnd} of {filteredBreeds.length}</p>
            <div className="flex items-center gap-2">
              <select
                value={rowsPerPage}
                onChange={(event) => setRowsPerPage(Number(event.target.value))}
                className="h-8 rounded-md border border-primary-border/60 bg-white px-2 text-xs"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size} / page</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-primary-border/60 bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[70px] text-center text-xs text-secondary">Page {page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-primary-border/60 bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default Breeds
