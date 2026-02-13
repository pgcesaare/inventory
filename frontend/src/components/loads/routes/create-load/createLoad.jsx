import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { Search, CheckCheck, X } from "lucide-react"
import { useToken } from "../../../../api/useToken"
import { getRanches } from "../../../../api/ranches"
import { getInventoryByRanch } from "../../../../api/calves"
import { createLoad } from "../../../../api/loads"
import { formatDateMMDDYYYY } from "../../../../utils/dateFormat"
import DateFilterMenu from "../../../shared/dateFilterMenu"
import BreedSellerFilterMenu from "../../../shared/breedSellerFilterMenu"
import SearchOptionsMenu from "../../../shared/searchOptionsMenu"
import { useAppContext } from "../../../../context"
import { isDateInDateRange } from "../../../../utils/dateRange"

const fieldClass = "w-full rounded-xl border border-primary-border/40 bg-surface px-3 py-2 text-sm text-primary-text focus:outline-none focus:ring-2 focus:ring-action-blue/30"
const pickerButtonClass = "h-[36px] rounded-xl border border-primary-border/40 px-3 text-xs font-medium text-secondary hover:bg-primary-border/10 transition-colors"
const dateValue = (calf) => calf.placedDate || calf.dateIn || null
const dateLabel = (value) => formatDateMMDDYYYY(value, "-")
const normalizeSearchValue = (value) => String(value ?? "").toLowerCase().trim().replace(/[\s-]+/g, "")
const getSearchPlaceholder = (mode, field) => {
  const byField = {
    visualTag: mode === "multiple" ? "TAG-001, TAG-002, TAG-003" : "Search by Visual Tag",
    eid: mode === "multiple" ? "982000001, 982000002, 982000003" : "Search by EID",
    backTag: mode === "multiple" ? "B-001, B-002, B-003" : "Search by Back Tag",
    all: mode === "multiple" ? "TAG-001, TAG-002, TAG-003" : "Search by Visual Tag, EID, or Back Tag",
  }
  return byField[field] || byField.all
}
const RequiredMark = () => <span className="ml-0.5 text-red-600">*</span>
const toTitleCase = (value) => String(value || "").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())

