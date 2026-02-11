import { useState } from "react"
import { X } from "lucide-react"

const Input = ({ label, type = "text", name, placeholder, onChange }) => {
  
  const [value, setValue] = useState("")

  const handleChange = (e) => {
    setValue(e.target.value)
    if (onChange) onChange(e.target.value) // notifica al padre si existe
  }

  const handleClear = () => {
    setValue("")
    if (onChange) onChange("") // notifica limpieza también
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      {label && (
        <label
          htmlFor={name}
          className="font-semibold text-sm text-gray-700"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="
            border border-gray-300
            rounded-md
            p-2
            h-9
            text-sm
            w-full
            placeholder-gray-400
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            focus:border-blue-500
            transition-all
            duration-150
            pr-8
          "
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default Input
