import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Search, CheckCheck } from "lucide-react"
import { useToken } from "../../../../api/useToken"
import { getRanches } from "../../../../api/ranches"
import { getInventoryByRanch } from "../../../../api/calves"
import { createLoad } from "../../../../api/loads"
import { formatDateMMDDYYYY } from "../../../../utils/dateFormat"
import DateFilterMenu from "../../../shared/dateFilterMenu"
import BreedSellerFilterMenu from "../../../shared/breedSellerFilterMenu"

const fieldClass = "w-full rounded-xl border border-primary-border/40 bg-white px-3 py-2 text-sm text-primary-text focus:outline-none focus:ring-2 focus:ring-action-blue/30"
const dateValue = (calf) => calf.placedDate || calf.dateIn || null
const dateLabel = (value) => formatDateMMDDYYYY(value, "-")

const CreateLoad = ({ onCreated }) => {
  const { id } = useParams()
  const token = useToken()

  const [destinations, setDestinations] = useState([])
  const [inventoryCalves, setInventoryCalves] = useState([])
  const [selectedPrimaryIDs, setSelectedPrimaryIDs] = useState([])
  const [tagSearch, setTagSearch] = useState("")
  const [breedFilter, setBreedFilter] = useState("")
  const [sellerFilter, setSellerFilter] = useState("")
  const [calfDateFrom, setCalfDateFrom] = useState("")
  const [calfDateTo, setCalfDateTo] = useState("")
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  const [form, setForm] = useState({
    destinationRanchID: "",
    destinationName: "",
    departureDate: "",
    arrivalDate: "",
    trucking: "",
    notes: "",
  })

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
    return inventoryCalves.filter((calf) => {
      const haystack = `${calf.primaryID || ""} ${calf.EID || ""}`.toLowerCase()
      const matchesSearch = !tagSearch || haystack.includes(tagSearch.toLowerCase())
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
  }, [inventoryCalves, tagSearch, breedFilter, sellerFilter, calfDateFrom, calfDateTo])
  const sortedCalves = useMemo(() => {
    if (!sortConfig.key) return filteredCalves
    const factor = sortConfig.direction === "asc" ? 1 : -1
    const accessor = {
      primaryID: (row) => row.primaryID,
      EID: (row) => row.EID,
      breed: (row) => row.breed,
      dateIn: (row) => dateValue(row),
      status: (row) => row.status,
    }[sortConfig.key] || ((row) => row?.[sortConfig.key])

    return [...filteredCalves].sort((a, b) => {
      const aValue = String(accessor(a) || "").toLowerCase()
      const bValue = String(accessor(b) || "").toLowerCase()
      if (aValue < bValue) return -1 * factor
      if (aValue > bValue) return 1 * factor
      return 0
    })
  }, [filteredCalves, sortConfig])

  const selectedCount = selectedPrimaryIDs.length

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleSelectCalf = (primaryID) => {
    setSelectedPrimaryIDs((prev) => {
      const exists = prev.includes(primaryID)
      if (exists) return prev.filter((idValue) => idValue !== primaryID)
      return [...prev, primaryID]
    })
  }

  const selectTopFiltered = (limit) => {
    const candidateIDs = filteredCalves.map((calf) => calf.primaryID).filter(Boolean)
    if (!limit) {
      setSelectedPrimaryIDs(candidateIDs)
      return
    }
    setSelectedPrimaryIDs(candidateIDs.slice(0, limit))
  }

  const clearSelection = () => {
    setSelectedPrimaryIDs([])
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

    const destinationRanchIdValue = form.destinationRanchID ? Number(form.destinationRanchID) : null
    const customDestination = String(form.destinationName || "").trim()

    if ((!destinationRanchIdValue && !customDestination) || !form.departureDate) {
      setMessage("Destination (ranch or custom) and departure date are required.")
      return
    }

    if (selectedPrimaryIDs.length === 0) {
      setMessage("Select at least 1 calf for the load.")
      return
    }

    try {
      setIsSubmitting(true)
      setMessage("")

      await createLoad(
        {
          originRanchID: Number(id),
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
      <div className="rounded-2xl border border-primary-border/30 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-secondary">Load settings</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-secondary">Destination Ranch (from DB)</label>
            <select
              className={fieldClass}
              value={form.destinationRanchID}
              onChange={(e) => setField("destinationRanchID", e.target.value)}
            >
              <option value="">Select ranch (optional if custom)</option>
              {destinations.map((ranch) => (
                <option key={ranch.id} value={ranch.id}>
                  {ranch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-secondary">Custom Destination</label>
            <input
              className={fieldClass}
              value={form.destinationName}
              onChange={(e) => setField("destinationName", e.target.value)}
              placeholder="Any extra destination not in ranches table"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-secondary">Shipped Out Date*</label>
            <input
              type="date"
              className={fieldClass}
              value={form.departureDate}
              onChange={(e) => setField("departureDate", e.target.value)}
            />
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

      <div className="rounded-2xl border border-primary-border/30 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-primary-text">Calf picker</h3>
            <p className="text-xs text-secondary">Select calves by tag, breed, and intake date.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-action-blue/30 bg-action-blue/10 px-3 py-1 text-xs font-medium text-action-blue">
            <CheckCheck className="size-3.5" />
            {selectedCount} selected
          </div>
        </div>

        <div className="mt-3 flex flex-col xl:flex-row xl:items-stretch xl:justify-between gap-3">
          <div className="relative xl:w-[320px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-secondary" />
            <input
              className={`${fieldClass} pl-9`}
              placeholder="Search by Visual Tag or EID"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-[160px_160px_120px] gap-3 xl:justify-end">
            <BreedSellerFilterMenu
              className="w-full"
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
                setBreedFilter("")
                setSellerFilter("")
                setCalfDateFrom("")
                setCalfDateTo("")
              }}
              className="w-full rounded-xl border border-primary-border/40 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-primary-border/10"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectTopFiltered(50)}
            className="rounded-xl border border-primary-border/40 px-3 py-2 text-xs font-medium text-secondary hover:bg-primary-border/10"
          >
            Select 50
          </button>
          <button
            type="button"
            onClick={() => selectTopFiltered(100)}
            className="rounded-xl border border-primary-border/40 px-3 py-2 text-xs font-medium text-secondary hover:bg-primary-border/10"
          >
            Select 100
          </button>
          <button
            type="button"
            onClick={() => selectTopFiltered()}
            className="rounded-xl border border-primary-border/40 px-3 py-2 text-xs font-medium text-secondary hover:bg-primary-border/10"
          >
            Select all filtered
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-xl border border-primary-border/40 px-3 py-2 text-xs font-medium text-secondary hover:bg-primary-border/10"
          >
            Clear
          </button>
        </div>

        <div className="mt-3 max-h-[460px] overflow-y-auto rounded-xl border border-primary-border/30">
          <table className="w-full border-collapse">
            <thead className="bg-primary-border/10">
              <tr>
                <th className="w-16 px-3 py-2 text-left text-xs">Pick</th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("primaryID")}>Visual Tag <span>{sortConfig.key === "primaryID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("EID")}>EID <span>{sortConfig.key === "EID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("breed")}>Breed <span>{sortConfig.key === "breed" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("dateIn")}>Date In <span>{sortConfig.key === "dateIn" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="px-3 py-2 text-left text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("status")}>Status <span>{sortConfig.key === "status" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
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
                    <td className="px-3 py-2">{calf.primaryID || "-"}</td>
                    <td className="px-3 py-2">{calf.EID || "-"}</td>
                    <td className="px-3 py-2">{calf.breed || "-"}</td>
                    <td className="px-3 py-2">{dateLabel(dateValue(calf))}</td>
                    <td className="px-3 py-2">{calf.status || "-"}</td>
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

      {message && <p className="text-sm text-secondary">{message}</p>}

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
