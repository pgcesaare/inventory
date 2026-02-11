import Input from "../inputs/input"
import { useState, useEffect } from "react"
import { useToken } from "../../api/useToken"
import SelectInput from "../../components/selectInput"
import sexOptions from "../../api/sex/sexOptions"
import calfTypeOptions from "../../api/calfTypeOptions"
import { useAppContext } from "../../context"
import { useParams } from "react-router-dom"
import { getRanchById } from "../../api/ranches"
import { createCalf } from "../../api/calves"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
dayjs.extend(utc)

const AddOneByOne = () => {
  const token = useToken()
  const { ranch, setRanch } = useAppContext()
  const { id } = useParams()
  const [formData, setFormData] = useState(null)

  useEffect(() => {
    if (!ranch && token && id) {
      const fetchRanch = async () => {
        try {
          const data = await getRanchById(id, token)
          setRanch(data)
        } catch (err) {
          console.error(err)
        }
      }
      fetchRanch()
    }
  }, [ranch, id, token])

  useEffect(() => {
    if (!ranch) return
    setFormData({
      primaryID: "",
      EID: "",
      originalID: "",
      placedDate: "",
      breed: "",
      sex: "",
      price: "",
      seller: "",
      currentRanchID: ranch.id,
      originRanchID: ranch.id,
      status: "feeding",
      condition: "good",
      calfType: "",
      daysOnFeed: 0,
    })
  }, [ranch])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    try {
      const formatedDate = {
        ...formData,
        placedDate: formData.placedDate
        ? dayjs(formData.placedDate).utc().startOf('day').toISOString()
        : null,        
      }
      createCalf(formatedDate, token)
      console.log('calf succesfully created')
    } catch (error) {
      console.log("there was an error")
    }
  }
    
    return (
            <>
      <div className="flex flex-col">
        <div>Add Calves</div>
        {formData ? (
          <form onSubmit={handleSubmit}>
            <div className="flex flex-row gap-4">
              <Input name="primaryID" label="Tag Number" placeholder="Enter tag number" onChange={handleChange} />
              <Input name="EID" label="EID Number" placeholder="Enter EID number" onChange={handleChange} />
            </div>
            <div className="flex flex-row gap-4">
              <Input name="originalID" label="Original ID" placeholder="Enter original ID" onChange={handleChange} />
              <Input name="placedDate" label="Placed date" type="date" onChange={handleChange} />
            </div>
            <div className="flex flex-row gap-4">
              <Input name="breed" label="Breed" placeholder="Enter calf breed" onChange={handleChange} />
              <SelectInput
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                options={sexOptions.map(opt => ({ id: opt.value, name: opt.label }))}
                label="Select Sex"
              />
            </div>
            <div className="flex flex-row gap-4">
              <Input name="seller" label="Seller" placeholder="Enter calf seller" onChange={handleChange} />
              <Input name="price" label="Price" type="number" placeholder="Enter price" onChange={handleChange} />
            </div>
            <div className="flex flex-row gap-4">
              <Input name="condition" label="Condition" type="text" placeholder="Enter calf condition" onChange={handleChange} />
              <SelectInput
                name="calfType"
                value={formData.calfType}
                onChange={handleChange}
                options={calfTypeOptions.map(opt => ({ id: opt.value, name: opt.label }))}
                label="Select Calf Type"
              />
            </div>
            <Input name="daysOnFeed" label="Days on Feed" type="number" placeholder="Enter days on feed" onChange={handleChange} />
            <button type="submit" className="border px-3 py-1 bg-blue-500 w-full text-white">
              Save
            </button>
          </form>
        ) : (
          <div>Loading ranch info...</div>
        )}
      </div>
    </>
    )
}

export default AddOneByOne