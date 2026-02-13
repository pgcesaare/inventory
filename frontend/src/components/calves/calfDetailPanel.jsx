import { useEffect, useMemo, useRef, useState } from "react"
import { X, Pencil, Trash2 } from "lucide-react"
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
  const selectedLoadDetailsRef = useRef(null)

  useEffect(() => {
    setSelectedLoadEventKey(null)
  }, [selectedCalf?.id, movementHistory?.events])

  useEffect(() => {
    if (!selectedLoadEventKey || !selectedLoadDetailsRef.current) return
    selectedLoadDetailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [selectedLoadEventKey])

  const orderedEvents = useMemo(() => {
    const events = Array.isArray(movementHistory?.events) ? movementHistory.events : []
    const typePriority = {
      intake: 0,
      ranch_transfer: 1,
      load_transfer: 2,
      shipped_out: 3,
      status_change: 4,
      death: 5,
    }

    const toTime = (value) => {
      if (!value) return Number.POSITIVE_INFINITY
      const parsed = new Date(value).getTime()
      return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
    }

    return [...events].sort((a, b) => {
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
  }, [movementHistory?.events])

  if (!selectedCalf && !loadingHistory && !movementHistory) return null

  const selectedLoadEvent = orderedEvents.find((event, index) => {
    const eventKey = `${event.type}-${event.loadID || index}`
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
        bg-white border-l border-primary-border/40 shadow-2xl
        pointer-events-auto
        animate-in slide-in-from-right duration-300
        overflow-y-auto
      ">
        <div className="sticky top-0 z-10 bg-white border-b border-primary-border/30 px-5 py-4 flex items-center justify-between">
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
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-red-300 text-red-600 hover:bg-red-50 cursor-pointer"
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
                <div key={item.label} className="rounded-lg border border-primary-border/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-secondary">{item.label}</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wide font-semibold text-secondary">Movement Timeline</h4>
            </div>

            {loadingHistory && <DetailPanelTimelineSkeleton />}

            {!loadingHistory && orderedEvents.length === 0 && (
              <p className="mt-3 text-sm text-secondary">No movement events found for this calf.</p>
            )}

            {!loadingHistory && orderedEvents.length > 0 && (
              <div className="mt-4 relative">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-primary-border/40" />
                <div className="space-y-5">
                  {orderedEvents.map((event, index) => {
                    const eventKey = `${event.type}-${event.loadID || index}`
                    const isLoadEvent = Boolean(event.loadID)
                    const isSelected = selectedLoadEventKey === eventKey
                    return (
                    <div key={eventKey} className="relative pl-8">
                      <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full bg-action-blue border-2 border-white shadow" />
                      <button
                        type="button"
                        onClick={() => {
                          if (!isLoadEvent) return
                          setSelectedLoadEventKey(eventKey)
                        }}
                        className={`w-full rounded-xl border p-3 text-left ${
                          isLoadEvent ? "cursor-pointer hover:bg-primary-border/5" : "cursor-default"
                        } ${
                          isSelected ? "border-action-blue/60 bg-action-blue/5" : "border-primary-border/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-primary-text">
                            {event.type === "intake" && "Calf Intake"}
                            {event.type === "load_transfer" && `Load #${event.loadID || "-"} Transfer`}
                            {event.type === "ranch_transfer" && "Ranch Transfer"}
                            {event.type === "status_change" && "Status Change"}
                            {event.type === "death" && "Death"}
                            {event.type === "shipped_out" && "Shipped Out"}
                          </p>
                          <p className="text-xs text-secondary">
                            {event.departureDate
                              ? `Departure: ${formatDate(event.departureDate)}`
                              : formatDate(event.date)}
                          </p>
                        </div>

                        <div className="mt-2 text-sm text-secondary space-y-1">
                          <p>
                            From: <span className="text-primary-text font-medium">{event.fromRanch?.name || "-"}</span>
                          </p>
                          <p>
                            To: <span className="text-primary-text font-medium">{event.toRanch?.name || "-"}</span>
                          </p>
                          {(event.fromStatus || event.toStatus) && (
                            <p>
                              Status: <span className="text-primary-text font-medium">{event.fromStatus || "-"} {"->"} {event.toStatus || "-"}</span>
                            </p>
                          )}
                          {event.arrivalDate && (
                            <p>
                              Arrival: <span className="text-primary-text font-medium">{formatDate(event.arrivalDate)}</span>
                            </p>
                          )}
                          {event.notes && (
                            <p>
                              Notes: <span className="text-primary-text">{event.notes}</span>
                            </p>
                          )}
                        </div>
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
                <div className="rounded-lg border border-primary-border/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Load ID</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{selectedLoadEvent.loadID}</p>
                </div>
                <div className="rounded-lg border border-primary-border/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Movement Type</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{selectedLoadEvent.type || "-"}</p>
                </div>
                <div className="rounded-lg border border-primary-border/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Origin</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{selectedLoadEvent.fromRanch?.name || "-"}</p>
                </div>
                <div className="rounded-lg border border-primary-border/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Destination</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{selectedLoadEvent.toRanch?.name || "-"}</p>
                </div>
                <div className="rounded-lg border border-primary-border/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Departure</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">
                    {selectedLoadEvent.departureDate ? formatDate(selectedLoadEvent.departureDate) : formatDate(selectedLoadEvent.date)}
                  </p>
                </div>
                <div className="rounded-lg border border-primary-border/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Arrival</p>
                  <p className="mt-1 text-sm text-primary-text font-medium">{formatDate(selectedLoadEvent.arrivalDate)}</p>
                </div>
                <div className="rounded-lg border border-primary-border/20 p-3 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-secondary">Notes</p>
                  <p className="mt-1 text-sm text-primary-text">{selectedLoadEvent.notes || "-"}</p>
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
