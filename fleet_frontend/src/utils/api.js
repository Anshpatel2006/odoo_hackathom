import axios from 'axios';

const api = axios.create({
    baseURL: '/api'
});

// Add request interceptor to include JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

/**
 * Safely extract a display string from any error shape.
 * Handles: Axios error (string | {message} from backend), plain Error, fallback.
 */
export const getErrMsg = (err, fallback = 'Something went wrong') => {
    const raw = err?.response?.data?.error;
    if (typeof raw === 'string') return raw;
    if (raw?.message) return raw.message;
    if (err?.message) return err.message;
    return fallback;
};

export default api;
