import axios from "axios";

// export const api = axios.create({
//     baseURL: 'http://localhost:15001',
//     withCredentials: true,
// })

export const api = axios.create({
    baseURL: 'https://onebite-books-backend.vercel.app',
    withCredentials: true,
})