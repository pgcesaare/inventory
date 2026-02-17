import { useEffect, useMemo, useRef, useState } from "react"
import { X, Pencil, Trash2, ArrowUpDown } from "lucide-react"
import { DetailPanelTimelineSkeleton } from "../shared/loadingSkeletons"

const CalfDetailPanel = ({
  selectedCalf,
  detailRows = [],
  movementHistory,
  loadingHistory,
  onClose,
  onEdit,
  onDelete,
  formatDate,
}) => {
  const [selectedLoadEventKey, setSelectedLoadEventKey] = useState(null)
  const [timelineSortDirection, setTimelineSortDirection] = useState("asc")
  const selectedLoadDetailsRef = useRef(null)

  useEffect(() => {
    setSelectedLoadEventKey(null)
  }, [selectedCalf?.id, movementHistory?.events])

  useEffect(() => {
    if (!selectedLoadEventKey || !selectedLoadDetailsRef.current) return
    selectedLoadDetailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [selectedLoadEventKey])

  const orderedEvents = useMemo(() => {
    const events = (Array.isArray(movementHistory?.events) ? movementHistory.events : []).filter((event) => {
      if (event?.type !== "load_transfer") return true
      const loadId = Number(event?.loadID)
      return Number.isFinite(loadId) && loadId > 0
    })
    const typePriority = {
      intake: 0,
      ranch_transfer: 1,
      load_transfer: 2,
      shipped_out: 3,
      death: 4,
    }

    const toTime = (value) => {
      if (!value) return Number.POSITIVE_INFINITY
      const parsed = new Date(value).getTime()
      return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
    }

    const sorted = [...events].sort((a, b) => {
      const aTime = toTime(a?.date || a?.departureDate || a?.arrivalDate)
      const bTime = toTime(b?.date || b?.departureDate || b?.arrivalDate)
      if (aTime !== bTime) return aTime - bTime

      const aPriority = typePriority[a?.type] ?? 99
      const bPriority = typePriority[b?.type] ?? 99
      if (aPriority !== bPriority) return aPriority - bPriority

      const aMovementID = Number(a?.movementID || 0)
      const bMovementID = Number(b?.movementID || 0)
      if (aMovementID !== bMovementID) return aMovementID - bMovementID

      const aLoadID = Number(a?.loadID || 0)
      const bLoadID = Number(b?.loadID || 0)
      return aLoadID - bLoadID
    })
    return timelineSortDirection === "desc" ? [...sorted].reverse() : sorted
  }, [movementHistory?.events, timelineSortDirection])

  if (!selectedCalf && !loadingHistory && !movementHistory) return null

  const formatTimestamp = (value) => {
    if (!value) return "N/A"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "N/A"
    return parsed.toLocaleString()
  }
  const toTitleCaseWords = (value) => String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[A-Z0-9-]+$/.test(word) && !/[a-z]/.test(word) && word.length <= 4) return word
      return word
        .toLowerCase()
        .replace(/(^|[-_/])([a-z0-9])/g, (_, prefix, char) => `${prefix}${char.toUpperCase()}`)
    })
    .join(" ")
  const formatDisplayValue = (value) => {
    if (value === null || value === undefined) return "-"
    if (typeof value !== "string") return value

    const raw = value.trim()
    if (!raw || raw === "-" || raw === "N/A") return raw || "-"

    // Keep numeric-like, currency-like, and date-like strings untouched.
    if (/^\$?[\d,]+(\.\d+)?$/.test(raw)) return raw
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}(,.*)?$/.test(raw)) return raw
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw

    return toTitleCaseWords(raw)
  }
  const formatEventType = (value) => {
    const normalized = String(value || "").replace(/_/g, " ")
    return formatDisplayValue(normalized)
  }
  const infoCardClass = "rounded-lg border border-primary-border/55 bg-primary-border/10 p-3 shadow-sm"
  const timelineCardClass = "w-full rounded-2xl border border-primary-border/60 bg-gradient-to-br from-surface to-primary-border/10 p-3.5 text-left shadow-sm transition-all duration-150"
  const getEventKey = (event, index) => (
    `${event.type || "event"}:${event.loadID || "no-load"}:${event.movementID || "no-move"}:${event.date || index}`
  )
  const getEventPresentation = (event) => {
    const type = String(event?.type || "").toLowerCase()
    if (type === "intake") {
      return {
        title: "Calf Intake",
        badge: "Intake",
        dotClass: "bg-emerald-500",
        badgeClass: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/25 dark:text-emerald-200",
      }
    }
    if (type === "load_transfer") {
      return {
        title: `Load #${event?.loadID || "-"} Transfer`,
        badge: "Load Transfer",
        dotClass: "bg-sky-500",
        badgeClass: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700/60 dark:bg-sky-900/25 dark:text-sky-200",
      }
    }
    if (type === "ranch_transfer") {
      return {
        title: "Ranch Transfer",
        badge: "Ranch Transfer",
        dotClass: "bg-indigo-500",
        badgeClass: "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-700/60 dark:bg-indigo-900/25 dark:text-indigo-200",
      }
    }
    if (type === "shipped_out") {
      return {
        title: "Shipped Out",
        badge: "Shipped",
        dotClass: "bg-amber-500",
        badgeClass: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/25 dark:text-amber-200",
      }
    }
    if (type === "death") {
      return {
        title: "Death",
        badge: "Death",
        dotClass: "bg-red-500",
        badgeClass: "border-red-300 bg-red-50 text-red-800 dark:border-red-700/60 dark:bg-red-900/25 dark:text-red-200",
      }
    }
    return {
      title: formatEventType(type || "event"),
      badge: "Event",
      dotClass: "bg-primary-text",
      badgeClass: "border-primary-border/60 bg-surface text-primary-text",
    }
  }

  const selectedLoadEvent = orderedEvents.find((event, index) => {
    const eventKey = getEventKey(event, index)
    return eventKey === selectedLoadEventKey
  })

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        onClick={onClose}
      />

      <aside className="
        absolute right-0 top-0 h-full
        w-[94%] sm:w-[78%] lg:w-[48%] xl:w-[40%]
        bg-surface border-l border-primary-border/40 shadow-2xl
        pointer-events-auto
        animate-in slide-in-from-right duration-300
        overflow-y-auto
      ">
        <div className="sticky top-0 z-10 bg-surface border-b border-primary-border/30 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-primary-text">
              Calf Detail {selectedCalf?.visualTag ? `- ${selectedCalf.visualTag}` : ""}
            </h3>
            <p className="text-xs text-secondary">Inventory profile and movement timeline</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-primary-border/40 hover:bg-primary-border/10 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="text-xs">Edit</span>
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800/70 dark:text-red-300 dark:hover:bg-red-900/20 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-xs">Delete</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full border border-primary-border/40 hover:bg-primary-border/10 cursor-pointer"
            >
              <X className="h-4 w-4 text-primary-text" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-6">
          <section>
            <h4 className="text-xs uppercase tracking-wide font-semibold text-secondary">Calf Information</h4>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {detailRows.map((item) => (
                <div key={item.label} className={infoCardClass}>
                  <p className="text-[11px] uppercase tracking-wide text-secondary">{item.label}</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{formatDisplayValue(item.value)}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wide font-semibold text-secondary">Movement Timeline</h4>
              <button
                type="button"
                onClick={() => setTimelineSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="inline-flex items-center gap-1 rounded-md border border-primary-border/60 bg-primary-border/10 px-2 py-1 text-xs font-medium text-primary-text hover:bg-primary-border/20"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {timelineSortDirection === "asc" ? "Oldest First" : "Newest First"}
              </button>
            </div>

            {loadingHistory && <DetailPanelTimelineSkeleton />}

            {!loadingHistory && orderedEvents.length === 0 && (
              <div className="mt-3 rounded-xl border border-primary-border/40 bg-primary-border/10 px-3 py-4 text-sm text-secondary">
                No movement events found for this calf.
              </div>
            )}

            {!loadingHistory && orderedEvents.length > 0 && (
              <div className="mt-4 relative">
                <div className="absolute left-[8px] top-1 bottom-1 w-px bg-primary-border/70" />
                <div className="space-y-4">
                  {orderedEvents.map((event, index) => {
                    const eventKey = getEventKey(event, index)
                    const isLoadEvent = Boolean(event.loadID)
                    const isSelected = selectedLoadEventKey === eventKey
                    const eventMeta = getEventPresentation(event)
                    const eventDateLabel = event.departureDate
                      ? `Departure: ${formatDate(event.departureDate)}`
                      : formatDate(event.date)
                    return (
                    <div key={eventKey} className="group relative pl-8">
                      <span className={`absolute left-0 top-2 h-4 w-4 rounded-full border-2 border-surface shadow ${eventMeta.dotClass}`} />
                      <button
                        type="button"
                        onClick={() => {
                          if (!isLoadEvent) return
                          setSelectedLoadEventKey(eventKey)
                        }}
                        className={`${timelineCardClass} ${
                          isLoadEvent ? "cursor-pointer hover:-translate-y-0.5 hover:border-action-blue/50 hover:shadow-md" : "cursor-default"
                        } ${
                          isSelected ? "border-action-blue/70 bg-action-blue/10 shadow-md ring-1 ring-action-blue/40" : ""
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${eventMeta.badgeClass}`}>
                              {eventMeta.badge}
                            </span>
                            {isLoadEvent && (
                              <span className="inline-flex items-center rounded-full border border-primary-border/60 bg-surface px-2 py-0.5 text-[11px] font-medium text-primary-text">
                                Load #{event.loadID}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-secondary">{eventDateLabel}</p>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-primary-text">{eventMeta.title}</p>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-secondary sm:grid-cols-2">
                          <p className="rounded-lg border border-primary-border/40 bg-surface/80 px-2.5 py-1.5">
                            <span className="text-[11px] uppercase tracking-wide text-secondary">From</span>
                            <span className="mt-0.5 block text-primary-text font-medium">{formatDisplayValue(event.fromRanch?.name || "-")}</span>
                          </p>
                          <p className="rounded-lg border border-primary-border/40 bg-surface/80 px-2.5 py-1.5">
                            <span className="text-[11px] uppercase tracking-wide text-secondary">To</span>
                            <span className="mt-0.5 block text-primary-text font-medium">{formatDisplayValue(event.toRanch?.name || "-")}</span>
                          </p>
                          {(event.fromStatus || event.toStatus) && (
                            <p className="rounded-lg border border-primary-border/40 bg-surface/80 px-2.5 py-1.5 sm:col-span-2">
                              <span className="text-[11px] uppercase tracking-wide text-secondary">Status</span>
                              <span className="mt-0.5 block text-primary-text font-medium">{formatDisplayValue(event.fromStatus || "-")} {"->"} {formatDisplayValue(event.toStatus || "-")}</span>
                            </p>
                          )}
                          {event.arrivalDate && (
                            <p className="rounded-lg border border-primary-border/40 bg-surface/80 px-2.5 py-1.5">
                              <span className="text-[11px] uppercase tracking-wide text-secondary">Arrival</span>
                              <span className="mt-0.5 block text-primary-text font-medium">{formatDate(event.arrivalDate)}</span>
                            </p>
                          )}
                          {event.loadCreatedAt && (
                            <p className="rounded-lg border border-primary-border/40 bg-surface/80 px-2.5 py-1.5">
                              <span className="text-[11px] uppercase tracking-wide text-secondary">Load Created</span>
                              <span className="mt-0.5 block text-primary-text font-medium">{formatTimestamp(event.loadCreatedAt)}</span>
                            </p>
                          )}
                          {event.notes && (
                            <p className="rounded-lg border border-primary-border/40 bg-surface/80 px-2.5 py-1.5 sm:col-span-2">
                              <span className="text-[11px] uppercase tracking-wide text-secondary">Notes</span>
                              <span className="mt-0.5 block text-primary-text">{formatDisplayValue(event.notes)}</span>
                            </p>
                          )}
                        </div>
                        {isLoadEvent && (
                          <p className={`mt-3 text-[11px] font-medium ${isSelected ? "text-action-blue" : "text-secondary group-hover:text-action-blue"}`}>
                            {isSelected ? "Load details selected below" : "Click to open load details"}
                          </p>
                        )}
                      </button>
                    </div>
                  )})}
                </div>
              </div>
            )}
          </section>

          {!loadingHistory && selectedLoadEvent?.loadID && (
            <section ref={selectedLoadDetailsRef}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase tracking-wide font-semibold text-secondary">Selected Load Details</h4>
                <button
                  type="button"
                  className="text-xs text-secondary underline cursor-pointer"
                  onClick={() => setSelectedLoadEventKey(null)}
                >
                  Clear
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={infoCardClass}>
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Load ID</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{selectedLoadEvent.loadID}</p>
                </div>
                <div className={infoCardClass}>
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Movement Type</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{formatEventType(selectedLoadEvent.type || "-")}</p>
                </div>
                <div className={infoCardClass}>
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Origin</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{formatDisplayValue(selectedLoadEvent.fromRanch?.name || "-")}</p>
                </div>
                <div className={infoCardClass}>
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Destination</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{formatDisplayValue(selectedLoadEvent.toRanch?.name || "-")}</p>
                </div>
                <div className={infoCardClass}>
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Departure</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">
                    {selectedLoadEvent.departureDate ? formatDate(selectedLoadEvent.departureDate) : formatDate(selectedLoadEvent.date)}
                  </p>
                </div>
                <div className={infoCardClass}>
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Arrival</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{formatDate(selectedLoadEvent.arrivalDate)}</p>
                </div>
                <div className={`${infoCardClass} sm:col-span-2`}>
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Load Created At</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{formatTimestamp(selectedLoadEvent.loadCreatedAt)}</p>
                </div>
                <div className={`${infoCardClass} sm:col-span-2`}>
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Notes</p>
                  <p className="mt-1 text-sm text-primary-text">{formatDisplayValue(selectedLoadEvent.notes || "-")}</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  )
}

export default CalfDetailPanel