const CreateLoad = ({ onCreated }) => {
  const { id } = useParams()
  const token = useToken()
  const { showSuccess, showError } = useAppContext()

  const [destinations, setDestinations] = useState([])
  const [inventoryCalves, setInventoryCalves] = useState([])
  const [selectedPrimaryIDs, setSelectedPrimaryIDs] = useState([])
  const [searchMode, setSearchMode] = useState("single")
  const [searchMatchMode, setSearchMatchMode] = useState("exact")
  const [searchField, setSearchField] = useState("all")
  const [tagSearch, setTagSearch] = useState("")
  const [tagListSearch, setTagListSearch] = useState("")
  const [breedFilter, setBreedFilter] = useState([])
  const [sellerFilter, setSellerFilter] = useState([])
  const [calfDateFrom, setCalfDateFrom] = useState("")
  const [calfDateTo, setCalfDateTo] = useState("")
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" })
  const [pickerRowLimit, setPickerRowLimit] = useState(15)
  const [pickerPage, setPickerPage] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [pickerError, setPickerError] = useState("")

  const [form, setForm] = useState({
    destinationRanchID: "",
    destinationName: "",
    departureDate: "",
    arrivalDate: "",
    trucking: "",
    notes: "",
  })
  const destinationRef = useRef(null)
  const departureDateRef = useRef(null)
  const calfPickerRef = useRef(null)
  const pickAllRef = useRef(null)

  useEffect(() => {
    if (!token || !id) return

    const fetchData = async () => {
      try {
        const [ranches, calves] = await Promise.all([
          getRanches(token),
          getInventoryByRanch(id, token),
        ])

        setDestinations(Array.isArray(ranches) ? ranches : [])
        setInventoryCalves(Array.isArray(calves) ? calves : [])
      } catch (error) {
        console.error("Error loading create-load data:", error)
      }
    }

    fetchData()
  }, [id, token])

  const breedOptions = useMemo(
    () => [...new Set(inventoryCalves.map((calf) => calf.breed).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
    [inventoryCalves]
  )
  const sellerOptions = useMemo(
    () => [...new Set(inventoryCalves.map((calf) => calf.seller).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))),
    [inventoryCalves]
  )

  const filteredCalves = useMemo(() => {
    const tagTokens = tagListSearch
      .split(/[,\n]+/)
      .map((item) => normalizeSearchValue(item))
      .filter(Boolean)

    return inventoryCalves.filter((calf) => {
      const searchValue = normalizeSearchValue(tagSearch)
      const searchableValuesByField = {
        visualTag: [calf.primaryID, calf.visualTag],
        eid: [calf.EID, calf.eid],
        backTag: [calf.backTag, calf.originalID],
      }
      const searchableValues = (
        searchField === "all"
          ? [...searchableValuesByField.visualTag, ...searchableValuesByField.eid, ...searchableValuesByField.backTag]
          : (searchableValuesByField[searchField] || [])
      )
        .map((value) => normalizeSearchValue(value))
        .filter(Boolean)

      const matchesSingleSearch =
        !searchValue || searchableValues.some((value) => (
          searchMatchMode === "exact" ? value === searchValue : value.includes(searchValue)
        ))
      const matchesTagList = tagTokens.length === 0 || tagTokens.some((token) => (
        searchMatchMode === "exact"
          ? searchableValues.some((value) => value === token)
          : searchableValues.some((value) => value.includes(token))
      ))
      const matchesSearch = searchMode === "multiple" ? matchesTagList : matchesSingleSearch
      const matchesBreed = breedFilter.length === 0 || breedFilter.includes(calf.breed)
      const matchesSeller = sellerFilter.length === 0 || sellerFilter.includes(calf.seller)

      const calfDate = dateValue(calf)
      const matchesDateRange = isDateInDateRange(calfDate, calfDateFrom, calfDateTo)

      return matchesSearch && matchesBreed && matchesSeller && matchesDateRange
    })
  }, [inventoryCalves, searchMode, searchMatchMode, searchField, tagSearch, tagListSearch, breedFilter, sellerFilter, calfDateFrom, calfDateTo])
  const calculateDaysOnFeed = (calf) => {
    const intakeRaw = calf.dateIn || calf.placedDate
    const intakeDate = intakeRaw ? new Date(intakeRaw) : null
    const preDaysRaw = Number(calf.preDaysOnFeed)
    const preDays = Number.isFinite(preDaysRaw) ? preDaysRaw : 0

    if (!intakeDate || Number.isNaN(intakeDate.getTime())) {
      return preDays > 0 ? preDays : 0
    }

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const intakeStart = new Date(intakeDate.getFullYear(), intakeDate.getMonth(), intakeDate.getDate())
    const msDiff = todayStart.getTime() - intakeStart.getTime()
    const intakeDays = Math.floor(msDiff / (1000 * 60 * 60 * 24)) + 1
    const safeIntakeDays = Math.max(intakeDays, 1)

    return safeIntakeDays + preDays
  }
  const sortedCalves = useMemo(() => {
    if (!sortConfig.key) return filteredCalves
    const factor = sortConfig.direction === "asc" ? 1 : -1
    const normalize = (value) => {
      if (value === null || value === undefined || value === "") return ""
      if (typeof value === "number") return value
      const parsedNumber = Number(value)
      if (Number.isFinite(parsedNumber)) return parsedNumber
      const parsedDate = Date.parse(value)
      if (!Number.isNaN(parsedDate)) return parsedDate
      return String(value).toLowerCase()
    }
    const accessor = {
      primaryID: (row) => row.primaryID,
      EID: (row) => row.EID,
      breed: (row) => row.breed,
      dateIn: (row) => dateValue(row),
      daysOnFeed: (row) => calculateDaysOnFeed(row),
    }[sortConfig.key] || ((row) => row?.[sortConfig.key])

    return [...filteredCalves].sort((a, b) => {
      const aValue = normalize(accessor(a))
      const bValue = normalize(accessor(b))
      if (aValue < bValue) return -1 * factor
      if (aValue > bValue) return 1 * factor
      return 0
    })
  }, [filteredCalves, sortConfig])
  const avgDaysOnFeedFiltered = useMemo(() => {
    if (filteredCalves.length === 0) return 0
    const total = filteredCalves.reduce((sum, calf) => sum + calculateDaysOnFeed(calf), 0)
    return total / filteredCalves.length
  }, [filteredCalves])
  const avgDaysOnFeedSelected = useMemo(() => {
    const selectedCalves = inventoryCalves.filter((calf) => selectedPrimaryIDs.includes(calf.primaryID))
    if (selectedCalves.length === 0) return 0
    const total = selectedCalves.reduce((sum, calf) => sum + calculateDaysOnFeed(calf), 0)
    return total / selectedCalves.length
  }, [inventoryCalves, selectedPrimaryIDs])
  const safePickerLimit = useMemo(() => {
    const parsed = pickerRowLimit === "" ? Number.NaN : Number(pickerRowLimit)
    if (!Number.isFinite(parsed)) return 15
    return Math.max(0, Math.min(1000, parsed))
  }, [pickerRowLimit])
  const effectivePickerLimit = useMemo(
    () => (safePickerLimit === 0 ? Math.max(1, sortedCalves.length) : safePickerLimit),
    [safePickerLimit, sortedCalves.length]
  )
  const pickerTotalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedCalves.length / effectivePickerLimit)),
    [sortedCalves.length, effectivePickerLimit]
  )
  const visiblePickerCalves = useMemo(() => {
    const start = (pickerPage - 1) * effectivePickerLimit
    return sortedCalves.slice(start, start + effectivePickerLimit)
  }, [sortedCalves, pickerPage, effectivePickerLimit])
  const pickerPageStart = sortedCalves.length === 0 ? 0 : (pickerPage - 1) * effectivePickerLimit + 1
  const pickerPageEnd = Math.min(pickerPage * effectivePickerLimit, sortedCalves.length)
  const pickerPageButtons = useMemo(() => {
    const windowSize = 5
    const start = Math.max(1, pickerPage - Math.floor(windowSize / 2))
    const end = Math.min(pickerTotalPages, start + windowSize - 1)
    const adjustedStart = Math.max(1, end - windowSize + 1)
    return Array.from({ length: end - adjustedStart + 1 }, (_, idx) => adjustedStart + idx)
  }, [pickerPage, pickerTotalPages])

  useEffect(() => {
    setPickerPage(1)
  }, [searchMode, searchMatchMode, tagSearch, tagListSearch, breedFilter, sellerFilter, calfDateFrom, calfDateTo, sortConfig.key, sortConfig.direction, safePickerLimit])

  useEffect(() => {
    if (pickerPage > pickerTotalPages) {
      setPickerPage(pickerTotalPages)
    }
  }, [pickerPage, pickerTotalPages])
  useEffect(() => {
    if (!pickAllRef.current) return
    const visibleIds = visiblePickerCalves.map((calf) => calf.primaryID).filter(Boolean)
    const selectedVisibleCount = visibleIds.filter((idValue) => selectedPrimaryIDs.includes(idValue)).length
    pickAllRef.current.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length
  }, [visiblePickerCalves, selectedPrimaryIDs])

  const selectedCount = selectedPrimaryIDs.length

  const setField = (key, value) => {
    setFieldErrors((prev) => {
      if (!prev[key] && !(key === "destinationRanchID" && prev.destination) && !(key === "destinationName" && prev.destination)) {
        return prev
      }

      const next = { ...prev }
      delete next[key]
      if (key === "destinationRanchID" || key === "destinationName") {
        delete next.destination
      }
      return next
    })
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleSelectCalf = (primaryID) => {
    setSelectedPrimaryIDs((prev) => {
      const exists = prev.includes(primaryID)
      if (exists) return prev.filter((idValue) => idValue !== primaryID)
      return [...prev, primaryID]
    })
    if (pickerError) setPickerError("")
  }
  const toggleSelectAllVisible = () => {
    const visibleIds = visiblePickerCalves.map((calf) => calf.primaryID).filter(Boolean)
    if (visibleIds.length === 0) return

    const allVisibleSelected = visibleIds.every((idValue) => selectedPrimaryIDs.includes(idValue))
    setSelectedPrimaryIDs((prev) => {
      if (allVisibleSelected) {
        return prev.filter((idValue) => !visibleIds.includes(idValue))
      }
      return [...new Set([...prev, ...visibleIds])]
    })
    if (pickerError) setPickerError("")
  }

  const toggleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    ))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!token || !id) return

    const originRanchId = Number(id)
    const destinationRanchIdValue = form.destinationRanchID ? Number(form.destinationRanchID) : null
    const customDestination = String(form.destinationName || "").trim()
    const nextErrors = {}

    if (!destinationRanchIdValue && !customDestination) {
      nextErrors.destination = "Destination ranch or custom destination is required."
    }
    if (destinationRanchIdValue && destinationRanchIdValue === originRanchId) {
      nextErrors.destination = "Destination ranch cannot be the same as current ranch."
    }
    if (!form.departureDate) {
      nextErrors.departureDate = "Shipped Out Date is required."
    }

    if (selectedPrimaryIDs.length === 0) {
      setPickerError("Select at least 1 calf for the load.")
    } else {
      setPickerError("")
    }

    if (Object.keys(nextErrors).length > 0 || selectedPrimaryIDs.length === 0) {
      setFieldErrors(nextErrors)
      setMessage("")
      const firstInvalidElement =
        nextErrors.destination
          ? destinationRef.current
          : nextErrors.departureDate
            ? departureDateRef.current
            : selectedPrimaryIDs.length === 0
              ? calfPickerRef.current
              : null

      if (firstInvalidElement) {
        firstInvalidElement.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      return
    }

    try {
      setIsSubmitting(true)
      setMessage("")
      setFieldErrors({})
      setPickerError("")

      await createLoad(
        {
          originRanchID: originRanchId,
          destinationRanchID: destinationRanchIdValue,
          destinationName: customDestination || null,
          departureDate: form.departureDate,
          arrivalDate: form.arrivalDate || null,
          trucking: form.trucking || null,
          notes: form.notes || null,
          primaryIDs: selectedPrimaryIDs,
        },
        token
      )

      setMessage(`Load created with ${selectedPrimaryIDs.length} calves.`)
      showSuccess(`Load created with ${selectedPrimaryIDs.length} calves.`, "Created")
      if (onCreated) onCreated()
    } catch (error) {
      setMessage(error?.response?.data?.message || "Error creating load.")
      showError(error?.response?.data?.message || "Error creating load.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-2xl border border-primary-border/30 bg-surface p-4 h-full">
        <p className="text-xs uppercase tracking-wide text-secondary">Load settings</p>
        <p className="mt-1 text-xs text-secondary">Fields marked with <span className="text-red-600">*</span> are required. For destination, provide ranch or custom value.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div ref={destinationRef} className="scroll-mt-24">
            <label className="text-xs font-semibold text-secondary">Destination Ranch (from DB)<RequiredMark /></label>
            <select
              className={fieldClass}
              value={form.destinationRanchID}
              onChange={(e) => setField("destinationRanchID", e.target.value)}
            >
              <option value="">Select ranch (optional if custom)</option>
              {destinations
                .filter((ranch) => Number(ranch.id) !== Number(id))
                .map((ranch) => (
                <option key={ranch.id} value={ranch.id}>
                  {ranch.name}
                </option>
              ))}
            </select>
            {fieldErrors.destination && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.destination}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-secondary">Custom Destination<RequiredMark /></label>
            <input
              className={fieldClass}
              value={form.destinationName}
              onChange={(e) => setField("destinationName", e.target.value)}
              placeholder="Any extra destination not in ranches table"
            />
            {fieldErrors.destination && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.destination}</p>
            )}
          </div>
          <div ref={departureDateRef} className="scroll-mt-24">
            <label className="text-xs font-semibold text-secondary">Shipped Out Date<RequiredMark /></label>
            <input
              type="date"
              className={fieldClass}
              value={form.departureDate}
              onChange={(e) => setField("departureDate", e.target.value)}
            />
            {fieldErrors.departureDate && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.departureDate}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-secondary">Arrival Date</label>
            <input
              type="date"
              className={fieldClass}
              value={form.arrivalDate}
              onChange={(e) => setField("arrivalDate", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-secondary">Trucking</label>
            <input
              className={fieldClass}
              value={form.trucking}
              onChange={(e) => setField("trucking", e.target.value)}
              placeholder="Company / unit"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-secondary">Notes</label>
            <textarea
              className={`${fieldClass} min-h-[84px]`}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Special instructions, comments, reference numbers..."
            />
          </div>
        </div>
      </div>

      <div ref={calfPickerRef} className="scroll-mt-24 rounded-2xl border border-primary-border/30 bg-surface p-7 lg:p-8 h-full">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-primary-text">Calf picker<RequiredMark /></h3>
            <p className="text-xs text-secondary">Select calves by tag, breed, and intake date.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-action-blue/30 bg-action-blue/10 px-3 py-1 text-xs font-medium text-action-blue">
              <CheckCheck className="size-3.5" />
              {selectedCount} selected
            </div>
            <div className="inline-flex items-center rounded-full border border-primary-border/40 bg-primary-border/10 px-3 py-1 text-xs font-medium text-primary-text">
              Avg DOF (filtered): {avgDaysOnFeedFiltered.toFixed(1)}
            </div>
            <div className="inline-flex items-center rounded-full border border-primary-border/40 bg-primary-border/10 px-3 py-1 text-xs font-medium text-primary-text">
              Avg DOF (selected): {avgDaysOnFeedSelected.toFixed(1)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col xl:flex-wrap xl:flex-row xl:items-stretch gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-3 xl:flex-1 xl:min-w-[340px]">
            <SearchOptionsMenu
              searchMode={searchMode}
              searchMatch={searchMatchMode}
              searchField={searchField}
              fieldOptions={[
                { value: "all", label: "All" },
                { value: "visualTag", label: "Visual Tag" },
                { value: "eid", label: "EID" },
                { value: "backTag", label: "Back Tag" },
              ]}
              onChange={({ searchMode: nextMode, searchMatch: nextMatch, searchField: nextField }) => {
                setSearchMode(nextMode)
                setSearchMatchMode(nextMatch)
                setSearchField(nextField || "all")
              }}
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-secondary" />
              <input
                className={`${fieldClass} h-[40px] pl-9 pr-9 text-xs`}
                placeholder={getSearchPlaceholder(searchMode, searchField)}
                value={searchMode === "multiple" ? tagListSearch : tagSearch}
                onChange={(e) => {
                  if (searchMode === "multiple") {
                    setTagListSearch(e.target.value)
                    return
                  }
                  setTagSearch(e.target.value)
                }}
              />
              {(tagSearch || tagListSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setTagSearch("")
                    setTagListSearch("")
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-secondary hover:bg-primary-border/10"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            {searchMode === "multiple" && (
              <p className="sm:col-span-2 text-xs text-secondary">
                Multiple values must be separated by comma.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 xl:flex-1 xl:min-w-[500px]">
            <BreedSellerFilterMenu
              className="w-full"
              menuAlign="right"
              breed={breedFilter}
              seller={sellerFilter}
              breedOptions={breedOptions}
              sellerOptions={sellerOptions}
              onChange={({ breed, seller }) => {
                setBreedFilter(Array.isArray(breed) ? breed : (breed ? [breed] : []))
                setSellerFilter(Array.isArray(seller) ? seller : (seller ? [seller] : []))
              }}
            />
            <DateFilterMenu
              className="w-full"
              menuAlign="right"
              dateFrom={calfDateFrom}
              dateTo={calfDateTo}
              onChange={({ from, to }) => {
                setCalfDateFrom(from)
                setCalfDateTo(to)
              }}
            />
            <input
              type="number"
              max={1000}
              className={fieldClass}
              value={pickerRowLimit}
              onChange={(e) => {
                const rawValue = e.target.value
                if (rawValue === "") {
                  setPickerRowLimit("")
                  return
                }
                const nextValue = Number(rawValue)
                if (!Number.isFinite(nextValue)) return
                setPickerRowLimit(Math.max(0, Math.min(1000, nextValue)))
              }}
              placeholder="Rows"
            />
            <button
              type="button"
              onClick={() => {
                setTagSearch("")
                setTagListSearch("")
                setSearchMode("single")
                setSearchMatchMode("exact")
                setSearchField("all")
                setBreedFilter([])
                setSellerFilter([])
                setCalfDateFrom("")
                setCalfDateTo("")
                setPickerPage(1)
              }}
              className={`w-full ${pickerButtonClass}`}
            >
              Reset
            </button>
          </div>
        </div>

        {pickerError && <p className="mt-2 text-xs text-red-600">{pickerError}</p>}

        <div className="mt-4 rounded-xl border border-primary-border/30">
          <div className="max-h-[600px] overflow-y-auto overflow-x-auto overscroll-contain">
            <table className="w-full table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-primary-border/10">
              <tr>
                <th className="w-16 px-3 py-2 text-left text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      ref={pickAllRef}
                      type="checkbox"
                      onChange={toggleSelectAllVisible}
                      checked={
                        visiblePickerCalves.length > 0 &&
                        visiblePickerCalves.every((calf) => selectedPrimaryIDs.includes(calf.primaryID))
                      }
                    />
                    <span>Pick</span>
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("primaryID")}>Visual Tag <span>{sortConfig.key === "primaryID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("EID")}>EID <span>{sortConfig.key === "EID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("dateIn")}>Date In <span>{sortConfig.key === "dateIn" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("breed")}>Breed <span>{sortConfig.key === "breed" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-right text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("daysOnFeed")}>Days On Feed <span>{sortConfig.key === "daysOnFeed" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
              </tr>
            </thead>
            <tbody>
              {visiblePickerCalves.map((calf) => {
                const isSelected = selectedPrimaryIDs.includes(calf.primaryID)
                return (
                  <tr
                    key={calf.id}
                    className={`border-t border-primary-border/20 text-sm transition-colors ${
                      isSelected ? "bg-action-blue/5" : "hover:bg-primary-border/5"
                    }`}
                    onClick={() => toggleSelectCalf(calf.primaryID)}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleSelectCalf(calf.primaryID)}
                      />
                    </td>
                    <td className="px-3 py-2 truncate">{calf.primaryID || "-"}</td>
                    <td className="px-3 py-2 truncate">{calf.EID || "-"}</td>
                    <td className="px-3 py-2 truncate">{dateLabel(dateValue(calf))}</td>
                    <td className="px-3 py-2 truncate">{calf.breed ? toTitleCase(calf.breed) : "-"}</td>
                    <td className="px-3 py-2 text-right">{calculateDaysOnFeed(calf)}</td>
                  </tr>
                )
              })}
              {visiblePickerCalves.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-secondary">
                    No calves match this search.
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t border-primary-border/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-secondary">
              Showing {pickerPageStart}-{pickerPageEnd} of {sortedCalves.length}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
                onClick={() => setPickerPage(1)}
                disabled={pickerPage === 1}
              >
                First
              </button>
              <button
                type="button"
                className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
                onClick={() => setPickerPage((prev) => Math.max(1, prev - 1))}
                disabled={pickerPage === 1}
              >
                Prev
              </button>
              {pickerPageButtons.map((pageNumber) => (
                <button
                  key={`picker-page-${pageNumber}`}
                  type="button"
                  className={`rounded-lg border px-2 py-1 text-xs ${
                    pageNumber === pickerPage
                      ? "border-action-blue/80 bg-action-blue text-white"
                      : "border-primary-border/40 hover:bg-primary-border/10"
                  }`}
                  onClick={() => setPickerPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
                onClick={() => setPickerPage((prev) => Math.min(pickerTotalPages, prev + 1))}
                disabled={pickerPage === pickerTotalPages}
              >
                Next
              </button>
              <button
                type="button"
                className="rounded-lg border border-primary-border/40 px-2 py-1 text-xs disabled:opacity-50"
                onClick={() => setPickerPage(pickerTotalPages)}
                disabled={pickerPage === pickerTotalPages}
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.toLowerCase().includes("error") ? "text-red-500" : "text-emerald-600"}`}>
          {message}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl border border-action-blue/80 bg-action-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-action-blue/90 disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Create Load Order"}
        </button>
      </div>
    </form>
  )
}

export default CreateLoad
