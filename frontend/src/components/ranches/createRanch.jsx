import { useState } from "react"
import Popup from "../popUp"
import Input from "../inputs/input"
import EnterButton from "../extra/EnterButton"
import ResetButton from "../extra/ResetButton"
import { useAppContext } from "../../context"
import { useToken } from "../../api/useToken"
import { createRanch } from "../../api/ranches"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import { US_STATES } from "../../constants/usStates"
import { Check, ChevronsUpDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@components/ui/command"

const randomColor = () => {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`
}

const RequiredLabel = ({ text }) => (
  <>
    {text} <span className="text-red-500">*</span>
  </>
)

const CreateNewRanch = () => {
  const token = useToken()
  const navigate = useNavigate()
  const { user } = useAuth0()
  const createdByName =
    user?.name ||
    [user?.given_name, user?.family_name].filter(Boolean).join(" ").trim() ||
    user?.nickname ||
    null
  const { setShowCreateNewRanchPopup, setRanches, showSuccess, showError } = useAppContext()

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    zipCode: "",
    state: "",
    manager: ""
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [stateMenuOpen, setStateMenuOpen] = useState(false)
  const normalizedStateInput = formData.state.trim().toLowerCase()
  const selectedUsState = US_STATES.find((item) => item.toLowerCase() === normalizedStateInput) || ""

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }))
    }
  }

  const validate = () => {
    let newErrors = {}

    if (!formData.name.trim())
      newErrors.name = "Name is required"

    if (!formData.address.trim())
      newErrors.address = "Address is required"

    if (!formData.city.trim())
      newErrors.city = "City is required"

    if (!formData.state.trim()) {
      newErrors.state = "State is required"
    } else if (!selectedUsState) {
      newErrors.state = "Select a valid U.S. state"
    }

    if (!formData.manager.trim())
      newErrors.manager = "Manager is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    try {
      setLoading(true)

      let newRanch = {
        ...formData,
        state: selectedUsState,
        color: randomColor(),
        createdBy: createdByName,
        weightCategories: [],
      }

      newRanch = await createRanch(newRanch, token)

      setRanches(prev => [...prev, newRanch])
      setShowCreateNewRanchPopup(false)
      showSuccess(`Ranch "${newRanch.name}" created successfully.`, "Created")
      navigate(`/ranches?newRanchId=${newRanch.id}`)

    } catch (error) {
      console.error("Error creating ranch:", error)
      showError(error?.response?.data?.message || "Could not create ranch.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popup
      title="Create New Ranch"
      content={
        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-full w-full"
        >
          <div className="flex flex-col gap-6 py-2">

            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-primary-text">
                Ranch Information
              </h3>
              <p className="text-xs text-secondary opacity-70">
                Fill in the details below to register a new ranch.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">

              <div>
                <Input
                  type="text"
                  label={<RequiredLabel text="Name" />}
                  name="name"
                  placeholder="Enter ranch name"
                  onChange={(value) => handleChange("name", value)}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <Input
                  type="text"
                  label={<RequiredLabel text="Address" />}
                  name="address"
                  placeholder="Enter ranch address"
                  onChange={(value) => handleChange("address", value)}
                />
                {errors.address && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.address}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <Input
                    type="text"
                    label={<RequiredLabel text="City" />}
                    name="city"
                    placeholder="Enter city"
                    onChange={(value) => handleChange("city", value)}
                  />
                  {errors.city && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.city}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    type="text"
                    label="Zip Code"
                    name="zipCode"
                    placeholder="Enter zip code"
                    onChange={(value) => handleChange("zipCode", value)}
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label
                    htmlFor="state"
                    className="font-semibold text-sm text-gray-700"
                  >
                    State <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-2">
                    <Popover open={stateMenuOpen} onOpenChange={setStateMenuOpen}>
                      <PopoverTrigger asChild>
                        <button
                          id="state"
                          type="button"
                          role="combobox"
                          aria-expanded={stateMenuOpen}
                          className="
                            border border-gray-300
                            rounded-md
                            px-3
                            h-9
                            text-sm
                            w-full
                            flex items-center justify-between
                            focus:outline-none
                            focus:ring-2
                            focus:ring-blue-500
                            focus:border-blue-500
                            transition-all
                            duration-150
                          "
                        >
                          <span className={selectedUsState ? "text-gray-900" : "text-gray-400"}>
                            {selectedUsState || "Select state"}
                          </span>
                          <ChevronsUpDown className="h-4 w-4 text-gray-500 opacity-80" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="p-0 w-[var(--radix-popover-trigger-width)] z-[80]"
                        align="start"
                      >
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
                  </div>
                  {errors.state && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.state}
                    </p>
                  )}
                </div>

              </div>

              <div>
                <Input
                  type="text"
                  label={<RequiredLabel text="Manager" />}
                  name="manager"
                  placeholder="Enter manager name"
                  onChange={(value) => handleChange("manager", value)}
                />
                {errors.manager && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.manager}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="
            flex justify-end gap-3
            mt-8 pt-6
            border-t border-primary-border/40
          ">
            <ResetButton
              text="Cancel"
              type="button"
              onClick={() => setShowCreateNewRanchPopup(false)}
            />
            <EnterButton
              text={loading ? "Creating..." : "Create Ranch"}
              disabled={loading}
            />
          </div>
        </form>
      }
    />
  )
}

export default CreateNewRanch
