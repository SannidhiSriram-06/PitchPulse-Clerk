import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
    timeout: 120000,
})

let getTokenGetter = null
export const setAuthToken = (getTokenFn) => {
    getTokenGetter = getTokenFn
}

// Auto-attach token to every request
api.interceptors.request.use(async (config) => {
    if (getTokenGetter) {
        const token = await getTokenGetter()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
    }
    return config
})

// Auto-redirect to login on 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isSharePage = window.location.pathname.startsWith('/brief/share/')
            if (!isSharePage) {
                window.location.href = '/sign-in'
            }
        }
        return Promise.reject(error)
    }
)

export default api