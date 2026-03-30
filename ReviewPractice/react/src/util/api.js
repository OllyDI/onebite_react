import axios from "axios";

// export const api = axios.create({
//     baseURL: 'http://localhost:15001',
//     withCredentials: true,
// })

export const api = axios.create({
    baseURL: 'https://onebite-books-backend.vercel.app',
    withCredentials: true,
})

const isMobile = () => {
    return /android|iphone|ipad|ipod/i.test(
        navigator.userAgent
    );
}

// Authorization header 추가
api.interceptors.request.use((config) => {
    
    if (isMobile()) {
        
        const token = localStorage.getItem('accessToken');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }

    return config
})