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

export const updateRanch = async (id, ranch, token) => {
    try {
      const response = await api.patch(`/ranches/${id}`, ranch,
        {
            headers:
            {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }

        })
      return response.data

    } catch (error) {
      console.error('Error updating ranch:', error)
      throw error
    }
}

export const deleteRanch = async (id, token) => {
    try {
      const response = await api.delete(`/ranches/${id}`,
        {
            headers: { Authorization: `Bearer ${token}` }

        })
      return response.data

    } catch (error) {
      console.error('Error deleting ranch:', error)
      throw error
    }
}
