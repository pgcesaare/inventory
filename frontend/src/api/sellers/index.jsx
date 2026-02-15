import api from "../api"

export const getSellers = async (token) => {
  try {
    const response = await api.get("/sellers", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Error fetching sellers:", error)
    throw error
  }
}

export const createSeller = async (payload, token) => {
  try {
    const response = await api.post("/sellers", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    return response.data
  } catch (error) {
    console.error("Error creating seller:", error)
    throw error
  }
}

export const updateSeller = async (id, payload, token) => {
  try {
    const response = await api.patch(`/sellers/${id}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    return response.data
  } catch (error) {
    console.error("Error updating seller:", error)
    throw error
  }
}

export const deleteSeller = async (id, token) => {
  try {
    const response = await api.delete(`/sellers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Error deleting seller:", error)
    throw error
  }
}
