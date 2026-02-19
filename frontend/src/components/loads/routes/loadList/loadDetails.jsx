import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { Calendar, ClipboardList, Truck, MapPinned, PackageCheck, Download, Search, SlidersHorizontal, Funnel, X, Pencil, Save, RotateCcw, Trash2 } from "lucide-react"
import { useToken } from "../../../../api/useToken"
import { useAppContext } from "../../../../context"
import { getRanches } from "../../../../api/ranches"
import { deleteLoad, updateLoad, updateLoadCalfArrivalStatus } from "../../../../api/loads"
import StyledDateInput from "../../../shared/styledDateInput"
import { formatDateMMDDYYYY, formatDateTimeMMDDYYYY } from "../../../../utils/dateFormat"
import { formatSexLabel } from "../../../../utils/sexLabel"

dayjs.extend(utc)

const formatDate = (value) => {
  return formatDateMMDDYYYY(value, "N/A")
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

const parseDateToLocalDayStart = (value) => {
  if (!value) return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  }

  const raw = String(value).trim()
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1])
    const month = Number(dateOnlyMatch[2]) - 1
    const day = Number(dateOnlyMatch[3])
    const localDate = new Date(year, month, day)
    if (
      localDate.getFullYear() === year &&
      localDate.getMonth() === month &&
      localDate.getDate() === day
    ) {
      return localDate
    }
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

const calculateDaysOnFeed = (calf) => {
  const intakeRaw = calf?.dateIn || calf?.placedDate
  const intakeStart = parseDateToLocalDayStart(intakeRaw)
  const preDaysRaw = Number(calf?.preDaysOnFeed)
  const preDays = Number.isFinite(preDaysRaw) ? preDaysRaw : 0

  if (!intakeStart) {
    return preDays > 0 ? preDays : 0
  }

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const msDiff = todayStart.getTime() - intakeStart.getTime()
  const intakeDays = Math.floor(msDiff / (1000 * 60 * 60 * 24)) + 1
  const safeIntakeDays = Math.max(intakeDays, 1)

  return safeIntakeDays + preDays
}

const getLoadCalfDaysOnFeed = (calf) => {
  const snapshotDays = Number(calf?.daysOnFeedAtShipment)
  if (Number.isFinite(snapshotDays) && snapshotDays >= 0) return snapshotDays
  return calculateDaysOnFeed(calf)
}

const CALF_ARRIVAL_STATUS_META = {
  doa: { key: "doa", shortLabel: "DOA", fullLabel: "Dead On Arrival" },
  issue: { key: "issue", shortLabel: "Issue", fullLabel: "Issue" },
  not_in_load: { key: "not_in_load", shortLabel: "Not In Load", fullLabel: "Not In Load" },
}

const CALF_ARRIVAL_ACTIONS = [
  {
    key: "in_load",
    shortLabel: "In Load",
    fullLabel: "In Load",
    payload: null,
    activeClassName: "border-emerald-300 bg-emerald-100 text-emerald-800",
    inactiveClassName: "border-emerald-200/70 text-emerald-700 hover:bg-emerald-50",
  },
  {
    key: "doa",
    shortLabel: "DOA",
    fullLabel: "Dead On Arrival",
    payload: "doa",
    activeClassName: "border-red-300 bg-red-100 text-red-700",
    inactiveClassName: "border-red-200/70 text-red-700 hover:bg-red-50",
  },
  {
    key: "issue",
    shortLabel: "Issue",
    fullLabel: "Issue",
    payload: "issue",
    activeClassName: "border-amber-300 bg-amber-100 text-amber-800",
    inactiveClassName: "border-amber-200/70 text-amber-700 hover:bg-amber-50",
  },
  {
    key: "not_in_load",
    shortLabel: "Not In Load",
    fullLabel: "Not In Load",
    payload: "not_in_load",
    activeClassName: "border-slate-300 bg-slate-200 text-slate-800",
    inactiveClassName: "border-slate-200/80 text-slate-700 hover:bg-slate-100",
  },
]

