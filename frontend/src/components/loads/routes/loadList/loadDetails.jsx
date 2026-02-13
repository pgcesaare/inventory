import { useEffect, useMemo, useRef, useState } from "react"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { Calendar, ClipboardList, Truck, MapPinned, PackageCheck, Download, Search, SlidersHorizontal, Funnel, X, Pencil, Save, RotateCcw, Trash2 } from "lucide-react"
import { useToken } from "../../../../api/useToken"
import { useAppContext } from "../../../../context"
import { getRanches } from "../../../../api/ranches"
import { deleteLoad, updateLoad } from "../../../../api/loads"

dayjs.extend(utc)

const formatDate = (value) => {
  if (!value) return "N/A"
  return dayjs.utc(value).format("MM/DD/YYYY")
}

const normalizeSearchValue = (value) => String(value ?? "").toLowerCase().trim().replace(/[\s-]+/g, "")
const toTitleCase = (value) => String(value || "").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
const getSearchPlaceholder = (mode, field) => {
  const byField = {
    visualTag: mode === "multiple" ? "TAG-001, TAG-002, TAG-003" : "Search visual tag",
    eid: mode === "multiple" ? "982000001, 982000002, 982000003" : "Search EID",
    backTag: mode === "multiple" ? "B-001, B-002, B-003" : "Search back tag",
    all: mode === "multiple" ? "TAG-001, TAG-002, TAG-003" : "Search tag / EID / back tag",
  }
  return byField[field] || byField.all
}

const toDateInput = (value) => {
  if (!value) return ""
  const parsed = dayjs.utc(value)
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : ""
}

