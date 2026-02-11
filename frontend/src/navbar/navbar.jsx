import React, { useEffect } from 'react'
import { getRanchById } from '../api/ranches'   
import { useToken } from '../api/useToken'
import { useAppContext } from '../context'
import GoBack from "../components/goBack"
import { NavLink, useParams } from 'react-router-dom'


const Navbar = () => {
    
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

    return (
        <>
            {ranch &&
                <nav className="flex flex-col items-center gap-10 px-10 border-x border-gray-300 w-[280px]">
                    <GoBack />
                    <h2 className='text-lg font-bold'>{ranch.name}</h2>
                    <ul className='flex flex-col gap-5'>
                        <li>
                            <NavLink
                            to={`/dashboard/ranch/${ranch.id}/inventory`}
                                className={({ isActive }) =>
                                (isActive ? 'active-link' : undefined)
                                }>
                                    Inventory
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to={`/dashboard/ranch/${ranch.id}/historical`}
                                className={({ isActive }) => 
                                (isActive ? 'active-link' : undefined)
                                }>
                                    Historical
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to={`/dashboard/ranch/${ranch.id}/add-calves`}
                                className={({ isActive }) => 
                                (isActive ? 'active-link' : undefined)
                                }>
                                    Add calves
                            </NavLink>
                        </li>                             
                    </ul>
                </nav>
            }   
        </>
    )
}

export default Navbar