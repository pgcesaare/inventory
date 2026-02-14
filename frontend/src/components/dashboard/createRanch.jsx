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

const randomColor = () => {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`
}

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

    if (!formData.state.trim())
      newErrors.state = "State is required"

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
                  label="Name *"
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
                  label="Address *"
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

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <Input
                    type="text"
                    label="City *"
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

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <Input
                    type="text"
                    label="State *"
                    name="state"
                    placeholder="Enter state"
                    onChange={(value) => handleChange("state", value)}
                  />
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
                  label="Manager *"
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
