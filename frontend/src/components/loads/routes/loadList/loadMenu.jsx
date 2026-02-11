import MenuTemplate from "../../../../components/tables/components/menuTemplate"
import { AdjustmentsHorizontalIcon, CalendarDateRangeIcon } from "@heroicons/react/24/outline"
import MenuElement from "../../../../components/tables/components/menuElement"
import * as Separator from "@radix-ui/react-separator"
import QuitButton from "../../../extra/quitButton"
import { useAppContext } from "../../../../context"
import DataRangeElement from "../../../../components/tables/components/dataRangeElement"
import CreateLoadBtn from "../../createLoadBtn"

const LoadMenu = ({ data, isFilterMenu, isFilterDate, setIsFilterMenu, setIsFilterDate, resultsCount, onOpen }) => {
    
    const { setSelected } = useAppContext()

    const DeleteFilter = () => {
        setSelected({})
        setIsFilterMenu(false)
        setIsFilterDate(false)
    }

    const handleReset = (field) => {
        setSelected(prev => {
            const updated = { ...prev, [field]: "" }

            // Revisa si ya no hay filtros activos
            const hasFilters = Object.values(updated).some(value => value && value !== "")
            if (!hasFilters) {
            // Si no hay filtros, oculta el QuitButton
            setIsFilterMenu(false)
            setIsFilterDate(false)
            }

            return updated
        })
    }

    return (
        
    <div className="flex flex-row justify-between gap-2 w-full relative border-b border-gray-300 pb-3">
        <CreateLoadBtn onOpen={onOpen} />
        <div className="flex flex-row gap-2 items-center">
            {resultsCount > 0 && (
                <span className="text-gray-600 text-xs">
                    {resultsCount} result(s) found
                </span>
            )}
          <MenuTemplate
              icon={<AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-700" />}
              title="Filter"
              isFilter={isFilterMenu}
              setIsFilter={setIsFilterMenu}
              buttons={false}
              content={
                <div>
                  <MenuElement title="Destination" data={data} placeholder="Select destination" field="destination" handleReset={handleReset}/>
                  <MenuElement title="City" data={data} placeholder="Select city" field="city" handleReset={handleReset}/>
                  <MenuElement title="State" data={data} placeholder="Select state" field="state" handleReset={handleReset}/>
                </div>
              }
            />
          <MenuTemplate
              icon={<CalendarDateRangeIcon className="h-4 w-4 text-gray-600" />}
              title="Date filter"
              isFilter={isFilterDate}
              setIsFilter={setIsFilterDate}
              buttons={false}
              content={
                <div>
                    <DataRangeElement 
                        selectTitle="Select Departure Date" 
                        rangeTitle="Select Departure Date Range"
                        handleReset={handleReset}
                        setIsFilter={setIsFilterDate} />
                </div>
              }
            />
            {(isFilterMenu || isFilterDate ) && (
                <>
                    <Separator.Root
                        orientation="vertical"
                        className="h-full w-[1px] bg-gray-300 mx-2"
                    />            
                    <QuitButton onClick={() => DeleteFilter()} />
                </>
            )}
            </div>
      </div>
    )
}

export default LoadMenu