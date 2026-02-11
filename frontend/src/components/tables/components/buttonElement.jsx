import { useAppContext } from "../../../context"
import dayjs from "dayjs"

const ButtonElement = ({ text, setIsFilter, setIsOpen }) => {

    const { setSelected } =  useAppContext()

    const handleSelected = (text) => {
    switch (text) {

        case "Today":
            setSelected(prev => ({
                ...prev,
                date: dayjs().startOf('day').toDate(),
                dateFrom: null,
                dateTo: null
            }))
            setIsFilter(true)
            setIsOpen(false)
        break

        case "7 days ago":
            setSelected(prev => ({
                ...prev,
                date: null,
                dateFrom: dayjs().subtract(7, 'day').startOf('day').toDate(),
                dateTo: dayjs().endOf('day').toDate()
            }))
            setIsFilter(true)
            setIsOpen(false)
    break

        case "Two weeks ago":
            setSelected(prev => ({
                ...prev,
                date: null,
                dateFrom: dayjs().subtract(14, 'day').startOf('day').toDate(),
                dateTo: dayjs().endOf('day').toDate()
            }))
            setIsFilter(true)
            setIsOpen(false)
        break

        case "A month ago":
            setSelected(prev => ({
                ...prev,
                date: null,
                dateFrom: dayjs().subtract(30, 'day').startOf('day').toDate(),
                dateTo: dayjs().endOf('day').toDate()
            }))
            setIsFilter(true)
            setIsOpen(false)
        break

        default:
            setSelected(prev => ({
                ...prev,
                date: null,
                dateFrom: null,
                dateTo: null
            }))
    }

    }

    return(
        <button className="font-bold text-sm text-gray-600 hover:bg-gray-100 hover:rounded-lg cursor-pointer w-full text-left
         py-3 px-3"
         onClick={() => handleSelected(text)}
         >    
            {text}
        </button>
    )
}

export default ButtonElement