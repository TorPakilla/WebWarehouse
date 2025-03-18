import axios from "axios";

const API_BASE_URL = "http://localhost:5050"; // เปลี่ยน URL ตาม Backend ของคุณ

const token = localStorage.getItem("token");

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        const newToken = localStorage.getItem("token");
        if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default axiosInstance;
export { API_BASE_URL };
