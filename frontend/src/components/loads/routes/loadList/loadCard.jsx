import dayjs from "dayjs"
import { Calendar, MoveUpRight, MapPin, ChevronRight } from "lucide-react"

const LoadCard = ({ destination, departureDate, arrivalDate, city, state, headCount }) => {
  const formattedDepartureDate = dayjs.utc(departureDate).format("MM/DD/YYYY")
  const formattedArrivalDate = arrivalDate
    ? dayjs.utc(arrivalDate).format("MM/DD/YYYY")
    : "Pending"

  return (
    <div className="w-full h-fit p-4 border border-gray-200 shadow-sm rounded-lg hover:shadow-md hover:scale-[1.01] transition-all bg-white cursor-pointer">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{destination}</h3>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="size-3" />
            <span>{city}, {state}</span>
          </div>
        </div>
        <ChevronRight className="size-4 text-gray-400" />
      </div>

      {/* Info */}
      <div className="pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <div className="flex items-center gap-1 text-gray-500">
            <Calendar className="size-3" /> Departure
          </div>
          <span className="font-medium text-gray-800">{formattedDepartureDate}</span>
        </div>
        <div className="flex justify-between">
          <div className="flex items-center gap-1 text-gray-500">
            <Calendar className="size-3" /> Arrival
          </div>
          <span className={`font-medium ${formattedArrivalDate === "Pending" ? "text-orange-500" : "text-gray-800"}`}>
            {formattedArrivalDate}
          </span>
        </div>

        {/* Bottom */}
        <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-2">
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <MoveUpRight className="size-3" /> Calves shipped
          </div>
          <span className="text-xs font-medium text-white bg-blue-600 rounded-lg py-1 px-2">
            {headCount} hd
          </span>
        </div>
      </div>
    </div>
  )
}

export default LoadCard
