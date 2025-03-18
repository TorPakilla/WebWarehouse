import axios from "axios";

const API_BASE_URL = "http://localhost:5050"; // เปลี่ยน URL ตาม Backend ของคุณ

// ดึง token จาก localStorage
const token = localStorage.getItem("token");

// สร้าง instance ของ axios พร้อมตั้งค่าเริ่มต้น
const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "", // เพิ่ม Authorization header หากมี token
    },
});

// อัปเดต headers ใหม่ทุกครั้งที่มีการเปลี่ยนแปลง token
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
