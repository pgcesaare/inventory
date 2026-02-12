import LoadList from "../components/loads/routes/loadList/loadList"
import LoadSlideContainer from "../components/loads/loadSlideContainer"
import CreateLoadBtn from "../components/loads/createLoadBtn"
import { useEffect, useState } from "react"
import CreateLoad from "../components/loads/routes/create-load/createLoad"
import LoadDetails from "../components/loads/routes/loadList/loadDetails"
import { getLoadById } from "../api/loads"
import { useToken } from "../api/useToken"
import { Truck } from "lucide-react"

const Load = () => {
    const [selectedLoad, setSelectedLoad] = useState(null)
    const [selectedLoadData, setSelectedLoadData] = useState(null)
    const [selectedCreateLoad, setSelectedCreateLoad] = useState(false)
    const [isSlideOpen, setIsSlideOpen] = useState(false)
    const [isLoads, setIsLoads] = useState(true)
    const [refreshKey, setRefreshKey] = useState(0)
    const token = useToken()

    useEffect(() => {
        if (selectedCreateLoad) setSelectedLoad(null)
    }, [selectedCreateLoad])

    useEffect(() => {
        if (selectedLoad) setSelectedCreateLoad(false)
    }, [selectedLoad])

    useEffect(() => {
        setIsSlideOpen(!!selectedLoad || selectedCreateLoad)
    }, [selectedLoad, selectedCreateLoad])

    useEffect(() => {
        if (!selectedLoad || !token) return

        const fetchLoad = async () => {
            try {
                const data = await getLoadById(selectedLoad, token)
                setSelectedLoadData(data)
            } catch (error) {
                console.error("Error loading load details:", error)
                setSelectedLoadData(null)
            }
        }

        fetchLoad()
    }, [selectedLoad, token, refreshKey])

    const handleClose = () => {
        setIsSlideOpen(false)
        setSelectedLoad(null)
        setSelectedLoadData(null)
        setSelectedCreateLoad(false)
    }

    const handleCreateLoad = () => {
        setSelectedCreateLoad(true)
    }

    const handleCreated = () => {
        setRefreshKey((prev) => prev + 1)
        setSelectedCreateLoad(false)
        setSelectedLoad(null)
    }

  return (
    <div className="w-full h-full bg-background">
      <div className="flex h-full w-full flex-col lg:flex-row">
        <div className={`${isSlideOpen ? "lg:w-[46%]" : "lg:w-full"} h-full overflow-y-auto transition-all duration-200`}>
          {!isLoads ? (
            <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-start justify-center gap-4 px-6 py-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-border/40 bg-primary-border/10 px-3 py-1 text-xs font-medium text-primary-text">
                <Truck className="size-3.5" />
                Loads
              </div>
              <h1 className="text-2xl font-semibold text-primary-text">No load orders yet</h1>
              <p className="max-w-xl text-sm text-secondary">
                Start by creating your first shipping order. You can select calves in bulk and track destination, dates, and trucking details.
              </p>
              <CreateLoadBtn onOpen={handleCreateLoad} />
            </div>
          ) : (
            <LoadList
              setSelectedLoad={setSelectedLoad}
              selectedLoadId={selectedLoad}
              onOpen={handleCreateLoad}
              setIsLoads={setIsLoads}
              refreshKey={refreshKey}
            />
          )}
        </div>

        {isSlideOpen && (
          <div className="h-full border-l border-primary-border/30 lg:w-[54%]">
            <LoadSlideContainer
              title={selectedCreateLoad ? "Create Load Order" : `Load Details #${selectedLoad || ""}`}
              onClose={handleClose}
            >
              <div className="p-4 md:p-5">
                {selectedCreateLoad ? (
                  <CreateLoad onCreated={handleCreated} />
                ) : (
                  <LoadDetails load={selectedLoadData} />
                )}
              </div>
            </LoadSlideContainer>
          </div>
        )}
      </div>
    </div>
  )
}

export default Load
