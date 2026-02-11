import { Plus } from "lucide-react"

const Create = ({ text, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="bg-blue-500 flex items-center gap-2 text-white p-2 rounded-xl text-xs font-medium shadow-sm hover:bg-blue-600 hover:shadow-md transition-all duration-200 cursor-pointer"
        >
            <Plus className="w-4 h-4" /> {text}
        </button>
    )
}

export default Create
