import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import { Calendar, MoveUpRight, MapPin, ChevronRight, Truck, NotebookPen } from "lucide-react"

dayjs.extend(utc)

const LoadCard = ({
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
  isActive = false,
}) => {
  const formattedDepartureDate = dayjs.utc(departureDate).format("MM/DD/YYYY")
  const formattedArrivalDate = arrivalDate
    ? dayjs.utc(arrivalDate).format("MM/DD/YYYY")
    : "Pending"
  const formattedShippedOut = shippedOutDate
    ? dayjs.utc(shippedOutDate).format("MM/DD/YYYY")
    : "N/A"

  return (
    <div
      className={`w-full rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
        isActive
          ? "border-action-blue/60 bg-action-blue/[0.04] shadow-[0_8px_24px_-14px_rgba(0,0,0,0.4)]"
          : "border-primary-border/30 bg-white hover:border-action-blue/40 hover:bg-action-blue/[0.03]"
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-primary-text truncate">
            {destination || shippedTo || "Unknown destination"}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-xs text-secondary">
            <MapPin className="size-3" />
            <span>{city && state ? `${city}, ${state}` : city || state || "Location unavailable"}</span>
          </div>
        </div>
        <ChevronRight className={`size-4 mt-1 ${isActive ? "text-action-blue" : "text-secondary"}`} />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between">
          <div className="flex items-center gap-1 text-secondary">
            <Calendar className="size-3" /> Departure
          </div>
          <span className="font-medium text-primary-text">{formattedDepartureDate}</span>
        </div>
        <div className="flex justify-between">
          <div className="flex items-center gap-1 text-secondary">
            <Calendar className="size-3" /> Arrival
          </div>
          <span className={`font-medium ${formattedArrivalDate === "Pending" ? "text-amber-600" : "text-primary-text"}`}>
            {formattedArrivalDate}
          </span>
        </div>
        <div className="flex justify-between">
          <div className="flex items-center gap-1 text-secondary">
            <Calendar className="size-3" /> Shipped out
          </div>
          <span className="font-medium text-primary-text">{formattedShippedOut}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary">Shipped to</span>
          <span className="font-medium text-primary-text">{shippedTo || destination || "-"}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-primary-border/40 bg-surface px-2.5 py-1 text-xs text-secondary">
          <Truck className="size-3" />
          {trucking || "Trucking pending"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-action-blue/30 bg-action-blue/10 px-2.5 py-1 text-xs font-medium text-action-blue">
          <MoveUpRight className="size-3" />
          {headCount || 0} hd
        </span>
      </div>

      {notes && (
        <div className="mt-3 rounded-xl border border-primary-border/30 bg-surface p-2.5 text-xs text-secondary">
          <div className="mb-1 flex items-center gap-1 font-semibold text-primary-text">
            <NotebookPen className="size-3" />
            Notes
          </div>
          <p>{notes}</p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-primary-border/20 flex justify-end">
        <span className="text-xs text-secondary">View full load details</span>
      </div>
    </div>
  )
}

export default LoadCard
