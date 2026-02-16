import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@components/ui/command"
import { US_STATES } from "../../constants/usStates"

const EditRanchModal = ({ ranch, onClose, onSave, loading = false }) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    zipCode: "",
    state: "",
    manager: "",
  })
  const [errors, setErrors] = useState({})
  const [stateMenuOpen, setStateMenuOpen] = useState(false)
  const normalizedStateInput = formData.state.trim().toLowerCase()
  const selectedUsState = US_STATES.find((item) => item.toLowerCase() === normalizedStateInput) || ""

  useEffect(() => {
    if (!ranch) return

    setFormData({
      name: ranch.name || "",
      address: ranch.address || "",
      city: ranch.city || "",
      zipCode: ranch.zipCode || "",
      state: ranch.state || "",
      manager: ranch.manager || ranch.managerName || "",
    })
  }, [ranch])

  if (!ranch) return null

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validate = () => {
    const nextErrors = {}

    if (!formData.name.trim()) nextErrors.name = "Name is required"
    if (!formData.address.trim()) nextErrors.address = "Address is required"
    if (!formData.city.trim()) nextErrors.city = "City is required"
    if (!formData.state.trim()) {
      nextErrors.state = "State is required"
    } else if (!selectedUsState) {
      nextErrors.state = "Select a valid U.S. state"
    }
    if (!formData.manager.trim()) nextErrors.manager = "Manager is required"

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    await onSave({
      name: formData.name.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      zipCode: formData.zipCode.trim(),
      state: selectedUsState,
      manager: formData.manager.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-60 bg-black/50" onMouseDown={onClose}>
      <div
        className="fixed inset-0 m-auto w-[95%] max-w-xl h-fit bg-white p-4 flex flex-col rounded-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-row w-full p-2 border-b border-primary-border/40 justify-between">
          <h3 className="text-base font-bold text-primary-text">Edit Ranch</h3>
          <button className="cursor-pointer" onClick={onClose} disabled={loading}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-2 w-full h-full flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-semibold text-primary-text mb-1">Name <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded-md border border-primary-border/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-border"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary-text mb-1">Address <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full rounded-md border border-primary-border/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-border"
              />
              {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-primary-text mb-1">City <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="w-full rounded-md border border-primary-border/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-border"
                />
                {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary-text mb-1">Zip Code</label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleChange("zipCode", e.target.value)}
                  className="w-full rounded-md border border-primary-border/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-border"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary-text mb-1">State <span className="text-red-600">*</span></label>
                <Popover open={stateMenuOpen} onOpenChange={setStateMenuOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={stateMenuOpen}
                      className="w-full rounded-md border border-primary-border/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-border flex items-center justify-between"
                    >
                      <span className={selectedUsState ? "text-primary-text" : "text-secondary"}>
                        {selectedUsState || "Select state"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 text-secondary opacity-80" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] z-[80]" align="start">
                    <Command>
                      <CommandInput placeholder="Search state..." />
                      <CommandList>
                        <CommandEmpty>No states found.</CommandEmpty>
                        <CommandGroup>
                          {US_STATES.map((stateName) => (
                            <CommandItem
                              key={stateName}
                              value={stateName}
                              onSelect={() => {
                                handleChange("state", stateName)
                                setStateMenuOpen(false)
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${selectedUsState === stateName ? "opacity-100" : "opacity-0"}`}
                              />
                              {stateName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary-text mb-1">Manager <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={formData.manager}
                onChange={(e) => handleChange("manager", e.target.value)}
                className="w-full rounded-md border border-primary-border/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-border"
              />
              {errors.manager && <p className="text-xs text-red-500 mt-1">{errors.manager}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-primary-border/40">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-md border border-primary-border/40 text-sm text-primary-text hover:bg-primary-border/10 cursor-pointer disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md border border-action-blue/80 bg-action-blue text-sm font-medium text-white hover:bg-action-blue/90 cursor-pointer disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditRanchModal
