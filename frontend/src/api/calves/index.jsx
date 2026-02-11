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