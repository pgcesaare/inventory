import { useMemo, useState } from "react"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import { Calendar, ClipboardList, Truck, MapPinned, PackageCheck } from "lucide-react"

dayjs.extend(utc)

const formatDate = (value) => {
  if (!value) return "N/A"
  return dayjs.utc(value).format("MM/DD/YYYY")
}

const LoadDetails = ({ load }) => {
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" })
  const sortedCalves = useMemo(() => {
    const source = load?.calves || []
    if (!sortConfig.key) return source
    const factor = sortConfig.direction === "asc" ? 1 : -1
    return [...source].sort((a, b) => {
      const aValue = String(a?.[sortConfig.key] || "").toLowerCase()
      const bValue = String(b?.[sortConfig.key] || "").toLowerCase()
      if (aValue < bValue) return -1 * factor
      if (aValue > bValue) return 1 * factor
      return 0
    })
  }, [load?.calves, sortConfig])

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
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              isPending
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
            }`}
          >
            {isPending ? "In transit" : "Arrived"}
          </span>
        </div>
      </div>

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
        <div className="max-h-[320px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="bg-primary-border/5">
              <tr>
                <th className="text-left px-3 py-2 text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("primaryID")}>Visual Tag <span>{sortConfig.key === "primaryID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="text-left px-3 py-2 text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("EID")}>EID <span>{sortConfig.key === "EID" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
                <th className="text-left px-3 py-2 text-xs"><button type="button" className="inline-flex items-center gap-1 cursor-pointer" onClick={() => toggleSort("status")}>Status <span>{sortConfig.key === "status" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}</span></button></th>
              </tr>
            </thead>
            <tbody>
              {sortedCalves.map((calf) => (
                <tr key={calf.id || calf.primaryID} className="border-t border-primary-border/20 hover:bg-primary-border/5">
                  <td className="px-3 py-2 text-sm">{calf.primaryID || "-"}</td>
                  <td className="px-3 py-2 text-sm">{calf.EID || "-"}</td>
                  <td className="px-3 py-2 text-sm">{calf.status || "-"}</td>
                </tr>
              ))}
              {sortedCalves.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-sm text-secondary text-center">
                    No calves associated.
                  </td>
                </tr>
              )}
            </tbody>
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
          <div className="inline-flex items-center gap-1.5 sm:col-span-2">
            <PackageCheck className="size-3.5" />
            Head count recorded: {load.headCount || 0}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadDetails
