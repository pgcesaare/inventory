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
