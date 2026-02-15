import api from "../api"

export const getBreeds = async (token) => {
  try {
    const response = await api.get("/breeds", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Error fetching breeds:", error)
    throw error
  }
}

export const createBreed = async (payload, token) => {
  try {
    const response = await api.post("/breeds", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    return response.data
  } catch (error) {
    console.error("Error creating breed:", error)
    throw error
  }
}

export const updateBreed = async (id, payload, token) => {
  try {
    const response = await api.patch(`/breeds/${id}`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    return response.data
  } catch (error) {
    console.error("Error updating breed:", error)
    throw error
  }
}

export const deleteBreed = async (id, token) => {
  try {
    const response = await api.delete(`/breeds/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  } catch (error) {
    console.error("Error deleting breed:", error)
    throw error
  }
}
