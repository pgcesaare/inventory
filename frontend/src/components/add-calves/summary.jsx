import { useAppContext } from "../../context"
import sexOptions from "../../api/sex/sexOptions"
import { createCalf } from "../../api/calves"
import { useToken } from "../../api/useToken"

const Summary = ({ breeds }) => {
    const token = useToken()
    const { calves, setCalves } = useAppContext()

  const groupCounts = calves.reduce((acc, calf) => {
    const key = `${calf.breedID}-${calf.sex}-${calf.price}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const summary = Object.entries(groupCounts).map(([key, count]) => {
    const [breedID, sex, price] = key.split("-")
    const breed = breeds.find(b => b.id === Number(breedID))
    const breedName = breed?.name || "Unknown breed"
    const sexLabel = sexOptions.find(option => option.value === sex)?.label || "Unknown"

    return { breedName, sexLabel, price, count }
  })

  const sendAll = async () => {
    try {
      await Promise.all(
        calves.map(calf =>
          createCalf(calf, token)
        )
      )
      console.log("✅ Todos los calves enviados correctamente")
    } catch (error) {
      console.error("❌ Error al enviar:", error)
    }
    setCalves([])
  }

  return (
    <div>
      <h3 className="font-bold text-lg mb-2">Summary</h3>
      {summary.length === 0 ? (
        <p>No calves added yet.</p>
      ) : (
        <ul className="border border-gray-300 rounded-md p-4 mb-4">
          {summary.map((item, i) => (
            <li key={i}>
              {item.breedName} {item.sexLabel} {item.count}
            </li>
          ))}
        </ul>
      )}
      <button onClick={sendAll} className="text-white p-2 bg-blue-500 w-full">Send</button>
    </div>
  )
}

export default Summary