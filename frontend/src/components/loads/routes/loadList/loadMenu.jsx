import { useEffect, useMemo, useRef, useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import { useAppContext } from "../../../../context"
import CreateLoadBtn from "../../createLoadBtn"
import DateFilterMenu from "../../../shared/dateFilterMenu"

const uniqueOptions = (values) => [...new Set(values.filter(Boolean))]

const LocationFilterMenu = ({ destination, city, state, destinationOptions, cityOptions, stateOptions, onChange, className = "" }) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const label = useMemo(() => {
    const parts = []
    if (destination) parts.push(`Destination: ${destination}`)
    if (city) parts.push(`City: ${city}`)
    if (state) parts.push(`State: ${state}`)
    if (parts.length === 0) return "Filter"
    return parts.join(" | ")
  }, [destination, city, state])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        className="h-full min-h-[40px] w-full inline-flex items-center justify-between gap-2 rounded-xl border border-primary-border/40 px-3 py-1.5 text-xs text-left hover:bg-primary-border/10"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate">{label}</span>
        <SlidersHorizontal className="size-4 text-secondary shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 z-30 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-primary-border/30 bg-white p-3 shadow-lg">
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">Destination</label>
              <select
                className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                value={destination || ""}
                onChange={(e) => onChange({ destination: e.target.value, city, state })}
              >
                <option value="">All destinations</option>
                {destinationOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">City</label>
              <select
                className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                value={city || ""}
                onChange={(e) => onChange({ destination, city: e.target.value, state })}
              >
                <option value="">All cities</option>
                {cityOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-secondary uppercase tracking-wide">State</label>
              <select
                className="mt-1 w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs"
                value={state || ""}
                onChange={(e) => onChange({ destination, city, state: e.target.value })}
              >
                <option value="">All states</option>
                {stateOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="w-full rounded-lg border border-primary-border/40 px-3 py-2 text-xs hover:bg-primary-border/10"
              onClick={() => onChange({ destination: "", city: "", state: "" })}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const LoadMenu = ({ data, resultsCount, onOpen }) => {
  const { selected, setSelected } = useAppContext()

  const destinationOptions = useMemo(() => uniqueOptions(data.map((item) => item.destination)), [data])
  const cityOptions = useMemo(() => uniqueOptions(data.map((item) => item.city)), [data])
  const stateOptions = useMemo(() => uniqueOptions(data.map((item) => item.state)), [data])

  const hasFilters = Boolean(
    selected.destination ||
      selected.city ||
      selected.state ||
      selected.date ||
      selected.dateFrom ||
      selected.dateTo
  )

  return (
    <div className="rounded-2xl border border-primary-border/30 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary">{resultsCount} result(s)</span>
        </div>
        <div className="flex items-center gap-2">
          <LocationFilterMenu
            className="w-[170px]"
            destination={selected.destination || ""}
            city={selected.city || ""}
            state={selected.state || ""}
            destinationOptions={destinationOptions}
            cityOptions={cityOptions}
            stateOptions={stateOptions}
            onChange={({ destination, city, state }) =>
              setSelected((prev) => ({ ...prev, destination, city, state }))
            }
          />
          <DateFilterMenu
            className="w-[170px]"
            dateFrom={selected.dateFrom || selected.date || ""}
            dateTo={selected.dateTo || selected.date || ""}
            onChange={({ from, to }) => {
              const isSingle = from && to && from === to
              setSelected((prev) => ({
                ...prev,
                date: isSingle ? from : "",
                dateFrom: from,
                dateTo: to,
              }))
            }}
          />
          {hasFilters && (
            <button
              type="button"
              onClick={() =>
                setSelected((prev) => ({
                  ...prev,
                  destination: "",
                  city: "",
                  state: "",
                  date: "",
                  dateFrom: "",
                  dateTo: "",
                }))
              }
              className="h-full min-h-[40px] rounded-xl border border-primary-border/40 px-3 py-1.5 text-xs hover:bg-primary-border/10"
            >
              Reset
            </button>
          )}
          <CreateLoadBtn onOpen={onOpen} />
        </div>
      </div>
    </div>
  )
}

export default LoadMenu
