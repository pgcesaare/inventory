import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { createSeller, deleteSeller, getSellers, updateSeller } from "../api/sellers"
import { getRanches } from "../api/ranches"
import { getCalvesByRanch, updateCalf } from "../api/calves"
import { useToken } from "../api/useToken"
import { useAppContext } from "../context"

const PAGE_SIZE_OPTIONS = [10, 25, 50]

const normalizeText = (value) => String(value || "").trim().toLowerCase()

const normalizeSeller = (item) => ({
  ...item,
  zipCode: item?.zipCode || item?.zip_code || "",
})

const emptyEditForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
}

const chunkArray = (items, size = 20) => {
  const source = Array.isArray(items) ? items : []
  const chunks = []
  for (let index = 0; index < source.length; index += size) {
    chunks.push(source.slice(index, index + size))
  }
  return chunks
}

const Sellers = () => {
  const token = useToken()
  const { showError, showSuccess, confirmAction } = useAppContext()

  const [sellers, setSellers] = useState([])
  const [allCalves, setAllCalves] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingUsage, setLoadingUsage] = useState(true)

  const [createName, setCreateName] = useState("")
  const [createError, setCreateError] = useState("")

  const [editingId, setEditingId] = useState(null)
  const [editingForm, setEditingForm] = useState(emptyEditForm)
  const [editingError, setEditingError] = useState("")

  const [savingRowId, setSavingRowId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkMerging, setBulkMerging] = useState(false)

  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [sortDirection, setSortDirection] = useState("asc")
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [page, setPage] = useState(1)

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [mergeTargetId, setMergeTargetId] = useState("")

  const busy = creating || savingRowId !== null || deletingId !== null || bulkDeleting || bulkMerging

  const loadSellers = useCallback(async () => {
    if (!token) {
      setSellers([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getSellers(token)
      setSellers(Array.isArray(data) ? data.map((item) => normalizeSeller(item)) : [])
    } catch (error) {
      showError(error?.response?.data?.message || "Could not load sellers.")
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
      setSellers([])
      setAllCalves([])
      return
    }

    loadSellers()
    loadUsageData()
  }, [token, loadSellers, loadUsageData])

  const usageBySeller = useMemo(() => {
    const map = new Map()
    allCalves.forEach((calf) => {
      const key = normalizeText(calf?.seller)
      if (!key) return
      map.set(key, (map.get(key) || 0) + 1)
    })
    return map
  }, [allCalves])

  const isDuplicateName = useCallback((value, excludeId = null) => {
    const next = normalizeText(value)
    if (!next) return false

    return sellers.some((item) => {
      if (excludeId !== null && Number(item.id) === Number(excludeId)) return false
      return normalizeText(item.name) === next
    })
  }, [sellers])

  const sourceSellers = useMemo(() => (
    sellers.map((item, index) => ({
      ...item,
      usageCount: usageBySeller.get(normalizeText(item.name)) || 0,
      hasAddress: Boolean([item.address, item.city, item.state, item.zipCode].find(Boolean)),
      originalIndex: index,
    }))
  ), [sellers, usageBySeller])

  const filteredSellers = useMemo(() => {
    const query = normalizeText(search)
    const filtered = query
      ? sourceSellers.filter((item) => {
        const address = [item.address, item.city, item.state, item.zipCode].filter(Boolean).join(" ")
        return normalizeText(item.name).includes(query) || normalizeText(address).includes(query)
      })
      : sourceSellers

    return [...filtered].sort((left, right) => {
      if (sortBy === "usage") {
        const result = Number(left.usageCount || 0) - Number(right.usageCount || 0)
        return sortDirection === "asc" ? result : -result
      }
      if (sortBy === "address") {
        const leftAddress = [left.city, left.state].filter(Boolean).join(", ")
        const rightAddress = [right.city, right.state].filter(Boolean).join(", ")
        const result = leftAddress.localeCompare(rightAddress)
        return sortDirection === "asc" ? result : -result
      }
      const result = String(left.name || "").localeCompare(String(right.name || ""))
      return sortDirection === "asc" ? result : -result
    })
  }, [sourceSellers, search, sortBy, sortDirection])

  const filteredIds = useMemo(() => filteredSellers.map((item) => Number(item.id)), [filteredSellers])

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(sellers.map((item) => Number(item.id)))
      return new Set([...prev].filter((id) => valid.has(Number(id))))
    })
  }, [sellers])

  useEffect(() => {
    setPage(1)
  }, [search, sortBy, sortDirection, rowsPerPage])

  const totalPages = useMemo(() => {
    const pages = Math.ceil(filteredSellers.length / rowsPerPage)
    return pages > 0 ? pages : 1
  }, [filteredSellers.length, rowsPerPage])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pagedSellers = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    return filteredSellers.slice(start, start + rowsPerPage)
  }, [filteredSellers, page, rowsPerPage])

  const pageStart = filteredSellers.length === 0 ? 0 : (page - 1) * rowsPerPage + 1
  const pageEnd = Math.min(page * rowsPerPage, filteredSellers.length)

  const selectedItems = useMemo(
    () => sellers.filter((item) => selectedIds.has(Number(item.id))),
    [sellers, selectedIds]
  )

  useEffect(() => {
    if (selectedItems.length < 2) {
      setMergeTargetId("")
      return
    }
    const exists = selectedItems.some((item) => String(item.id) === String(mergeTargetId))
    if (!exists) setMergeTargetId(String(selectedItems[0].id))
  }, [selectedItems, mergeTargetId])

  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id))

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
    setCreateError(isDuplicateName(value) ? "This seller already exists." : "")
  }

  const handleCreate = async () => {
    if (!token || busy) return

    const trimmed = createName.trim()
    if (!trimmed) {
      setCreateError("Seller name is required.")
      return
    }
    if (isDuplicateName(trimmed)) {
      setCreateError("This seller already exists.")
      return
    }

    try {
      setCreating(true)
      await createSeller({ name: trimmed }, token)
      showSuccess("Seller created.")
      setCreateName("")
      setCreateError("")
      await loadSellers()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not create seller.")
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (item) => {
    if (busy) return
    setEditingId(Number(item.id))
    setEditingForm({
      name: item.name || "",
      address: item.address || "",
      city: item.city || "",
      state: item.state || "",
      zipCode: item.zipCode || item.zip_code || "",
    })
    setEditingError("")
  }

  const cancelEdit = () => {
    if (busy) return
    setEditingId(null)
    setEditingForm(emptyEditForm)
    setEditingError("")
  }

  const onEditFieldChange = (field, value, sellerId) => {
    setEditingForm((prev) => ({ ...prev, [field]: value }))
    if (field === "name") {
      setEditingError(isDuplicateName(value, sellerId) ? "This seller already exists." : "")
    }
  }

  const saveEdit = async (item) => {
    if (!token || busy) return

    const trimmedName = String(editingForm.name || "").trim()
    if (!trimmedName) {
      setEditingError("Seller name is required.")
      return
    }
    if (isDuplicateName(trimmedName, item.id)) {
      setEditingError("This seller already exists.")
      return
    }

    const payload = {
      name: trimmedName,
      address: editingForm.address || "",
      city: editingForm.city || "",
      state: editingForm.state || "",
      zipCode: editingForm.zipCode || "",
    }

    try {
      setSavingRowId(Number(item.id))
      await updateSeller(item.id, payload, token)
      showSuccess("Seller updated.")
      cancelEdit()
      await loadSellers()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not update seller.")
    } finally {
      setSavingRowId(null)
    }
  }

  const handleDelete = async (item) => {
    if (!token || busy) return

    const impact = usageBySeller.get(normalizeText(item.name)) || 0
    const confirmed = await confirmAction({
      title: "Delete Seller",
      message: impact > 0
        ? `Delete "${item.name}"? This is currently used by ${impact} calves.`
        : `Delete "${item.name}"?`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    try {
      setDeletingId(Number(item.id))
      await deleteSeller(item.id, token)
      showSuccess("Seller deleted.")
      if (editingId === Number(item.id)) cancelEdit()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(Number(item.id))
        return next
      })
      await loadSellers()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not delete seller.")
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
      total + (usageBySeller.get(normalizeText(item.name)) || 0)
    ), 0)

    const confirmed = await confirmAction({
      title: "Delete Selected Sellers",
      message: impacted > 0
        ? `Delete ${selectedItems.length} sellers? ${impacted} calves currently reference these sellers.`
        : `Delete ${selectedItems.length} sellers?`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    try {
      setBulkDeleting(true)
      for (const item of selectedItems) {
        await deleteSeller(item.id, token)
      }
      showSuccess(`${selectedItems.length} sellers deleted.`)
      setSelectedIds(new Set())
      await loadSellers()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not delete selected sellers.")
      await loadSellers()
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
    const calvesToUpdate = allCalves.filter((calf) => sourceNameKeys.has(normalizeText(calf?.seller)))

    const confirmed = await confirmAction({
      title: "Merge Sellers",
      message: `Merge ${sourceItems.length} sellers into "${target.name}"? ${calvesToUpdate.length} calves will be reassigned.`,
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    try {
      setBulkMerging(true)

      const calfChunks = chunkArray(calvesToUpdate, 20)
      for (const chunk of calfChunks) {
        const results = await Promise.allSettled(
          chunk.map((calf) => updateCalf(calf.id, { seller: target.name }, token))
        )
        const rejected = results.find((item) => item.status === "rejected")
        if (rejected) throw rejected.reason
      }

      for (const item of sourceItems) {
        await deleteSeller(item.id, token)
      }

      showSuccess(`Merged into ${target.name}.`)
      setSelectedIds(new Set([Number(target.id)]))
      await Promise.all([loadSellers(), loadUsageData()])
    } catch (error) {
      showError(error?.response?.data?.message || "Could not merge sellers.")
      await Promise.all([loadSellers(), loadUsageData()])
    } finally {
      setBulkMerging(false)
    }
  }

  const sellersWithAddress = sourceSellers.filter((item) => item.hasAddress).length

  return (
    <div className="w-full p-4 md:p-6 space-y-4">
      <div className="rounded-2xl border border-primary-border/50 bg-white p-5 shadow-sm space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-secondary">Catalogs</p>
          <h2 className="mt-1 text-xl font-semibold text-primary-text">Sellers</h2>
          <p className="mt-1 text-sm text-secondary">Manage seller catalog with inline updates and bulk cleanup tools.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-primary-border/35 bg-primary-border/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-secondary">Total</p>
            <p className="text-lg font-semibold text-primary-text">{sellers.length}</p>
          </div>
          <div className="rounded-xl border border-primary-border/35 bg-primary-border/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-secondary">With Address</p>
            <p className="text-lg font-semibold text-primary-text">{sellersWithAddress}</p>
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
              placeholder="Search seller or location..."
              className="w-full rounded-lg border border-primary-border/60 bg-white py-2 pl-9 pr-3 text-sm text-primary-text"
            />
          </div>

          <div className="inline-flex items-center rounded-lg border border-primary-border/60 bg-white p-1">
            {[
              { key: "name", label: "Name" },
              { key: "usage", label: "Usage" },
              { key: "address", label: "Location" },
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
              placeholder="New seller"
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

        {selectedItems.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-xl border border-primary-border/60 bg-primary-border/5 p-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-primary-text"><span className="font-semibold">{selectedItems.length}</span> selected</p>
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
            <p className="p-4 text-sm text-secondary">Loading sellers...</p>
          ) : sellers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-secondary">No sellers yet.</p>
              <p className="mt-1 text-xs text-secondary">Create your first seller to standardize records.</p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => document.querySelector('input[placeholder="New seller"]')?.focus()}
                  className="rounded-lg border border-action-blue/80 bg-action-blue px-3 py-2 text-sm font-medium text-white"
                >
                  Create Seller
                </button>
              </div>
            </div>
          ) : filteredSellers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-secondary">No matching sellers.</p>
            </div>
          ) : (
            <table className="w-full min-w-[860px] border-collapse">
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
                  <th className="bg-primary-border/10 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-secondary">Seller</th>
                  <th className="bg-primary-border/10 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-secondary">Location</th>
                  <th className="w-28 bg-primary-border/10 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-secondary">Usage</th>
                  <th className="w-52 bg-primary-border/10 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedSellers.map((item) => {
                  const itemId = Number(item.id)
                  const selected = selectedIds.has(itemId)
                  const editing = editingId === itemId
                  const rowSaving = savingRowId === itemId
                  const rowDeleting = deletingId === itemId
                  const rowBusy = busy || rowSaving || rowDeleting
                  const locationLabel = [item.address, item.city, item.state, item.zipCode].filter(Boolean).join(", ") || "No address"

                  return (
                    <Fragment key={item.id}>
                      <tr className="border-t border-primary-border/25 align-top">
                        <td className="px-2 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleToggleRow(item.id)}
                            disabled={busy}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-sm text-primary-text">{item.name}</td>
                        <td className="px-3 py-2.5 text-xs text-secondary">{locationLabel}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="inline-flex rounded-full border border-primary-border/50 bg-primary-border/10 px-2 py-0.5 text-xs font-medium text-secondary">
                            {item.usageCount}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => (editing ? cancelEdit() : startEdit(item))}
                              disabled={busy}
                              className="rounded-md border border-primary-border/60 bg-white px-2.5 py-1.5 text-xs hover:bg-primary-border/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {editing ? "Cancel" : "Edit"}
                            </button>
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

                      {editing ? (
                        <tr className="border-t border-primary-border/20 bg-primary-border/5">
                          <td colSpan={5} className="px-3 py-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="md:col-span-2">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Name</label>
                                <input
                                  value={editingForm.name}
                                  onChange={(event) => onEditFieldChange("name", event.target.value, item.id)}
                                  className="mt-1 w-full rounded-lg border border-primary-border/60 bg-white px-3 py-2 text-sm"
                                  disabled={rowBusy}
                                />
                                {editingError ? <p className="mt-1 text-xs text-red-600">{editingError}</p> : null}
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Address</label>
                                <input
                                  value={editingForm.address}
                                  onChange={(event) => onEditFieldChange("address", event.target.value, item.id)}
                                  className="mt-1 w-full rounded-lg border border-primary-border/60 bg-white px-3 py-2 text-sm"
                                  disabled={rowBusy}
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-secondary">City</label>
                                <input
                                  value={editingForm.city}
                                  onChange={(event) => onEditFieldChange("city", event.target.value, item.id)}
                                  className="mt-1 w-full rounded-lg border border-primary-border/60 bg-white px-3 py-2 text-sm"
                                  disabled={rowBusy}
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-secondary">State</label>
                                <input
                                  value={editingForm.state}
                                  onChange={(event) => onEditFieldChange("state", event.target.value, item.id)}
                                  className="mt-1 w-full rounded-lg border border-primary-border/60 bg-white px-3 py-2 text-sm"
                                  disabled={rowBusy}
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Zip</label>
                                <input
                                  value={editingForm.zipCode}
                                  onChange={(event) => onEditFieldChange("zipCode", event.target.value, item.id)}
                                  className="mt-1 w-full rounded-lg border border-primary-border/60 bg-white px-3 py-2 text-sm"
                                  disabled={rowBusy}
                                />
                              </div>
                            </div>

                            <div className="mt-3 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={rowBusy}
                                className="rounded-md border border-primary-border/60 bg-white px-2.5 py-1.5 text-xs hover:bg-primary-border/15 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEdit(item)}
                                disabled={rowBusy || !!editingError}
                                className="rounded-md border border-action-blue/80 bg-action-blue px-2.5 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {rowSaving ? "Saving..." : "Save Changes"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {filteredSellers.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-primary-border/25 pt-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-secondary">Showing {pageStart}-{pageEnd} of {filteredSellers.length}</p>
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

export default Sellers
