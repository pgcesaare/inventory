import api from '../api'
import { normalizeRanchDisplay } from "../../utils/ranchDisplay"

const normalizeCalfRanchDisplay = (calf) => {
  if (!calf || typeof calf !== "object") return calf
  return {
    ...calf,
    origin: normalizeRanchDisplay(calf.origin),
    destination: normalizeRanchDisplay(calf.destination),
    currentRanch: normalizeRanchDisplay(calf.currentRanch),
  }
}

const normalizeCalfListRanchDisplay = (items) => (
  Array.isArray(items) ? items.map((item) => normalizeCalfRanchDisplay(item)) : []
)

const normalizeMovementEventRanchDisplay = (event) => {
  if (!event || typeof event !== "object") return event
  return {
    ...event,
    fromRanch: normalizeRanchDisplay(event.fromRanch),
    toRanch: normalizeRanchDisplay(event.toRanch),
    load: event.load && typeof event.load === "object"
      ? {
          ...event.load,
          origin: normalizeRanchDisplay(event.load.origin),
          destination: normalizeRanchDisplay(event.load.destination),
        }
      : event.load,
  }
}

const normalizeMovementHistoryPayload = (payload) => {
  if (payload === null || payload === undefined) return payload

  if (Array.isArray(payload)) {
    return {
      calf: null,
      events: payload.map((event) => normalizeMovementEventRanchDisplay(event)),
    }
  }

  if (typeof payload !== "object") {
    return {
      calf: null,
      events: [],
    }
  }

  return {
    ...payload,
    calf: payload.calf && typeof payload.calf === "object"
      ? normalizeCalfRanchDisplay(payload.calf)
      : payload.calf ?? null,
    events: Array.isArray(payload.events)
      ? payload.events.map((event) => normalizeMovementEventRanchDisplay(event))
      : [],
  }
}

export const getCalvesByRanch = async (id, token) => {
    try {
      const response = await api.get(`/calves/ranch/${id}`, 
        { 
        
            headers: { Authorization: `Bearer ${token}` } 
        
        })
      return normalizeCalfListRanchDisplay(response.data)
      
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
      return normalizeCalfListRanchDisplay(response.data)
      
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
      return normalizeCalfListRanchDisplay(response.data)

    } catch (error) {
      console.error('Error fetching manage calves:', error)
      throw error
    }
}

export const createCalf = async (calf, token, options = {}) => {
    try {
      const extraHeaders = options?.headers && typeof options.headers === "object" ? options.headers : {}
      const response = await api.post(`/calves`, calf, 
        { 
        
            headers: 
            { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              ...extraHeaders,
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
      return normalizeMovementHistoryPayload(response.data)

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
