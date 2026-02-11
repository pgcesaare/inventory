import { useState } from "react"
import Popup from "../popUp"
import Input from "../inputs/input"
import EnterButton from "../extra/EnterButton"
import ResetButton from "../extra/ResetButton"
import { useAppContext } from "../../context"
import { useToken } from "../../api/useToken"
import { createRanch } from "../../api/ranches"

const randomColor = () => {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`
}

const CreateNewRanch = () => {
  const token = useToken()
  const { setShowCreateNewRanchPopup, setRanches } = useAppContext()
  const [formData, setFormData] = useState({})

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      let newRanch = { ...formData, color: randomColor() }
      newRanch = await createRanch(newRanch, token)
      console.log("Ranch successfully created")
      setRanches(prev => [...prev, newRanch])
      setShowCreateNewRanchPopup(false)
    } catch (error) {
      console.error("Error creating ranch:", error)
    }
  }

  return (
    <Popup 
      title="Create new ranch"
      content={
        <form className="flex flex-col h-full" onSubmit={handleSubmit}>
          <div className="flex flex-col flex-1 gap-2">
            <Input 
              type="text"
              label="Name"
              name="name"
              placeholder="Enter ranch name"
              onChange={(value) => handleChange("name", value)}
            />
            <Input 
              type="text"
              label="Address"
              name="address"
              placeholder="Enter ranch address"
              onChange={(value) => handleChange("address", value)}
            />
            <Input 
              type="text"
              label="City"
              name="city"
              placeholder="Enter ranch city"
              onChange={(value) => handleChange("city", value)}
            />
            <Input 
              type="text"
              label="State"
              name="state"
              placeholder="Enter ranch state"
              onChange={(value) => handleChange("state", value)}
            />            
          </div>

          <div className="flex justify-end gap-2 mt-auto pt-4 border-t border-gray-200">
            <ResetButton text="Cancel" type="button" onClick={() => setShowCreateNewRanchPopup(false)} />
            <EnterButton text="Enter" />
          </div>
        </form>
      }
    />
  )
}

export default CreateNewRanch
