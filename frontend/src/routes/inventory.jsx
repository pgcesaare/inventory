import React, { useEffect } from "react"
import { useParams } from "react-router-dom"
import { useToken } from "../api/useToken"
import { getRanchById } from "../api/ranches"
import { useAppContext } from "../context"
import InventoryTable from "../components/inventory/inventoryTable"
import RoutesTemplate from "../template/routesTemplate"

const Inventory = () => {

    const { id } = useParams()
    const token = useToken()
    const { ranch, setRanch } = useAppContext()

    useEffect(() => {
      if (!ranch && token && id) {
        const fetchRanch = async () => {
          try {
            const data = await getRanchById(id, token)
            setRanch(data)
          } catch (err) {
            console.error("Error loading ranch:", err)
          }
        }
        fetchRanch()
    }
    }, [ranch, id, token])

      if (!ranch) {
        return <div>Loading ranch data...</div>
      }


    return (
        <>
          <RoutesTemplate
            principalTable={<InventoryTable ranchId={ranch.id} />}
          />
        </>
    )
}

export default Inventory