const LoadDetails = ({ load, onUpdated, onDeleted }) => {
  const token = useToken()
  const { showSuccess, showError, confirmAction } = useAppContext()
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" })
  const [breedFilter, setBreedFilter] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [searchMode, setSearchMode] = useState("single")
  const [searchMatchMode, setSearchMatchMode] = useState("contains")
  const [searchField, setSearchField] = useState("all")
  const [rowLimit, setRowLimit] = useState(15)
  const [currentPage, setCurrentPage] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isDeletingLoad, setIsDeletingLoad] = useState(false)
  const [destinationOptions, setDestinationOptions] = useState([])
  const [editForm, setEditForm] = useState({
    destinationRanchID: "",
    destinationName: "",
    departureDate: "",
    arrivalDate: "",
    trucking: "",
    notes: "",
  })
  const filterRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const breedOptions = useMemo(
    () => [...new Set((load?.calves || []).map((calf) => calf?.breed).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
    [load?.calves]
  )

  const filteredCalves = useMemo(() => {
    const source = load?.calves || []
    const normalizedSearch = normalizeSearchValue(searchValue)
    const searchTokens = String(searchValue || "")
      .split(/[,\n]+/)
      .map((token) => normalizeSearchValue(token))
      .filter(Boolean)

    return source.filter((calf) => {
      const matchesBreed = !breedFilter || calf?.breed === breedFilter
      const searchableValuesByField = {
        visualTag: [calf?.primaryID],
        eid: [calf?.EID],
        backTag: [calf?.originalID, calf?.backTag],
      }
      const searchableValues = (
        searchField === "all"
          ? [...searchableValuesByField.visualTag, ...searchableValuesByField.eid, ...searchableValuesByField.backTag]
          : (searchableValuesByField[searchField] || [])
      )
        .map((value) => normalizeSearchValue(value))
        .filter(Boolean)
      const matchesToken = (token) => (
        searchMatchMode === "exact"
          ? searchableValues.some((value) => value === token)
          : searchableValues.some((value) => value.includes(token))
      )
      const matchesSearch = !normalizedSearch
        ? true
        : searchMode === "multiple"
          ? searchTokens.length === 0 || searchTokens.some((token) => matchesToken(token))
          : matchesToken(normalizedSearch)

      return matchesBreed && matchesSearch
    })
  }, [load?.calves, breedFilter, searchValue, searchMode, searchMatchMode, searchField])

  const sortedCalves = useMemo(() => {
    if (!sortConfig.key) return filteredCalves
    const factor = sortConfig.direction === "asc" ? 1 : -1
    const normalize = (value) => {
      if (value === null || value === undefined || value === "") return ""
      if (typeof value === "number") return value
      const numeric = Number(value)
      if (Number.isFinite(numeric)) return numeric
      return String(value).toLowerCase()
    }

    return [...filteredCalves].sort((a, b) => {
      const aValue = normalize(a?.[sortConfig.key])
      const bValue = normalize(b?.[sortConfig.key])
      if (aValue < bValue) return -1 * factor
      if (aValue > bValue) return 1 * factor
      return 0
    })
  }, [filteredCalves, sortConfig])

  const safeRowLimit = useMemo(() => {
    const parsed = Number(rowLimit)
    if (!Number.isFinite(parsed)) return 15
    return Math.max(0, Math.min(1000, parsed))
  }, [rowLimit])

  const effectiveRowLimit = safeRowLimit === 0 ? Math.max(1, sortedCalves.length) : safeRowLimit
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedCalves.length / effectiveRowLimit)),
    [sortedCalves.length, effectiveRowLimit]
  )

  const visibleCalves = useMemo(() => {
    const start = (currentPage - 1) * effectiveRowLimit
    return sortedCalves.slice(start, start + effectiveRowLimit)
  }, [sortedCalves, currentPage, effectiveRowLimit])

  const pageStart = sortedCalves.length === 0 ? 0 : (currentPage - 1) * effectiveRowLimit + 1
  const pageEnd = Math.min(currentPage * effectiveRowLimit, sortedCalves.length)

  useEffect(() => {
    setCurrentPage(1)
  }, [breedFilter, searchValue, searchMode, searchMatchMode, searchField, safeRowLimit, sortConfig.key, sortConfig.direction])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!load) return
    const destinationRanchID = load.destinationRanchID || load.destination?.id || ""
    setEditForm({
      destinationRanchID: destinationRanchID ? String(destinationRanchID) : "",
      destinationName: load.destinationName || "",
      departureDate: toDateInput(load.departureDate || load.shippedOutDate),
      arrivalDate: toDateInput(load.arrivalDate),
      trucking: load.trucking || "",
      notes: load.notes || "",
    })
  }, [load])

  if (!load) {
    return <p className="text-sm text-secondary">Select a load to view details.</p>
  }

  const destinationName = load.destination?.name || load.shippedTo || "-"
  const originName = load.origin?.name || "-"
  const shippedOutDate = load.shippedOutDate || load.departureDate
  const isPending = !load.arrivalDate

  const toggleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    ))
  }

  const exportLoadToExcel = () => {
    const summaryRows = [{
      "Load ID": load.id || "",
      Origin: originName,
      Destination: destinationName,
      "Shipped Out Date": formatDate(shippedOutDate),
      "Arrival Date": formatDate(load.arrivalDate),
      Trucking: load.trucking || "",
      Notes: load.notes || "",
      "Head Count": load.headCount || 0,
      Status: isPending ? "In transit" : "Arrived",
    }]

    const calfRows = (load.calves || []).map((calf) => ({
      "Calf ID": calf.id || "",
      "Visual Tag": calf.primaryID || "",
      EID: calf.EID || "",
      "Back Tag": calf.originalID || calf.backTag || "",
      Breed: calf.breed || "",
      Sex: calf.sex || "",
      Seller: calf.seller || "",
      Status: calf.status || "",
      "Date In": formatDate(calf.placedDate || calf.dateIn),
      "Purchase Price": calf.price ?? calf.purchasePrice ?? "",
      "Sell Price": calf.sellPrice ?? "",
      "Shipped Out Date": formatDate(calf.shippedOutDate),
      "Shipped To": calf.shippedTo || "",
      "Death Date": formatDate(calf.deathDate),
      "Current Ranch ID": calf.currentRanchID ?? "",
      "Origin Ranch ID": calf.originRanchID ?? "",
    }))

    const workbook = XLSX.utils.book_new()
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
    const calvesSheet = XLSX.utils.json_to_sheet(calfRows)
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Load Summary")
    XLSX.utils.book_append_sheet(workbook, calvesSheet, "Calves")

    const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
    saveAs(
      new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `load-${load.id || "details"}-${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

  const openEditMode = async () => {
    if (!load?.id || !token) return
    try {
      const ranches = await getRanches(token)
      setDestinationOptions((Array.isArray(ranches) ? ranches : []).filter((ranch) => Number(ranch.id) !== Number(load.originRanchID)))
      setIsEditMode(true)
    } catch (error) {
      showError(error?.response?.data?.message || "Could not load edit options for this load.")
    }
  }

  const cancelEditMode = () => {
    setIsEditMode(false)
  }

  const saveLoadChanges = async () => {
    if (!load?.id || !token) return

    const destinationRanchID = editForm.destinationRanchID ? Number(editForm.destinationRanchID) : null
    const destinationName = String(editForm.destinationName || "").trim()

    if (!destinationRanchID && !destinationName) {
      showError("Destination ranch or custom destination is required.")
      return
    }
    if (!editForm.departureDate) {
      showError("Shipped Out Date is required.")
      return
    }

    try {
      setIsSavingEdit(true)
      await updateLoad(load.id, {
        originRanchID: load.originRanchID,
        destinationRanchID,
        destinationName: destinationName || null,
        departureDate: editForm.departureDate || null,
        arrivalDate: editForm.arrivalDate || null,
        trucking: editForm.trucking || null,
        notes: editForm.notes || null,
      }, token)

      showSuccess("Load updated successfully.", "Saved")
      setIsEditMode(false)
      if (onUpdated) onUpdated()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not update load.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDeleteLoad = async () => {
    if (!load?.id || !token) return

    const confirmed = await confirmAction({
      title: "Delete Load",
      message: "This will delete the load and restore calves to their previous status. Proceed?",
      confirmText: "YES",
      cancelText: "NO",
    })
    if (!confirmed) return

    try {
      setIsDeletingLoad(true)
      await deleteLoad(load.id, token)
      showSuccess("Load deleted successfully. Calves were restored.", "Deleted")
      if (onDeleted) onDeleted(load.id)
    } catch (error) {
      showError(error?.response?.data?.message || "Could not delete load.")
    } finally {
      setIsDeletingLoad(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-primary-border/30 bg-primary-border/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-secondary">Load summary</p>
            <p className="mt-1 text-lg font-semibold text-primary-text">
              {originName} to {destinationName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                isPending
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-emerald-100 text-emerald-700 border border-emerald-200"
              }`}
            >
              {isPending ? "In transit" : "Arrived"}
            </span>
            {!isEditMode && (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60"
                  onClick={handleDeleteLoad}
                  disabled={isDeletingLoad}
                >
                  <Trash2 className="size-3.5" />
                  {isDeletingLoad ? "Deleting..." : "Delete Load"}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary-border/40 bg-white px-2.5 py-1.5 text-xs hover:bg-primary-border/10"
                  onClick={openEditMode}
                >
                  <Pencil className="size-3.5" />
                  Edit Load
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {isEditMode && (
        <div className="rounded-2xl border border-primary-border/30 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-primary-text">Edit Load</h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary-border/40 px-2.5 py-1.5 text-xs hover:bg-primary-border/10"
                onClick={cancelEditMode}
                disabled={isSavingEdit}
              >
                <RotateCcw className="size-3.5" />
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-action-blue/80 bg-action-blue px-2.5 py-1.5 text-xs text-white hover:bg-action-blue/90 disabled:opacity-60"
                onClick={saveLoadChanges}
                disabled={isSavingEdit}
              >
                <Save className="size-3.5" />
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Destination Ranch</label>
              <select
                className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                value={editForm.destinationRanchID}
                onChange={(event) => setEditForm((prev) => ({ ...prev, destinationRanchID: event.target.value }))}
              >
                <option value="">Custom destination</option>
                {destinationOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Custom Destination</label>
              <input
                className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                value={editForm.destinationName}
                onChange={(event) => setEditForm((prev) => ({ ...prev, destinationName: event.target.value }))}
                placeholder="Destination label"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Shipped Out Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                value={editForm.departureDate}
                onChange={(event) => setEditForm((prev) => ({ ...prev, departureDate: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Arrival Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                value={editForm.arrivalDate}
                onChange={(event) => setEditForm((prev) => ({ ...prev, arrivalDate: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Trucking</label>
              <input
                className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                value={editForm.trucking}
                onChange={(event) => setEditForm((prev) => ({ ...prev, trucking: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Notes</label>
              <input
                className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                value={editForm.notes}
                onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>

        </div>
      )}

      {!isEditMode && (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-primary-border/30 bg-white p-3">
          <p className="text-xs text-secondary">Origin</p>
          <p className="mt-1 text-sm font-semibold text-primary-text">{originName}</p>
        </div>
        <div className="rounded-xl border border-primary-border/30 bg-white p-3">
          <p className="text-xs text-secondary">Shipped To</p>
          <p className="mt-1 text-sm font-semibold text-primary-text">{destinationName}</p>
        </div>
        <div className="rounded-xl border border-primary-border/30 bg-white p-3">
          <p className="text-xs text-secondary">Shipped Out Date</p>
          <p className="mt-1 text-sm font-semibold text-primary-text">{formatDate(shippedOutDate)}</p>
        </div>
        <div className="rounded-xl border border-primary-border/30 bg-white p-3">
          <p className="text-xs text-secondary">Arrival Date</p>
          <p className="mt-1 text-sm font-semibold text-primary-text">{formatDate(load.arrivalDate)}</p>
        </div>
        <div className="rounded-xl border border-primary-border/30 bg-white p-3">
          <p className="text-xs text-secondary">Trucking</p>
          <p className="mt-1 text-sm font-semibold text-primary-text">{load.trucking || "-"}</p>
        </div>
        <div className="rounded-xl border border-primary-border/30 bg-white p-3">
          <p className="text-xs text-secondary">Head Count</p>
          <p className="mt-1 text-sm font-semibold text-primary-text">{load.headCount || 0}</p>
        </div>
      </div>

      {load.notes && (
        <div className="rounded-xl border border-primary-border/30 bg-white p-3">
          <p className="text-xs text-secondary">Notes</p>
          <p className="mt-1 text-sm text-primary-text">{load.notes}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-primary-border/30 bg-white">
        <div className="flex items-center justify-between border-b border-primary-border/30 bg-primary-border/10 px-3 py-2">
          <h4 className="text-sm font-semibold text-primary-text">Calves in this load</h4>
          <span className="text-xs text-secondary">{(load.calves || []).length} calves</span>
        </div>
        <div className="flex flex-col gap-2 border-b border-primary-border/20 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2" ref={filterRef}>
            <div className="relative">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary-border/40 px-2.5 text-xs hover:bg-primary-border/10"
                onClick={() => setFilterOpen((prev) => !prev)}
              >
                <Funnel className="size-3.5" />
                Filter
              </button>
              {filterOpen && (
                <div className="absolute left-0 mt-2 z-30 w-[230px] rounded-xl border border-primary-border/30 bg-white p-3 shadow-lg">
                  <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Breed</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-primary-border/40 px-2.5 py-1.5 text-xs"
                    value={breedFilter}
                    onChange={(event) => setBreedFilter(event.target.value)}
                  >
                    <option value="">All breeds</option>
                    {breedOptions.map((option) => (
                      <option key={option} value={option}>{toTitleCase(option)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-lg border border-primary-border/40 px-2.5 py-1.5 text-xs hover:bg-primary-border/10"
                    onClick={() => setBreedFilter("")}
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
            <select
              className="h-8 rounded-lg border border-primary-border/40 px-2 text-xs"
              value={rowLimit}
              onChange={(event) => setRowLimit(Number(event.target.value))}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={0}>All</option>
            </select>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary-border/40 px-2.5 text-xs hover:bg-primary-border/10"
              onClick={exportLoadToExcel}
            >
              <Download className="size-3.5" />
              Export
            </button>
          </div>

          <div className="w-full lg:w-[340px]" ref={searchRef}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-secondary" />
              <input
                className="h-8 w-full rounded-lg border border-primary-border/40 pl-8 pr-16 text-xs"
                placeholder={getSearchPlaceholder(searchMode, searchField)}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
              {searchValue && (
                <button
                  type="button"
                  className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-secondary hover:bg-primary-border/10"
                  onClick={() => setSearchValue("")}
                >
                  <X className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-secondary hover:bg-primary-border/10"
                onClick={() => setSearchOpen((prev) => !prev)}
                title="Search Type"
              >
                <SlidersHorizontal className="size-3.5" />
              </button>
              {searchOpen && (
                <div className="absolute right-0 mt-2 z-30 w-[260px] rounded-xl border border-primary-border/30 bg-white p-3 shadow-lg">
                  <div>
                    <p className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Search Column</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={`rounded-lg border px-2 py-1.5 text-xs ${searchField === "all" ? "border-action-blue/70 bg-action-blue/10 text-action-blue" : "border-primary-border/40 hover:bg-primary-border/10"}`}
                        onClick={() => setSearchField("all")}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        className={`rounded-lg border px-2 py-1.5 text-xs ${searchField === "visualTag" ? "border-action-blue/70 bg-action-blue/10 text-action-blue" : "border-primary-border/40 hover:bg-primary-border/10"}`}
                        onClick={() => setSearchField("visualTag")}
                      >
                        Visual Tag
                      </button>
                      <button
                        type="button"
                        className={`rounded-lg border px-2 py-1.5 text-xs ${searchField === "eid" ? "border-action-blue/70 bg-action-blue/10 text-action-blue" : "border-primary-border/40 hover:bg-primary-border/10"}`}
                        onClick={() => setSearchField("eid")}
                      >
                        EID
                      </button>
                      <button
                        type="button"
                        className={`rounded-lg border px-2 py-1.5 text-xs ${searchField === "backTag" ? "border-action-blue/70 bg-action-blue/10 text-action-blue" : "border-primary-border/40 hover:bg-primary-border/10"}`}
                        onClick={() => setSearchField("backTag")}
                      >
                        Back Tag
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Search Type</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={`rounded-lg border px-2 py-1.5 text-xs ${searchMode === "single" ? "border-action-blue/70 bg-action-blue/10 text-action-blue" : "border-primary-border/40 hover:bg-primary-border/10"}`}
                        onClick={() => setSearchMode("single")}
                      >
                        Single Tag
                      </button>
                      <button
                        type="button"
                        className={`rounded-lg border px-2 py-1.5 text-xs ${searchMode === "multiple" ? "border-action-blue/70 bg-action-blue/10 text-action-blue" : "border-primary-border/40 hover:bg-primary-border/10"}`}
                        onClick={() => setSearchMode("multiple")}
                      >
                        Multiple Values
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Match Mode</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={`rounded-lg border px-2 py-1.5 text-xs ${searchMatchMode === "exact" ? "border-action-blue/70 bg-action-blue/10 text-action-blue" : "border-primary-border/40 hover:bg-primary-border/10"}`}
                        onClick={() => setSearchMatchMode("exact")}
                      >
                        Exact Match
                      </button>
                      <button
                        type="button"
                        className={`rounded-lg border px-2 py-1.5 text-xs ${searchMatchMode === "contains" ? "border-action-blue/70 bg-action-blue/10 text-action-blue" : "border-primary-border/40 hover:bg-primary-border/10"}`}
                        onClick={() => setSearchMatchMode("contains")}
                      >
                        Contains
                      </button>
                    </div>
                  </div>
                  {searchMode === "multiple" && (
                    <p className="mt-3 text-xs text-secondary">Multiple values must be separated by comma.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="bg-primary-border/5">
              <tr>
                <th className="text-left px-3 py-2 text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("primaryID")}>Visual Tag <span>{sortConfig.key === "primaryID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="text-left px-3 py-2 text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("EID")}>EID <span>{sortConfig.key === "EID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="text-left px-3 py-2 text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("breed")}>Breed <span>{sortConfig.key === "breed" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
              </tr>
            </thead>
            <tbody>
              {visibleCalves.map((calf) => (
                <tr key={calf.id || calf.primaryID} className="border-t border-primary-border/20 hover:bg-primary-border/5">
                  <td className="px-3 py-2 text-sm">{calf.primaryID || "-"}</td>
                  <td className="px-3 py-2 text-sm">{calf.EID || "-"}</td>
                  <td className="px-3 py-2 text-sm">{calf.breed ? toTitleCase(calf.breed) : "-"}</td>
                </tr>
              ))}
              {visibleCalves.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-sm text-secondary text-center">
                    No calves associated.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2 border-t border-primary-border/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-secondary">
            Showing {pageStart}-{pageEnd} of {sortedCalves.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </button>
            <button
              type="button"
              className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className="px-1 text-xs text-secondary">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
            <button
              type="button"
              className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-primary-border/30 bg-white p-3">
        <h4 className="text-sm font-semibold text-primary-text">Load metadata</h4>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-secondary">
          <div className="inline-flex items-center gap-1.5">
            <ClipboardList className="size-3.5" />
            Load ID: {load.id || "-"}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Truck className="size-3.5" />
            Trucking: {load.trucking || "N/A"}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <MapPinned className="size-3.5" />
            Destination: {destinationName}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            Departure: {formatDate(load.departureDate)}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            Created: {formatDate(load.createdAt)}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            Updated: {formatDate(load.updatedAt)}
          </div>
          <div className="inline-flex items-center gap-1.5 sm:col-span-2">
            <PackageCheck className="size-3.5" />
            Head count recorded: {load.headCount || 0}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  )
}

export default LoadDetails