const UNDO_ARRIVAL_STATUS_WINDOW_MS = 8000

const CALF_ARRIVAL_STATUS_CARDS = [
  { key: "in_load", label: "In Load", className: "border-emerald-200 bg-emerald-50/60" },
  { key: "doa", label: "DOA", className: "border-red-200 bg-red-50/70" },
  { key: "issue", label: "Issue", className: "border-amber-200 bg-amber-50/80" },
  { key: "not_in_load", label: "Not In Load", className: "border-slate-200 bg-slate-100/70" },
]

const normalizeCalfArrivalStatus = (value) => {
  const normalized = String(value ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_")
  return CALF_ARRIVAL_STATUS_META[normalized] ? normalized : null
}

const getCalfArrivalStatusKey = (value) => normalizeCalfArrivalStatus(value) || "in_load"

const getCalfArrivalStatusLabel = (value) => {
  const normalized = normalizeCalfArrivalStatus(value)
  if (!normalized) return "In Load"
  return CALF_ARRIVAL_STATUS_META[normalized]?.fullLabel || "In Load"
}

const getCalfArrivalStatusShortLabel = (value) => {
  const normalized = normalizeCalfArrivalStatus(value)
  if (!normalized) return "In Load"
  return CALF_ARRIVAL_STATUS_META[normalized]?.shortLabel || "In Load"
}

const toPositiveIntegerOrNull = (value) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const isCalfCountedInLoadSummary = (calf) => {
  const statusKey = getCalfArrivalStatusKey(calf?.arrivalStatus)
  return statusKey === "in_load" || statusKey === "issue"
}

const LoadDetails = ({ load, onUpdated, onDeleted, initialAction = null, onInitialActionHandled }) => {
  const { id: routeRanchId } = useParams()
  const token = useToken()
  const { ranch, showSuccess, showError, confirmAction } = useAppContext()
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" })
  const [breedFilter, setBreedFilter] = useState("")
  const [sexFilter, setSexFilter] = useState("")
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
  const [afterArrivalNotesDraft, setAfterArrivalNotesDraft] = useState("")
  const [isSavingAfterArrivalNotes, setIsSavingAfterArrivalNotes] = useState(false)
  const [updatingArrivalStatusByCalfId, setUpdatingArrivalStatusByCalfId] = useState({})
  const [undoArrivalStatusAction, setUndoArrivalStatusAction] = useState(null)
  const [destinationOptions, setDestinationOptions] = useState([])
  const [editForm, setEditForm] = useState({
    destinationRanchID: "",
    destinationName: "",
    departureDate: "",
    arrivalDate: "",
    trucking: "",
  })
  const filterRef = useRef(null)
  const searchRef = useRef(null)
  const undoArrivalStatusTimeoutRef = useRef(null)

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

  useEffect(() => {
    return () => {
      if (undoArrivalStatusTimeoutRef.current) {
        clearTimeout(undoArrivalStatusTimeoutRef.current)
        undoArrivalStatusTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    setUndoArrivalStatusAction(null)
    if (undoArrivalStatusTimeoutRef.current) {
      clearTimeout(undoArrivalStatusTimeoutRef.current)
      undoArrivalStatusTimeoutRef.current = null
    }
  }, [load?.id])

  useEffect(() => {
    setAfterArrivalNotesDraft(String(load?.afterArrivalNotes || ""))
    setIsSavingAfterArrivalNotes(false)
  }, [load?.id, load?.afterArrivalNotes])

  const breedOptions = useMemo(
    () => [...new Set((load?.calves || []).map((calf) => calf?.breed).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
    [load?.calves]
  )
  const sexOptions = useMemo(
    () => [...new Set((load?.calves || []).map((calf) => calf?.sex).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
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
      const matchesSex = !sexFilter || String(calf?.sex || "").toLowerCase().trim() === String(sexFilter || "").toLowerCase().trim()
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

      return matchesBreed && matchesSex && matchesSearch
    })
  }, [load?.calves, breedFilter, sexFilter, searchValue, searchMode, searchMatchMode, searchField])

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

    const accessor = {
      daysOnFeed: (row) => getLoadCalfDaysOnFeed(row),
      dateIn: (row) => row?.placedDate || row?.dateIn || null,
    }[sortConfig.key] || ((row) => row?.[sortConfig.key])

    return [...filteredCalves].sort((a, b) => {
      const aValue = normalize(accessor(a))
      const bValue = normalize(accessor(b))
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
  const averageDaysOnFeedAllLoad = useMemo(() => {
    const calves = Array.isArray(load?.calves) ? load.calves : []
    if (calves.length === 0) return null
    const totalDays = calves.reduce((sum, calf) => sum + getLoadCalfDaysOnFeed(calf), 0)
    return totalDays / calves.length
  }, [load?.calves])
  const averageDaysOnFeedLabel = useMemo(() => {
    if (averageDaysOnFeedAllLoad === null) return "-"
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(averageDaysOnFeedAllLoad)
  }, [averageDaysOnFeedAllLoad])
  const effectiveCalvesForLoadSummary = useMemo(() => {
    const calves = Array.isArray(load?.calves) ? load.calves : []
    return calves.filter((calf) => isCalfCountedInLoadSummary(calf))
  }, [load?.calves])
  const averageDaysOnFeedLoadSummary = useMemo(() => {
    if (effectiveCalvesForLoadSummary.length === 0) return null
    const totalDays = effectiveCalvesForLoadSummary.reduce((sum, calf) => sum + getLoadCalfDaysOnFeed(calf), 0)
    return totalDays / effectiveCalvesForLoadSummary.length
  }, [effectiveCalvesForLoadSummary])
  const averageDaysOnFeedLoadSummaryLabel = useMemo(() => {
    if (averageDaysOnFeedLoadSummary === null) return "-"
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(averageDaysOnFeedLoadSummary)
  }, [averageDaysOnFeedLoadSummary])
  const breedSummaryRows = useMemo(() => {
    const calves = effectiveCalvesForLoadSummary
    const grouped = new Map()

    calves.forEach((calf) => {
      const rawBreed = String(calf?.breed || "").trim()
      const breedLabel = rawBreed || "Unspecified"
      const current = grouped.get(breedLabel) || {
        breed: breedLabel,
        totalCalves: 0,
        totalDaysOnFeed: 0,
      }

      current.totalCalves += 1
      current.totalDaysOnFeed += getLoadCalfDaysOnFeed(calf)
      grouped.set(breedLabel, current)
    })

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        averageDaysOnFeed: row.totalCalves > 0 ? row.totalDaysOnFeed / row.totalCalves : 0,
      }))
      .sort((a, b) => String(a.breed).localeCompare(String(b.breed)))
  }, [effectiveCalvesForLoadSummary])
  const totalBreedSummaryCalves = useMemo(
    () => breedSummaryRows.reduce((sum, row) => sum + Number(row.totalCalves || 0), 0),
    [breedSummaryRows]
  )
  const arrivalStatusSummary = useMemo(() => {
    const calves = Array.isArray(load?.calves) ? load.calves : []
    const summary = {
      in_load: 0,
      doa: 0,
      issue: 0,
      not_in_load: 0,
    }

    calves.forEach((calf) => {
      const key = getCalfArrivalStatusKey(calf?.arrivalStatus)
      summary[key] = Number(summary[key] || 0) + 1
    })

    return summary
  }, [load?.calves])

  useEffect(() => {
    setCurrentPage(1)
  }, [breedFilter, sexFilter, searchValue, searchMode, searchMatchMode, searchField, safeRowLimit, sortConfig.key, sortConfig.direction])

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
    })
  }, [load])

  useEffect(() => {
    if (initialAction !== "edit" || !load?.id || isEditMode || !token) return
    let cancelled = false

    const openEditFromQuickAction = async () => {
      try {
        const ranches = await getRanches(token)
        if (cancelled) return
        setDestinationOptions((Array.isArray(ranches) ? ranches : []).filter((ranch) => Number(ranch.id) !== Number(load.originRanchID)))
        setIsEditMode(true)
      } catch (error) {
        if (cancelled) return
        showError(error?.response?.data?.message || "Could not load edit options for this load.")
      } finally {
        if (!cancelled && onInitialActionHandled) onInitialActionHandled()
      }
    }

    openEditFromQuickAction()
    return () => {
      cancelled = true
    }
  }, [initialAction, isEditMode, load?.id, load?.originRanchID, onInitialActionHandled, showError, token])

  if (!load) {
    return <p className="text-sm text-secondary">Select a load to view details.</p>
  }

  const destinationName = load.destination?.name || load.shippedTo || "-"
  const originName = load.origin?.name || "-"
  const shippedOutDate = load.shippedOutDate || load.departureDate
  const activeRanchIdNumber = Number(routeRanchId || ranch?.id)
  const originRanchIdNumber = toPositiveIntegerOrNull(load.originRanchID)
  const destinationRanchIdNumber = toPositiveIntegerOrNull(load.destinationRanchID)
  const hasDestinationRanch = Boolean(destinationRanchIdNumber)
  const canDeleteLoad = Number.isFinite(activeRanchIdNumber) && Number(load.originRanchID) === activeRanchIdNumber
  const canEditCalfArrivalStatus = (
    Number.isFinite(activeRanchIdNumber) &&
    String(load.status || "").toLowerCase() === "arrived" &&
    (
      hasDestinationRanch
        ? (
          originRanchIdNumber === activeRanchIdNumber ||
          destinationRanchIdNumber === activeRanchIdNumber
        )
        : originRanchIdNumber === activeRanchIdNumber
    )
  )
  const normalizedStatus = String(load.status || "").toLowerCase()
  const canEditAfterArrivalNotes = (
    Number.isFinite(activeRanchIdNumber) &&
    normalizedStatus === "arrived" &&
    (
      originRanchIdNumber === activeRanchIdNumber ||
      destinationRanchIdNumber === activeRanchIdNumber
    )
  )
  const statusMeta = {
    draft: { label: "Draft", className: "bg-slate-100 text-slate-700 border border-slate-200" },
    in_transit: { label: "In Transit", className: "bg-amber-100 text-amber-700 border border-amber-200" },
    arrived: { label: "Arrived", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
    canceled: { label: "Canceled", className: "bg-red-100 text-red-700 border border-red-200" },
  }[normalizedStatus] || { label: "In Transit", className: "bg-amber-100 text-amber-700 border border-amber-200" }

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
      "Before Load Notes": load.notes || "",
      "After Arrival Notes": load.afterArrivalNotes || "",
      "Head Count": load.headCount || 0,
      Status: statusMeta.label,
    }]

    const calfRows = (load.calves || []).map((calf) => ({
      "Calf ID": calf.id || "",
      "Visual Tag": calf.primaryID || "",
      EID: calf.EID || "",
      "Back Tag": calf.originalID || calf.backTag || "",
      Breed: calf.breed || "",
      Sex: formatSexLabel(calf.sex, ""),
      Seller: calf.seller || "",
      Status: calf.status || "",
      "Load Arrival Status": getCalfArrivalStatusLabel(calf.arrivalStatus),
      "Date In": formatDate(calf.placedDate || calf.dateIn),
      "DOF At Shipment": getLoadCalfDaysOnFeed(calf),
      "Paid Price": calf.price ?? calf.purchasePrice ?? "",
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

  const isCustomDestinationSelected = !editForm.destinationRanchID

  const handleDeleteLoad = async () => {
    if (!load?.id || !token) return
    if (!canDeleteLoad) {
      showError("You can only delete loads shipped from this ranch.")
      return
    }

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

  const handleSaveAfterArrivalNotes = async () => {
    if (!load?.id || !token) return
    if (!canEditAfterArrivalNotes) {
      if (!Number.isFinite(activeRanchIdNumber)) {
        showError("Select an active ranch to edit after-arrival notes.")
      } else if (normalizedStatus !== "arrived") {
        showError("Load must be marked as Arrived before adding after-arrival notes.")
      } else {
        showError("Only origin or destination ranch can edit after-arrival notes.")
      }
      return
    }

    const nextNotes = String(afterArrivalNotesDraft || "").trim()
    const currentNotes = String(load.afterArrivalNotes || "").trim()
    if (nextNotes === currentNotes) return
    if (nextNotes.length > 255) {
      showError("After-arrival notes cannot exceed 255 characters.")
      return
    }

    try {
      setIsSavingAfterArrivalNotes(true)
      await updateLoad(load.id, {
        afterArrivalNotes: nextNotes || null,
      }, token)
      showSuccess("After-arrival notes saved.", "Saved")
      if (onUpdated) onUpdated()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not save after-arrival notes.")
    } finally {
      setIsSavingAfterArrivalNotes(false)
    }
  }

  const clearUndoArrivalStatusAction = () => {
    if (undoArrivalStatusTimeoutRef.current) {
      clearTimeout(undoArrivalStatusTimeoutRef.current)
      undoArrivalStatusTimeoutRef.current = null
    }
    setUndoArrivalStatusAction(null)
  }

  const scheduleUndoArrivalStatusAction = (nextAction) => {
    if (undoArrivalStatusTimeoutRef.current) {
      clearTimeout(undoArrivalStatusTimeoutRef.current)
    }
    setUndoArrivalStatusAction(nextAction)
    undoArrivalStatusTimeoutRef.current = setTimeout(() => {
      setUndoArrivalStatusAction(null)
      undoArrivalStatusTimeoutRef.current = null
    }, UNDO_ARRIVAL_STATUS_WINDOW_MS)
  }

  const handleUndoArrivalStatusChange = async () => {
    if (!undoArrivalStatusAction || !load?.id || !token) return
    if (!canEditCalfArrivalStatus) {
      if (!Number.isFinite(activeRanchIdNumber)) {
        showError("Select an active ranch to edit calf load status.")
      } else if (String(load.status || "").toLowerCase() !== "arrived") {
        showError("Load must be marked as Arrived before editing calf load status.")
      } else if (!hasDestinationRanch && originRanchIdNumber !== activeRanchIdNumber) {
        showError("Only origin ranch can edit calf load status for custom destination loads.")
      } else {
        showError("Only origin or destination ranch can edit calf load status.")
      }
      return
    }
    const { calfID, calfLabel, previousStatus } = undoArrivalStatusAction
    const numericCalfId = Number(calfID)
    if (!Number.isFinite(numericCalfId)) return

    try {
      setUpdatingArrivalStatusByCalfId((prev) => ({ ...prev, [numericCalfId]: true }))
      await updateLoadCalfArrivalStatus(load.id, {
        calfID: numericCalfId,
        actingRanchID: activeRanchIdNumber,
        arrivalStatus: previousStatus,
      }, token)
      showSuccess(`Calf ${calfLabel} reverted to ${getCalfArrivalStatusShortLabel(previousStatus)}.`, "Undo")
      clearUndoArrivalStatusAction()
      if (onUpdated) onUpdated()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not undo calf arrival status.")
    } finally {
      setUpdatingArrivalStatusByCalfId((prev) => ({ ...prev, [numericCalfId]: false }))
    }
  }

  const handleUpdateCalfArrivalStatus = async (calf, actionKey) => {
    if (!load?.id || !token || !calf?.id) return
    if (!canEditCalfArrivalStatus) {
      if (!Number.isFinite(activeRanchIdNumber)) {
        showError("Select an active ranch to edit calf load status.")
      } else if (String(load.status || "").toLowerCase() !== "arrived") {
        showError("Load must be marked as Arrived before editing calf load status.")
      } else if (!hasDestinationRanch && originRanchIdNumber !== activeRanchIdNumber) {
        showError("Only origin ranch can edit calf load status for custom destination loads.")
      } else {
        showError("Only origin or destination ranch can edit calf load status.")
      }
      return
    }
    const calfId = Number(calf.id)
    if (!Number.isFinite(calfId)) return

    const selectedAction = CALF_ARRIVAL_ACTIONS.find((action) => action.key === actionKey)
    if (!selectedAction) return
    const previousStatus = normalizeCalfArrivalStatus(calf.arrivalStatus)
    const nextStatus = selectedAction.payload
    if ((previousStatus || null) === (nextStatus || null)) return

    if (selectedAction.key === "doa") {
      const confirmed = await confirmAction({
        title: "Confirm DOA",
        message: `Mark calf ${calf.primaryID || calf.id} as Dead On Arrival (DOA)?`,
        confirmText: "YES",
        cancelText: "NO",
      })
      if (!confirmed) return
    }

    try {
      setUpdatingArrivalStatusByCalfId((prev) => ({ ...prev, [calfId]: true }))
      await updateLoadCalfArrivalStatus(load.id, {
        calfID: calfId,
        actingRanchID: activeRanchIdNumber,
        arrivalStatus: nextStatus,
      }, token)
      if (selectedAction.key === "in_load") {
        showSuccess(`Calf ${calf.primaryID || calf.id} set back to In Load.`, "Saved")
      } else {
        showSuccess(`Calf ${calf.primaryID || calf.id} marked as ${selectedAction.shortLabel}.`, "Saved")
      }
      scheduleUndoArrivalStatusAction({
        calfID: calfId,
        calfLabel: calf.primaryID || calf.id,
        previousStatus: previousStatus || null,
      })
      if (onUpdated) onUpdated()
    } catch (error) {
      showError(error?.response?.data?.message || "Could not update calf arrival status.")
    } finally {
      setUpdatingArrivalStatusByCalfId((prev) => ({ ...prev, [calfId]: false }))
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
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.className}`}
            >
              {statusMeta.label}
            </span>
            {!isEditMode && (
              <>
                {canDeleteLoad && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60"
                    onClick={handleDeleteLoad}
                    disabled={isDeletingLoad}
                  >
                    <Trash2 className="size-3.5" />
                    {isDeletingLoad ? "Deleting..." : "Delete Load"}
                  </button>
                )}
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
                onChange={(event) => {
                  const nextDestinationRanchID = event.target.value
                  setEditForm((prev) => ({
                    ...prev,
                    destinationRanchID: nextDestinationRanchID,
                    destinationName: nextDestinationRanchID ? "" : prev.destinationName,
                  }))
                }}
              >
                <option value="">Custom destination</option>
                {destinationOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
            {isCustomDestinationSelected && (
              <div>
                <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Custom Destination</label>
                <input
                  className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                  value={editForm.destinationName}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, destinationName: event.target.value }))}
                  placeholder="Destination label"
                />
              </div>
            )}
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Shipped Out Date</label>
              <StyledDateInput
                className="mt-1"
                inputClassName="h-[34px]"
                value={editForm.departureDate}
                onChange={(event) => setEditForm((prev) => ({ ...prev, departureDate: event.target.value }))}
                ariaLabel="Open shipped out date picker"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Arrival Date</label>
              <StyledDateInput
                className="mt-1"
                inputClassName="h-[34px]"
                value={editForm.arrivalDate}
                onChange={(event) => setEditForm((prev) => ({ ...prev, arrivalDate: event.target.value }))}
                ariaLabel="Open arrival date picker"
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
        <div className="rounded-xl border border-primary-border/30 bg-white p-3">
          <p className="text-xs text-secondary">Average DOF</p>
          <p className="mt-1 text-sm font-semibold text-primary-text">{averageDaysOnFeedLabel}</p>
        </div>
      </div>

      {load.notes && (
        <div className="rounded-xl border border-primary-border/30 bg-white p-3">
          <p className="text-xs text-secondary">Before Load Notes</p>
          <p className="mt-1 text-sm text-primary-text">{load.notes}</p>
        </div>
      )}

      {normalizedStatus === "arrived" ? (
        <div className="rounded-xl border border-primary-border/30 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-secondary">After Arrival Notes</p>
            <button
              type="button"
              className="rounded-md border border-primary-border/40 px-2.5 py-1 text-xs font-semibold text-primary-text hover:bg-primary-border/10 disabled:opacity-60"
              onClick={handleSaveAfterArrivalNotes}
              disabled={isSavingAfterArrivalNotes}
            >
              {isSavingAfterArrivalNotes ? "Saving..." : "Save"}
            </button>
          </div>
          <textarea
            className="mt-2 min-h-[78px] w-full rounded-lg border border-primary-border/40 px-3 py-2 text-sm"
            placeholder="Add general notes after arrival"
            value={afterArrivalNotesDraft}
            onChange={(event) => setAfterArrivalNotesDraft(event.target.value)}
            maxLength={255}
          />
          <p className="mt-1 text-[11px] text-secondary">
            {String(afterArrivalNotesDraft || "").length}/255 characters
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-primary-border/30 bg-white">
        <div className="flex items-center justify-between border-b border-primary-border/30 bg-primary-border/10 px-3 py-2">
          <h4 className="text-sm font-semibold text-primary-text">Calves in this load</h4>
          <span className="text-xs text-secondary">{(load.calves || []).length} calves</span>
        </div>
        <div className="grid grid-cols-2 gap-2 border-b border-primary-border/20 bg-primary-border/5 px-3 py-2.5 md:grid-cols-4">
          {CALF_ARRIVAL_STATUS_CARDS.map((item) => (
            <div
              key={`arrival-summary-${item.key}`}
              className={`rounded-lg border px-2.5 py-2 ${item.className}`}
            >
              <p className="text-[11px] uppercase tracking-wide text-secondary">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-primary-text">{arrivalStatusSummary[item.key] || 0}</p>
            </div>
          ))}
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
                  <label className="mt-2 block text-[11px] font-semibold text-secondary uppercase tracking-wide">Sex</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-primary-border/40 px-2.5 py-1.5 text-xs"
                    value={sexFilter}
                    onChange={(event) => setSexFilter(event.target.value)}
                  >
                    <option value="">All sexes</option>
                    {sexOptions.map((option) => (
                      <option key={option} value={option}>{formatSexLabel(option, toTitleCase(option))}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-lg border border-primary-border/40 px-2.5 py-1.5 text-xs hover:bg-primary-border/10"
                    onClick={() => {
                      setBreedFilter("")
                      setSexFilter("")
                    }}
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
        {undoArrivalStatusAction && (
          <div className="border-b border-primary-border/20 bg-primary-border/5 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary-border/30 bg-white px-2.5 py-2">
              <p className="text-xs text-primary-text">
                Status updated for calf <span className="font-semibold">{undoArrivalStatusAction.calfLabel}</span>.
              </p>
              <button
                type="button"
                className="rounded-md border border-primary-border/40 px-2.5 py-1 text-xs font-semibold text-primary-text hover:bg-primary-border/10"
                onClick={handleUndoArrivalStatusChange}
              >
                Undo
              </button>
            </div>
          </div>
        )}
        <div className="max-h-[320px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="bg-primary-border/5">
              <tr>
                <th className="text-left px-3 py-2 text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("primaryID")}>Visual Tag <span>{sortConfig.key === "primaryID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="text-left px-3 py-2 text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("dateIn")}>Date In <span>{sortConfig.key === "dateIn" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="text-left px-3 py-2 text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("breed")}>Breed <span>{sortConfig.key === "breed" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="text-right px-3 py-2 text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("daysOnFeed")}>DOF <span>{sortConfig.key === "daysOnFeed" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="text-right px-3 py-2 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleCalves.map((calf) => (
                <tr key={calf.id || calf.primaryID} className="border-t border-primary-border/20 hover:bg-primary-border/5">
                  <td className="px-3 py-2 text-sm">{calf.primaryID || "-"}</td>
                  <td className="px-3 py-2 text-sm">{formatDate(calf.placedDate || calf.dateIn)}</td>
                  <td className="px-3 py-2 text-sm">{calf.breed ? toTitleCase(calf.breed) : "-"}</td>
                  <td className="px-3 py-2 text-sm text-right">{getLoadCalfDaysOnFeed(calf)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex overflow-hidden rounded-md border border-primary-border/30 bg-white">
                      {CALF_ARRIVAL_ACTIONS.map((statusOption, index) => {
                        const normalized = normalizeCalfArrivalStatus(calf.arrivalStatus)
                        const currentActionKey = normalized || "in_load"
                        const isActive = currentActionKey === statusOption.key
                        const isLoading = Boolean(updatingArrivalStatusByCalfId[Number(calf.id)])
                        return (
                          <button
                            key={`${calf.id}-${statusOption.key}`}
                            type="button"
                            className={`px-2 py-1 text-[11px] font-medium whitespace-nowrap transition ${
                              index > 0 ? "border-l border-primary-border/30" : ""
                            } ${
                              isActive ? statusOption.activeClassName : statusOption.inactiveClassName
                            }`}
                            disabled={isLoading}
                            onClick={() => handleUpdateCalfArrivalStatus(calf, statusOption.key)}
                            title={statusOption.fullLabel}
                          >
                            {isLoading && isActive ? "Saving..." : statusOption.shortLabel}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleCalves.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-sm text-secondary text-center">
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

      <div className="overflow-hidden rounded-xl border border-primary-border/30 bg-white">
        <div className="flex items-center justify-between border-b border-primary-border/30 bg-primary-border/10 px-3 py-2">
          <h4 className="text-sm font-semibold text-primary-text">Load Summary by Breed</h4>
          <span className="text-xs text-secondary">{breedSummaryRows.length} breeds</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-primary-border/5">
              <tr>
                <th className="px-3 py-2 text-left text-xs">Breed</th>
                <th className="px-3 py-2 text-right text-xs">Total Calves</th>
                <th className="px-3 py-2 text-right text-xs">Avg DOF</th>
              </tr>
            </thead>
            <tbody>
              {breedSummaryRows.map((row) => (
                <tr key={`breed-summary-${row.breed}`} className="border-t border-primary-border/20">
                  <td className="px-3 py-2 text-sm text-primary-text">{row.breed === "Unspecified" ? row.breed : toTitleCase(row.breed)}</td>
                  <td className="px-3 py-2 text-sm text-right text-primary-text">{row.totalCalves}</td>
                  <td className="px-3 py-2 text-sm text-right text-primary-text">
                    {new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(row.averageDaysOnFeed)}
                  </td>
                </tr>
              ))}
              {breedSummaryRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-sm text-secondary">
                    No breed summary available.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-primary-border/30 bg-primary-border/5">
                <td className="px-3 py-2 text-xs font-semibold text-primary-text">Total</td>
                <td className="px-3 py-2 text-xs text-right font-semibold text-primary-text">{totalBreedSummaryCalves}</td>
                <td className="px-3 py-2 text-xs text-right font-semibold text-primary-text">{averageDaysOnFeedLoadSummaryLabel}</td>
              </tr>
            </tfoot>
          </table>
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
            <ClipboardList className="size-3.5" />
            Created By: {load.createdBy || load.created_by || "N/A"}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            Created: {formatDateTimeMMDDYYYY(load.createdAt || load.created_at, "N/A")}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            Updated: {formatDateTimeMMDDYYYY(load.updatedAt || load.updated_at, "N/A")}
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
