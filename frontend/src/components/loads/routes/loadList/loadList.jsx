import { getLoadsByRanch } from "../../../../api/loads"
import { getRanchById } from "../../../../api/ranches"
import { useState, useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"
import { useAppContext } from "../../../../context"
import { useToken } from "../../../../api/useToken"
import LoadCard from "./loadCard"
import LoadMenu from "./loadMenu"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import { Truck, Clock3, PackageCheck } from "lucide-react"
import { toDateKey } from "../../../../utils/dateRange"

dayjs.extend(utc)

const LoadList = ({ setSelectedLoad, selectedLoadId, isDetailsOpen = false, onOpen, setIsLoads, refreshKey = 0 }) => {
    const [loads, setLoads] = useState([])
    const { id } = useParams()
    const token = useToken()
    const { ranch, setRanch, selected } = useAppContext()

    // CARGAR RANCH
    useEffect(() => {
      if (!ranch && token && id) {
        const fetchRanch = async () => {
          try {
            const data = await getRanchById(id, token)
            setRanch(data)
          } catch (err) {
            console.error("Error loading ranch:", err)
          }
        }
        fetchRanch()
      }
    }, [ranch, id, token, setRanch])

    // CARGAR LOADS
    useEffect(() => {
      if (!token || !ranch?.id) return

      const fetchLoads = async () => {
        try {
          const data = await getLoadsByRanch(ranch.id, token)
          if (!data || data.length === 0) {
            setIsLoads(false)
            setLoads([])
            return
          }
          setIsLoads(true)
          setLoads(data)
        } catch (error) {
          console.error("Error fetching loads:", error)
        }
      }

      fetchLoads()
    }, [token, ranch?.id, refreshKey, setIsLoads])

    const sortedLoads = useMemo(
      () =>
        [...loads].sort((a, b) => {
          const aDate = dayjs.utc(a.departureDate).valueOf()
          const bDate = dayjs.utc(b.departureDate).valueOf()
          return bDate - aDate
        }),
      [loads]
    )

    const data = useMemo(
      () =>
        loads.map((load) => ({
          destination: load.destination?.name,
          city: load.destination?.city,
          state: load.destination?.state,
        })),
      [loads]
    )

    // FILTRO REAL
    const filteredLoads = sortedLoads.filter(load => {
      let matchDestination = true
      let matchCity = true
      let matchState = true
      let matchDate = true

      if (selected.destination) {
        matchDestination = load.destination?.name === selected.destination
      }

      if (selected.city) {
        matchCity = load.destination?.city === selected.city
      }

      if (selected.state) {
        matchState = load.destination?.state === selected.state
      }

      if (selected.date) {
        matchDate = toDateKey(load.departureDate) === toDateKey(selected.date)
      }

      if (selected.dateFrom) {
        const loadDateKey = toDateKey(load.departureDate)
        const fromKey = toDateKey(selected.dateFrom)
        matchDate = Boolean(loadDateKey) && Boolean(fromKey) && loadDateKey >= fromKey
      }

      if (selected.dateTo) {
        const loadDateKey = toDateKey(load.departureDate)
        const toKey = toDateKey(selected.dateTo)
        matchDate = matchDate && Boolean(loadDateKey) && Boolean(toKey) && loadDateKey <= toKey
      }

      return matchDestination && matchCity && matchState && matchDate
    })

    const totalHead = filteredLoads.reduce((sum, load) => sum + Number(load.headCount || 0), 0)
    const pendingArrivals = filteredLoads.filter((load) => !load.arrivalDate).length

    return (
      <div className="w-full h-full p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <LoadMenu
            data={data}
            isDetailsOpen={isDetailsOpen}
            onOpen={onOpen}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-primary-border/30 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-secondary">Loads visible</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-2xl font-semibold text-primary-text">{filteredLoads.length}</p>
                <Truck className="size-5 text-action-blue" />
              </div>
            </div>
            <div className="rounded-2xl border border-primary-border/30 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-secondary">Head count</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-2xl font-semibold text-primary-text">{totalHead}</p>
                <PackageCheck className="size-5 text-action-blue" />
              </div>
            </div>
            <div className="rounded-2xl border border-primary-border/30 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-secondary">Pending arrivals</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-2xl font-semibold text-primary-text">{pendingArrivals}</p>
                <Clock3 className="size-5 text-action-blue" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredLoads.length > 0 ? (
              filteredLoads.map((load) => (
                <div key={load.id} className="w-full" onClick={() => setSelectedLoad(load.id)}>
                  <LoadCard
                    destination={load.destination?.name}
                    city={load.destination?.city}
                    state={load.destination?.state}
                    departureDate={load.departureDate}
                    arrivalDate={load.arrivalDate}
                    headCount={load.headCount}
                    trucking={load.trucking}
                    notes={load.notes}
                    shippedOutDate={load.shippedOutDate}
                    shippedTo={load.shippedTo}
                    isActive={selectedLoadId === load.id}
                  />
                </div>
              ))
            ) : loads.length > 0 ? (
              <div className="rounded-2xl border border-primary-border/30 bg-white p-6 text-sm text-secondary">
                No loads match the current filters.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
}

export default LoadList
