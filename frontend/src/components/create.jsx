import { Plus } from "lucide-react"

const CreateButton = ({ text = "New Ranch", onClick }) => {
  return (
    <button
      onClick={onClick}
      className="
        inline-flex items-center justify-center gap-2
        px-3 py-2.5
        rounded-xl
        border border-action-blue/80
        bg-action-blue
        text-sm font-medium text-white
        hover:bg-action-blue/90
        transition-colors duration-200
        cursor-pointer
      "
    >
      <Plus className="w-4 h-4 text-white" />
      {text}
    </button>
  )
}

export default CreateButton
