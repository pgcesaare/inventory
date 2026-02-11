import ButtonElement from "../components/buttonElement"
import DataRangeElement from "../components/dataRangeElement"

const DateFilterContent = ({ setIsFilter, setIsOpen }) => (
  <div className="flex flex-col py-2">
    <ButtonElement text="Today" setIsFilter={setIsFilter} setIsOpen={setIsOpen}/>
    <ButtonElement text="7 days ago" setIsFilter={setIsFilter} setIsOpen={setIsOpen}/>
    <ButtonElement text="Two weeks ago" setIsFilter={setIsFilter} setIsOpen={setIsOpen}/>
    <ButtonElement text="A month ago" setIsFilter={setIsFilter} setIsOpen={setIsOpen}/>
    <DataRangeElement selectTitle="Select date" rangeTitle="Select date range" setIsFilter={setIsFilter}/>
  </div>
)

export default DateFilterContent