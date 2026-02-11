import React, { useEffect, useState } from 'react'
import { getRanches, getRanchById } from '../api/ranches'   
import { useToken } from '../api/useToken'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context'

const Dashboard = () => {

  const [ranches, setRanches] = useState([])
  const token = useToken()
  const navigate = useNavigate()
  const { setRanch } = useAppContext()

  useEffect(() => {

    if (!token) return

    const fetchRanches = async () => {
      try {
        const data = await getRanches(token);
        setRanches(data)
      } catch (error) {
        console.error("Error fetching ranches:", error);
      }
    }
    fetchRanches()
    }, [token])

    const handleSelect = async (data) => {
        try {
            const ranchData = await getRanchById(data.id, token)
            setRanch(ranchData)
            navigate(`/dashboard/ranch/${ranchData.id}/historical`)
            } catch (error) {
            console.error('Error fetching ranch details:', error)
        }
    }

  return (
    <div className='w-full h-full'>
      <h1 className='text-xl font-bold'>Dashboard</h1>
      <ul className='flex flex-col items-center'>
        {ranches.map(ranch => (
          <li key={ranch.id} 
            onClick={() => handleSelect(ranch)}>
            {ranch.name}
        </li>
        ))}
      </ul>
    </div>
  )
}

export default Dashboard
