import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:3000/api/v1',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    }})

export default api
