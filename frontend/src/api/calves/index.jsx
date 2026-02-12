import api from '../api'

export const getCalvesByRanch = async (id, token) => {
    try {
      const response = await api.get(`/calves/ranch/${id}`, 
        { 
        
            headers: { Authorization: `Bearer ${token}` } 
        
        })
      return response.data
      
    } catch (error) {
      console.error('Error fetching calves:', error)
      throw error
    }
}

export const getInventoryByRanch = async (id, token) => {
      try {
      const response = await api.get(`/calves/inventory/${id}`, 
        { 
        
            headers: { Authorization: `Bearer ${token}` } 
        
        })
      return response.data
      
    } catch (error) {
      console.error('Error fetching calves:', error)
      throw error
    }
}

export const getManageCalvesByRanch = async (id, token) => {
    try {
      const response = await api.get(`/calves/manage/${id}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        })
      return response.data

    } catch (error) {
      console.error('Error fetching manage calves:', error)
      throw error
    }
}

export const createCalf = async (calf, token) => {
    try {
      const response = await api.post(`/calves`, calf, 
        { 
        
            headers: 
            { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            } 
        
        })
      return response.data
      
    } catch (error) {
      console.error('Error fetching calves:', error)
      throw error
    }
}

export const getCalfMovementHistory = async (id, token) => {
    try {
      const response = await api.get(`/calves/${id}/movement-history`,
        {
            headers: { Authorization: `Bearer ${token}` }

        })
      return response.data

    } catch (error) {
      console.error('Error fetching calf movement history:', error)
      throw error
    }
}

export const updateCalf = async (id, calf, token) => {
    try {
      const response = await api.patch(`/calves/${id}`, calf,
        {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        })
      return response.data

    } catch (error) {
      console.error('Error updating calf:', error)
      throw error
    }
}

export const deleteCalf = async (id, token) => {
    try {
      const response = await api.delete(`/calves/${id}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        })
      return response.data

    } catch (error) {
      console.error('Error deleting calf:', error)
      throw error
    }
}
