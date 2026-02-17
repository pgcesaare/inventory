import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import {
  Calendar,
  MoveUpRight,
  MoveDownLeft,
  MapPin,
  ChevronRight,
  Truck,
  NotebookPen,
} from "lucide-react"

dayjs.extend(utc)

const LoadCard = ({
  loadId,
  destination,
  departureDate,
  arrivalDate,
  city,
  state,
  headCount,
  trucking,
  notes,
  shippedOutDate,
  shippedTo,
  direction = "sent",
  status = "in_transit",
  onView,
  onEdit,
  onMarkArrived,
  canMarkArrived = false,
  isMarkingArrived = false,
  isActive = false,
}) => {
  const safeDateLabel = (value, fallback = "N/A") => {
    if (!value) return fallback
    const parsed = dayjs.utc(value)
    return parsed.isValid() ? parsed.format("MM/DD/YYYY") : fallback
  }
  const arrivalMoment = arrivalDate ? dayjs.utc(arrivalDate) : null
  const hasValidArrival = Boolean(arrivalMoment && arrivalMoment.isValid())
  const formattedDepartureDate = safeDateLabel(departureDate, "-")
  const formattedArrivalDate = hasValidArrival ? safeDateLabel(arrivalDate) : "Pending"
  const formattedShippedOut = safeDateLabel(shippedOutDate)
  const isReceived = String(direction || "").toLowerCase() === "received"
  const directionLabel = isReceived ? "Received" : "Sent"
  const directionClass = isReceived
    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/25 dark:text-emerald-200"
    : "border-action-blue/30 bg-action-blue/10 text-action-blue dark:border-action-blue/60 dark:bg-action-blue/20 dark:text-action-blue-light"
  const normalizedStatus = String(status || "").toLowerCase()
  const statusMap = {
    draft: {
      label: "Draft",
      className: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200",
    },
    in_transit: {
      label: "In Transit",
      className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/25 dark:text-amber-200",
    },
    arrived: {
      label: "Arrived",
      className: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/25 dark:text-emerald-200",
    },
    canceled: {
      label: "Canceled",
      className: "border-red-300 bg-red-50 text-red-700 dark:border-red-700/60 dark:bg-red-900/25 dark:text-red-200",
    },
  }
  const statusBadge = statusMap[normalizedStatus] || statusMap.in_transit
  const counterpartyName = shippedTo || destination || "-"
  const DirectionIcon = isReceived ? MoveDownLeft : MoveUpRight
  const directionAccentClass = isReceived ? "bg-emerald-500" : "bg-action-blue"

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border p-4 pl-5 transition-all duration-200 cursor-pointer ${
        isActive
          ? "border-action-blue/55 bg-action-blue/[0.03] shadow-[0_14px_28px_-20px_rgba(20,72,155,0.55)]"
          : "border-primary-border/40 bg-surface hover:border-action-blue/35 hover:shadow-[0_14px_28px_-20px_rgba(15,23,42,0.45)]"
      }`}
    >
      <span className={`absolute bottom-0 left-0 top-0 w-1.5 ${directionAccentClass}`} />

      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {Number.isFinite(Number(loadId)) && (
              <span className="inline-flex items-center rounded-full border border-primary-border/60 bg-surface px-2 py-0.5 text-[11px] font-semibold text-primary-text">
                Load #{loadId}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${directionClass}`}>
              <DirectionIcon className="size-3" />
              {directionLabel}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>
          <h3 className="mt-1 text-base font-semibold text-primary-text truncate">
            {destination || "Unknown ranch"}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-xs text-secondary">
            <MapPin className="size-3" />
            <span>{city && state ? `${city}, ${state}` : city || state || "Location unavailable"}</span>
          </div>
        </div>
        <div className="shrink-0 rounded-xl border border-primary-border/45 bg-surface px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wide text-secondary">Headcount</p>
          <p className="text-lg font-semibold leading-tight text-primary-text">{headCount || 0}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg border border-primary-border/40 bg-surface/80 px-2.5 py-2 text-secondary">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-secondary">
            <Calendar className="size-3" />
            Departure
          </p>
          <p className="mt-0.5 font-semibold text-primary-text">{formattedDepartureDate}</p>
        </div>
        <div className="rounded-lg border border-primary-border/40 bg-surface/80 px-2.5 py-2 text-secondary">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-secondary">
            <Calendar className="size-3" />
            Arrival
          </p>
          <p className={`mt-0.5 font-semibold ${formattedArrivalDate === "Pending" ? "text-amber-700 dark:text-amber-300" : "text-primary-text"}`}>
            {formattedArrivalDate}
          </p>
        </div>
        <div className="rounded-lg border border-primary-border/40 bg-surface/80 px-2.5 py-2 text-secondary">
          <p className="text-[10px] uppercase tracking-wide text-secondary">Shipped Out</p>
          <p className="mt-0.5 font-semibold text-primary-text">{formattedShippedOut}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-primary-border/40 bg-surface/80 px-2.5 py-2 text-secondary">
          <p className="text-[10px] uppercase tracking-wide text-secondary">{isReceived ? "Received From" : "Shipped To"}</p>
          <p className="mt-0.5 font-semibold text-primary-text">{counterpartyName}</p>
        </div>
        <div className="rounded-lg border border-primary-border/40 bg-surface/80 px-2.5 py-2 text-secondary">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-secondary">
            <Truck className="size-3" />
            Trucking
          </p>
          <p className="mt-0.5 font-semibold text-primary-text">{trucking || "Pending"}</p>
        </div>
      </div>

      {notes && (
        <div className="mt-3 rounded-xl border border-primary-border/35 bg-surface p-2.5 text-xs text-secondary">
          <div className="mb-1 flex items-center gap-1 font-semibold text-primary-text">
            <NotebookPen className="size-3" />
            Notes
          </div>
          <p>{notes}</p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-primary-border/25 pt-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-action-blue/75 bg-action-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-action-blue/90"
          onClick={(event) => {
            event.stopPropagation()
            if (onView) onView()
          }}
        >
          View Details
          <ChevronRight className="size-3.5" />
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="rounded-md border border-primary-border/45 bg-surface px-2.5 py-1.5 text-xs font-medium text-primary-text hover:bg-primary-border/10"
            onClick={(event) => {
              event.stopPropagation()
              if (onEdit) onEdit()
            }}
          >
            Edit
          </button>
          <button
            type="button"
            disabled={!canMarkArrived || isMarkingArrived}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-900/25 dark:text-emerald-200 dark:hover:bg-emerald-900/35 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={(event) => {
              event.stopPropagation()
              if (onMarkArrived) onMarkArrived()
            }}
          >
            {isMarkingArrived ? "Saving..." : "Mark Arrived"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoadCard
