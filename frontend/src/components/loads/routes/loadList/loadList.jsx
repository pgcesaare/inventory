import { getLoadsByRanch, updateLoad } from "../../../../api/loads"
import { getRanchById } from "../../../../api/ranches"
import { useState, useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"
import { useAppContext } from "../../../../context"
import { useToken } from "../../../../api/useToken"
import LoadCard from "./loadCard"
import LoadMenu from "./loadMenu"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import { Truck, PackageCheck, MoveDownLeft, MoveUpRight } from "lucide-react"
import { toDateKey } from "../../../../utils/dateRange"

dayjs.extend(utc)

const LoadList = ({ setSelectedLoad, selectedLoadId, isDetailsOpen = false, onOpen, setIsLoads, refreshKey = 0, onQuickEditLoad, onLoadUpdated }) => {
    const [loads, setLoads] = useState([])
    const [activeTab, setActiveTab] = useState("all")
    const [sortDirection, setSortDirection] = useState("desc")
    const [markingArrivalLoadId, setMarkingArrivalLoadId] = useState(null)
    const { id } = useParams()
    const token = useToken()
    const { ranch, setRanch, selected, confirmAction, showSuccess, showError } = useAppContext()

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
          const safeADate = Number.isFinite(aDate) ? aDate : 0
          const safeBDate = Number.isFinite(bDate) ? bDate : 0
          return sortDirection === "asc" ? safeADate - safeBDate : safeBDate - safeADate
        }),
      [loads, sortDirection]
    )

    const data = useMemo(
      () =>
        loads.map((load) => ({
          destination: load.counterpartyName || load.destination?.name,
          city: load.counterpartyCity || load.destination?.city,
          state: load.counterpartyState || load.destination?.state,
        })),
      [loads]
    )

    // FILTRO BASE
    const baseFilteredLoads = sortedLoads.filter((load) => {
      let matchDestination = true
      let matchCity = true
      let matchState = true
      let matchDate = true

      if (selected.destination) {
        matchDestination = (load.counterpartyName || load.destination?.name) === selected.destination
      }

      if (selected.city) {
        matchCity = (load.counterpartyCity || load.destination?.city) === selected.city
      }

      if (selected.state) {
        matchState = (load.counterpartyState || load.destination?.state) === selected.state
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
    const filteredLoads = useMemo(() => {
      if (activeTab === "all") return baseFilteredLoads
      return baseFilteredLoads.filter((load) => {
        const direction = String(load.direction || "").toLowerCase()
        return activeTab === "received" ? direction === "received" : direction !== "received"
      })
    }, [activeTab, baseFilteredLoads])

    const totalHead = filteredLoads.reduce((sum, load) => sum + Number(load.headCount || 0), 0)
    const loadsReceived = filteredLoads.filter((load) => String(load.direction || "").toLowerCase() === "received").length
    const loadsShipped = filteredLoads.filter((load) => String(load.direction || "").toLowerCase() !== "received").length
    const totalReceivedCount = useMemo(
      () => baseFilteredLoads.filter((load) => String(load.direction || "").toLowerCase() === "received").length,
      [baseFilteredLoads]
    )
    const totalShippedCount = useMemo(
      () => baseFilteredLoads.filter((load) => String(load.direction || "").toLowerCase() !== "received").length,
      [baseFilteredLoads]
    )

    const markLoadAsArrived = async (load) => {
      if (!load?.id || !token || markingArrivalLoadId) return
      const loadStatus = String(load.status || "").toLowerCase()
      if (loadStatus === "arrived" || loadStatus === "canceled") return

      const confirmed = await confirmAction({
        title: "Mark As Arrived",
        message: `Mark load #${load.id} as arrived today?`,
        confirmText: "YES",
        cancelText: "NO",
      })
      if (!confirmed) return

      const today = dayjs().format("YYYY-MM-DD")
      const destinationName = String(load.destinationName || load.destination?.name || load.shippedTo || "").trim()

      try {
        setMarkingArrivalLoadId(load.id)
        await updateLoad(load.id, {
          originRanchID: load.originRanchID,
          destinationRanchID: load.destinationRanchID || null,
          destinationName: destinationName || null,
          departureDate: load.departureDate || load.shippedOutDate || today,
          arrivalDate: today,
          trucking: load.trucking || null,
        }, token)

        setLoads((prev) => prev.map((item) => (
          item.id === load.id ? { ...item, arrivalDate: today, status: "arrived" } : item
        )))
        if (onLoadUpdated) onLoadUpdated()
        showSuccess(`Load #${load.id} marked as arrived.`, "Saved")
      } catch (error) {
        showError(error?.response?.data?.message || "Could not mark load as arrived.")
      } finally {
        setMarkingArrivalLoadId(null)
      }
    }

    return (
      <div className="w-full h-full p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <p className="text-xs uppercase tracking-wide text-secondary">Loads Received</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-2xl font-semibold text-primary-text">{loadsReceived}</p>
                <MoveDownLeft className="size-5 text-emerald-600" />
              </div>
            </div>
            <div className="rounded-2xl border border-primary-border/30 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-secondary">Loads Shipped</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-2xl font-semibold text-primary-text">{loadsShipped}</p>
                <MoveUpRight className="size-5 text-action-blue" />
              </div>
            </div>
          </div>

          <LoadMenu
            data={data}
            isDetailsOpen={isDetailsOpen}
            onOpen={onOpen}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex w-fit items-center rounded-xl border border-primary-border/40 bg-white p-1">
              {[
                { key: "all", label: "All", count: baseFilteredLoads.length },
                { key: "sent", label: "Sent", count: totalShippedCount },
                { key: "received", label: "Received", count: totalReceivedCount },
              ].map((tab) => (
                <button
                  key={`load-tab-${tab.key}`}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-action-blue text-white"
                      : "text-secondary hover:bg-primary-border/10 hover:text-primary-text"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            <div className="ml-auto inline-flex items-center rounded-xl border border-primary-border/40 bg-white p-1">
              <button
                type="button"
                onClick={() => setSortDirection("asc")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortDirection === "asc"
                    ? "bg-action-blue text-white"
                    : "text-secondary hover:bg-primary-border/10 hover:text-primary-text"
                }`}
              >
                Asc
              </button>
              <button
                type="button"
                onClick={() => setSortDirection("desc")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  sortDirection === "desc"
                    ? "bg-action-blue text-white"
                    : "text-secondary hover:bg-primary-border/10 hover:text-primary-text"
                }`}
              >
                Desc
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredLoads.length > 0 ? (
              filteredLoads.map((load) => (
                <div key={load.id} className="w-full" onClick={() => setSelectedLoad(load.id)}>
                  <LoadCard
                    loadId={load.id}
                    destination={load.counterpartyName || load.destination?.name}
                    city={load.counterpartyCity || load.destination?.city}
                    state={load.counterpartyState || load.destination?.state}
                    departureDate={load.departureDate}
                    arrivalDate={load.arrivalDate}
                    headCount={load.headCount}
                    trucking={load.trucking}
                    notes={load.notes}
                    shippedOutDate={load.shippedOutDate}
                    shippedTo={load.shippedTo}
                    direction={load.direction}
                    status={load.status}
                    onView={() => setSelectedLoad(load.id)}
                    onEdit={() => {
                      if (onQuickEditLoad) {
                        onQuickEditLoad(load.id)
                        return
                      }
                      setSelectedLoad(load.id)
                    }}
                    onMarkArrived={() => markLoadAsArrived(load)}
                    canMarkArrived={String(load.status || "").toLowerCase() === "in_transit"}
                    isMarkingArrived={markingArrivalLoadId === load.id}
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
