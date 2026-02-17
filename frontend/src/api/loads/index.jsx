import api from '../api'
import { formatRanchDisplayName, normalizeRanchDisplay } from "../../utils/ranchDisplay"

const normalizeLoadRanchDisplay = (load) => {
  if (!load || typeof load !== "object") return load

  return {
    ...load,
    origin: normalizeRanchDisplay(load.origin),
    destination: normalizeRanchDisplay(load.destination),
    counterpartyName: formatRanchDisplayName(load.counterpartyName),
    destinationName: formatRanchDisplayName(load.destinationName),
    shippedTo: formatRanchDisplayName(load.shippedTo),
  }
}

const normalizeLoadList = (items) => (
  Array.isArray(items) ? items.map((item) => normalizeLoadRanchDisplay(item)) : []
)

export const getLoadsByRanch = async (id, token) => {
    try {
      const response = await api.get(`/loads/ranch/${id}`, 
        { 
        
            headers: { Authorization: `Bearer ${token}` } 
        
        })
      return normalizeLoadList(response.data)
      
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
      return normalizeLoadRanchDisplay(response.data)

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
      return normalizeLoadRanchDisplay(response.data)

    } catch (error) {
      console.error('Error creating load:', error)
      throw error
    }
}

export const updateLoad = async (id, payload, token) => {
    try {
      const response = await api.patch(`/loads/${id}`, payload,
        {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        })
      return normalizeLoadRanchDisplay(response.data)

    } catch (error) {
      console.error('Error updating load:', error)
      throw error
    }
}

export const updateLoadCalfArrivalStatus = async (id, payload, token) => {
    try {
      const response = await api.patch(`/loads/${id}/calf-status`, payload,
        {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        })
      return normalizeLoadRanchDisplay(response.data)

    } catch (error) {
      console.error('Error updating load calf arrival status:', error)
      throw error
    }
}

export const deleteLoad = async (id, token) => {
    try {
      const response = await api.delete(`/loads/${id}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        })
      return response.data

    } catch (error) {
      console.error('Error deleting load:', error)
      throw error
    }
}
