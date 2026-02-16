import { useAppContext } from "../context"
import { X } from "lucide-react"

const Popup = ({title, content}) => {

    const { setShowCreateNewRanchPopup } = useAppContext()
    const handleOutsideClick = (e) => {
        if (e.target !== e.currentTarget) return
        setShowCreateNewRanchPopup(false)
    }
    const handleInsideClick = (e) => e.stopPropagation()

    return (
        <div className='fixed inset-0 bg-black/50 z-60' onMouseDown={handleOutsideClick}>
            <div className='fixed inset-0 m-auto w-[calc(100%-1rem)] max-w-2xl max-h-[90vh] bg-white p-4 flex flex-col justify-scenter items-center rounded-lg overflow-hidden'
                onMouseDown={handleInsideClick}
            >
                <div className="flex flex-row w-full p-2 border-b border-gray-200 justify-between">
                    <h3 className="text-base font-bold">{title}</h3>
                    <button
                        className="cursor-pointer" 
                        onClick={() => setShowCreateNewRanchPopup(false)}><X className="h-5 w-5"/></button>
                </div>
                <div className="p-2 w-full h-full overflow-y-auto">
                    {content}
                </div>
            </div>
        </div>
    )
}

export default Popup
