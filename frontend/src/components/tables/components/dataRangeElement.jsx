import MenuElementWrapper from "./menuElementWrapper"
import DatePicker from "./datePicker"
import { useAppContext } from "../../../context"

const DataRangeElement = ({ selectTitle ,rangeTitle, setIsFilter }) => {
  const { selected, setSelected } = useAppContext()

  const handleSelect = (field, value) => {
    setSelected(prev => ({
      ...prev,
      [field]: value,
    }))
  }

    const handleReset = () => {
    setSelected(prev => ({
        ...prev,
        date: "",
        dateFrom: "",
        dateTo: "",
    }))
    setIsFilter(false)
    }

  return (
    <div className="flex flex-col h-full space-y-1">
      <MenuElementWrapper
        title={selectTitle}
        handleReset={handleReset}
        content={
            <DatePicker 
              text="Date:" 
              value={selected.date} 
              onSelect={(date) => handleSelect("date", date)}
              setIsFilter={setIsFilter}
            />
        }
      /> 
      <MenuElementWrapper
        title={rangeTitle}
        handleReset={handleReset}
        content={
          <div className="flex flex-row w-full justify-between gap-3">
            <DatePicker text="From:" setIsFilter={setIsFilter} value={selected.dateFrom} onSelect={(date) => handleSelect("dateFrom", date)} />
            <DatePicker text="To:" setIsFilter={setIsFilter} value={selected.dateTo} onSelect={(date) => handleSelect("dateTo", date)} />
          </div>
        }
      /> 
    </div>

  )
}

export default DataRangeElement
