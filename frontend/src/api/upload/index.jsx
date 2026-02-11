import api from '../api'

export const uploadFile = async (formData, token) => {
    try {
      const response = await api.post(`/upload`,
        formData,
        { 
        
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            } 
        
        })
      return response.data
      
    } catch (error) {
      console.error(error)
      throw error
    }
}