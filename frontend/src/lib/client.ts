import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : (process.env.NODE_ENV === 'production'
        ? 'https://retrocharting-backend.onrender.com'
        : 'http://127.0.0.1:8000');

export const API_URL = `${BASE_URL}/api/v1`;

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Auto-inject token from localStorage
apiClient.interceptors.request.use(
    (config) => {
        // Only on client side
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        // If config already has Authorization (explicit override), it stays? 
        // Axios merges? No, assignment overwrites. 
        // Good.
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Global Error Handling (Optional)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized globally?
        // if (error.response?.status === 401) { ... }
        return Promise.reject(error);
    }
);
