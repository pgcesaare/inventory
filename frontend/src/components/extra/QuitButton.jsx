import { XMarkIcon } from "@heroicons/react/24/outline"

const QuitButton = ({ onClick }) => {
    return (
        <button onClick={onClick} className="bg-red-600 px-2 py-2 text-sm rounded-md cursor-pointer hover:bg-red-700">
            <XMarkIcon className="text-white h-4 w-4" />
        </button>
    )
}

export default QuitButton