import api from '../api'

export const getRanches = async (token) => {
    try {
      const response = await api.get('/ranches', 
        { 
        
            headers: { Authorization: `Bearer ${token}` } 
        
        })
      return response.data
      
    } catch (error) {
      console.error('Error fetching ranches:', error)
      throw error
    }
}

export const getRanchById = async (id, token) => {
    try {
      const response = await api.get(`/ranches/${id}`, 
        { 
        
            headers: { Authorization: `Bearer ${token}` } 
        
        })
      return response.data
      
    } catch (error) {
      console.error('Error fetching ranches:', error)
      throw error
    }
}

export const createRanch = async (ranch, token) => {
    try {
      const response = await api.post(`/ranches`, ranch, 
        { 
        
            headers: 
            { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            } 
        
        })
      return response.data
      
    } catch (error) {
      console.error('Error fetching ranches:', error)
      throw error
    }
}

