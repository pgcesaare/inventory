import api from '../api'

export const getLoadsByRanch = async (id, token) => {
    try {
      const response = await api.get(`/loads/ranch/${id}`, 
        { 
        
            headers: { Authorization: `Bearer ${token}` } 
        
        })
      return response.data
      
    } catch (error) {
      console.error('Error fetching calves:', error)
      throw error
    }
}

export const getLoadById = async (id, token) => {
    try {
      const response = await api.get(`/loads/${id}`,
        {
            headers: { Authorization: `Bearer ${token}` }

        })
      return response.data

    } catch (error) {
      console.error('Error fetching load:', error)
      throw error
    }
}

export const createLoad = async (payload, token) => {
    try {
      const response = await api.post(`/loads`, payload,
        {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        })
      return response.data

    } catch (error) {
      console.error('Error creating load:', error)
      throw error
    }
}
