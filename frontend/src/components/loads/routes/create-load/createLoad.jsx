import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { Search, CheckCheck } from "lucide-react"
import { useToken } from "../../../../api/useToken"
import { getRanches } from "../../../../api/ranches"
import { getInventoryByRanch } from "../../../../api/calves"
import { createLoad } from "../../../../api/loads"
import { formatDateMMDDYYYY } from "../../../../utils/dateFormat"
import DateFilterMenu from "../../../shared/dateFilterMenu"
import BreedSellerFilterMenu from "../../../shared/breedSellerFilterMenu"

const fieldClass = "w-full rounded-xl border border-primary-border/40 bg-surface px-3 py-2 text-sm text-primary-text focus:outline-none focus:ring-2 focus:ring-action-blue/30"
const pickerButtonClass = "h-[36px] rounded-xl border border-primary-border/40 px-3 text-xs font-medium text-secondary hover:bg-primary-border/10 transition-colors"
const dateValue = (calf) => calf.placedDate || calf.dateIn || null
const dateLabel = (value) => formatDateMMDDYYYY(value, "-")
const RequiredMark = () => <span className="ml-0.5 text-red-600">*</span>
const toTitleCase = (value) => String(value || "").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())

const CreateLoad = ({ onCreated }) => {
  const { id } = useParams()
  const token = useToken()

  const [destinations, setDestinations] = useState([])
  const [inventoryCalves, setInventoryCalves] = useState([])
  const [selectedPrimaryIDs, setSelectedPrimaryIDs] = useState([])
  const [searchMode, setSearchMode] = useState("single")
  const [tagSearch, setTagSearch] = useState("")
  const [tagListSearch, setTagListSearch] = useState("")
  const [breedFilter, setBreedFilter] = useState("")
  const [sellerFilter, setSellerFilter] = useState("")
  const [calfDateFrom, setCalfDateFrom] = useState("")
  const [calfDateTo, setCalfDateTo] = useState("")
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" })
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
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)

    return inventoryCalves.filter((calf) => {
      const primary = String(calf.primaryID || "").trim().toLowerCase()
      const eid = String(calf.EID || "").trim().toLowerCase()
      const searchValue = String(tagSearch || "").trim().toLowerCase()

      const matchesSingleSearch =
        !searchValue || primary === searchValue || eid === searchValue
      const matchesTagList =
        tagTokens.length === 0 || tagTokens.some((token) => primary === token || eid === token)
      const matchesSearch = searchMode === "list" ? matchesTagList : matchesSingleSearch
      const matchesBreed = !breedFilter || calf.breed === breedFilter
      const matchesSeller = !sellerFilter || calf.seller === sellerFilter

      const calfDate = dateValue(calf)
      const dateMs = calfDate ? new Date(calfDate).getTime() : null
      const fromMs = calfDateFrom ? new Date(calfDateFrom).getTime() : null
      const toMs = calfDateTo ? new Date(calfDateTo).getTime() : null

      const matchesDateFrom = fromMs === null || (dateMs !== null && dateMs >= fromMs)
      const matchesDateTo = toMs === null || (dateMs !== null && dateMs <= toMs + 86399999)

      return matchesSearch && matchesBreed && matchesSeller && matchesDateFrom && matchesDateTo
    })
  }, [inventoryCalves, searchMode, tagSearch, tagListSearch, breedFilter, sellerFilter, calfDateFrom, calfDateTo])
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
      if (onCreated) onCreated()
    } catch (error) {
      setMessage(error?.response?.data?.message || "Error creating load.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-2xl border border-primary-border/30 bg-surface p-4">
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

      <div ref={calfPickerRef} className="scroll-mt-24 rounded-2xl border border-primary-border/30 bg-surface p-7 lg:p-8">
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
          </div>
        </div>

        <div className="mt-4 flex flex-col xl:flex-row xl:items-stretch gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-[170px_minmax(0,1fr)] gap-3 xl:flex-1 xl:min-w-0">
            <select
              className={fieldClass}
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value)}
            >
              <option value="single">Single Tag</option>
              <option value="list">Comma Tags</option>
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-secondary" />
              <input
                className={`${fieldClass} pl-9`}
                placeholder={searchMode === "list" ? "TAG-001, TAG-002, TAG-003" : "Search by Visual Tag or EID"}
                value={searchMode === "list" ? tagListSearch : tagSearch}
                onChange={(e) => {
                  if (searchMode === "list") {
                    setTagListSearch(e.target.value)
                    return
                  }
                  setTagSearch(e.target.value)
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px] gap-3 xl:flex-1 xl:min-w-0">
            <BreedSellerFilterMenu
              className="w-full"
              menuAlign="right"
              breed={breedFilter}
              seller={sellerFilter}
              breedOptions={breedOptions}
              sellerOptions={sellerOptions}
              onChange={({ breed, seller }) => {
                setBreedFilter(breed ?? "")
                setSellerFilter(seller ?? "")
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
            <button
              type="button"
              onClick={() => {
                setTagSearch("")
                setTagListSearch("")
                setBreedFilter("")
                setSellerFilter("")
                setCalfDateFrom("")
                setCalfDateTo("")
              }}
              className={`w-full ${pickerButtonClass}`}
            >
              Reset
            </button>
          </div>
        </div>

        {pickerError && <p className="mt-2 text-xs text-red-600">{pickerError}</p>}

        <div className="mt-4 rounded-xl border border-primary-border/30">
          <table className="w-full table-fixed border-collapse">
            <thead className="bg-primary-border/10">
              <tr>
                <th className="w-16 px-3 py-2 text-left text-xs">Pick</th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("primaryID")}>Visual Tag <span>{sortConfig.key === "primaryID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("EID")}>EID <span>{sortConfig.key === "EID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("dateIn")}>Date In <span>{sortConfig.key === "dateIn" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("breed")}>Breed <span>{sortConfig.key === "breed" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-right text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("daysOnFeed")}>Days On Feed <span>{sortConfig.key === "daysOnFeed" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
              </tr>
            </thead>
            <tbody>
              {sortedCalves.map((calf) => {
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
              {sortedCalves.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-secondary">
                    No calves match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
