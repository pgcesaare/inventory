import React from "react"

const SelectInput = ({ name, id, value, onChange, options = [], label = "Select an option" }) => {
  return (
    <div className="flex flex-col gap-2 mb-4">
        <label className="font-bold text-sm">{label}</label>
        <select
        name={name}
        id={id}
        value={value}
        onChange={onChange}
        className="border border-gray-300 rounded-md p-1 w-50 h-8 text-sm"
        >
        <option value="">{label}</option>
        {options.map((opt) => (
            <option key={opt.id || opt.value} value={opt.value || opt.id}>
            {opt.label || opt.name}
            </option>
        ))}
        </select>
    </div>
  )
}
export default SelectInput