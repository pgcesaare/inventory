import LoadList from "../components/loads/routes/loadList/loadList"
import LoadSlideContainer from "../components/loads/loadSlideContainer"
import CreateLoadBtn from "../components/loads/createLoadBtn"
import { useEffect, useState } from "react"
import CreateLoad from "../components/loads/routes/create-load/createLoad"

const Load = () => {
    const [selectedLoad, setSelectedLoad] = useState(null)
    const [selectedCreateLoad, setSelectedCreateLoad] = useState(false)
    const [isSlideOpen, setIsSlideOpen] = useState(false)
    const [isLoads, setIsLoads] = useState(true)

    useEffect(() => {
        if (selectedCreateLoad) setSelectedLoad(null)
    }, [selectedCreateLoad])

    useEffect(() => {
        if (selectedLoad) setSelectedCreateLoad(false)
    }, [selectedLoad])

    useEffect(() => {
        setIsSlideOpen(!!selectedLoad || selectedCreateLoad)
    }, [selectedLoad, selectedCreateLoad])

    const handleClose = () => {
        setIsSlideOpen(false)
        setSelectedLoad(null)
        setSelectedCreateLoad(false)
    }

    const handleCreateLoad = () => {
        setSelectedCreateLoad(true)
    }

    return (
        <div className="flex w-full h-full">
            {/* LISTA O MENSAJE NO LOADS */}
            <div className={`${isSlideOpen ? "w-full" : "w-1/2"} h-full overflow-y-auto`}>
                {!isLoads ? (
                    <div className="w-full h-full flex flex-col justify-start items-start p-10 gap-6">
                        <p className="text-gray-700 text-center text-xl sm:text-2xl font-semibold">
                            No loads have been registered yet.
                        </p>
                        <p className="text-gray-500 text-center text-base sm:text-lg">
                            You can create a new load below to get started.
                        </p>
                        <CreateLoadBtn onOpen={handleCreateLoad} />
                    </div>
                ) : (
                    <LoadList
                        setSelectedLoad={setSelectedLoad}
                        onOpen={handleCreateLoad}
                        setIsLoads={setIsLoads}
                    />
                )}
            </div>

            {/* SLIDE A LA DERECHA */}
            {isSlideOpen && (
                <div className="w-1/2 h-full border-l border-gray-200 flex-shrink-0">
                    <LoadSlideContainer
                        title={
                            selectedCreateLoad
                                ? "Create new load"
                                : `Load Information ${selectedLoad?.id || ""}`
                        }
                        onClose={handleClose}
                    >
                        <div className="p-4">
                            {selectedCreateLoad ? (
                               <CreateLoad />
                            ) : (
                                <p>Detalles del load seleccionado</p>
                            )}
                        </div>
                    </LoadSlideContainer>
                </div>
            )}
        </div>
    )
}

export default Load
