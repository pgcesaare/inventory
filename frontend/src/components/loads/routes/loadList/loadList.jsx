import { getLoadsByRanch } from "../../../../api/loads"
import { getRanchById } from "../../../../api/ranches"
import { useState, useEffect, use } from "react"
import { useParams } from "react-router-dom"
import { useAppContext } from "../../../../context"
import { useToken } from "../../../../api/useToken"
import LoadCard from "./loadCard"
import LoadMenu from "./loadMenu"
import dayjs from "dayjs"
import CreateLoadBtn from "../../createLoadBtn"

const LoadList = ({setSelectedLoad, onOpen , setIsLoads}) => {
    const [loads, setLoads] = useState([])
    const { id } = useParams()
    const token = useToken()
    const { ranch, setRanch, selected } = useAppContext()
    const [isFilterMenu, setIsFilterMenu] = useState(false)
    const [isFilterDate, setIsFilterDate] = useState(false)

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
    }, [ranch, id, token])

    // CARGAR LOADS
    useEffect(() => {
      if (!token || !ranch?.id) return

      const fetchLoads = async () => {
        try {
          const data = await getLoadsByRanch(ranch.id, token)
          if (!data || data.length === 0) {
            setIsLoads(false)
            return
          }
          setLoads(data)
        } catch (error) {
          console.error("Error fetching loads:", error)
        }
      }

      fetchLoads()
    }, [token, ranch?.id])

    // DATA PARA DROPDOWNS
    const data = loads.map(load => ({
      destination: load.destination?.name,
      city: load.destination?.city,
      state: load.destination?.state
    }))

    // 🔥 HABILITAR EL MENÚ DE FILTRO SI HAY SELECCIONES
    useEffect(() => {
      if (selected.destination || selected.city || selected.state) {
        setIsFilterMenu(true)
      }
    }, [selected])

    // FILTRO REAL
    const filteredLoads = loads.filter(load => {
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
        matchDate = dayjs.utc(load.departureDate).isSame(selected.date, 'day')
      }

      if(selected.dateFrom) {
        matchDate = dayjs.utc(load.departureDate).isAfter(dayjs.utc(selected.dateFrom).subtract(1, 'day'))
      }

      if(selected.dateTo) {
        matchDate = matchDate && dayjs.utc(load.departureDate).isBefore(dayjs.utc(selected.dateTo).add(1, 'day'))
      }

      return matchDestination && matchCity && matchState && matchDate
    })

    return (
      <>
        <div className="w-full flex flex-col justify-start items-left gap-2 p-7 h-full">
            <LoadMenu 
              data={data}
              isFilterMenu={isFilterMenu}
              setIsFilterMenu={setIsFilterMenu}
              isFilterDate={isFilterDate}
              setIsFilterDate={setIsFilterDate}
              resultsCount={filteredLoads.length}
              onOpen={onOpen}
            />

            {/* RESULTADOS */}
            {filteredLoads.length > 0 ? (
              filteredLoads.map(load => (
                <div
                  key={load.id}
                  className="w-full"
                  onClick={() => setSelectedLoad(load.id)}
                >
                  <LoadCard
                    destination={load.destination?.name}
                    city={load.destination?.city}
                    state={load.destination?.state}
                    departureDate={load.departureDate}
                    arrivalDate={load.arrivalDate}
                    headCount={load.headCount}
                  />
                </div>
              ))
            ) : loads.length > 0 ? (
              <span className="text-gray-600 text-sm">
                No loads match the selected filters.
              </span>
            ) : null}
        
        </div>
      </>
    )
}

export default LoadList
