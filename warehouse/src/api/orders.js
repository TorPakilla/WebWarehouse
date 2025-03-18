// src/api/orders.js
import axios from "axios";

const API_URL = "http://localhost:5050"; // Your API URL

// Fetching suppliers, employees, products
export const fetchSuppliers = async () => {
    const response = await axios.get(`${API_URL}/suppliers`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });
    return response.data; // return data to be used
};

export const fetchEmployees = async () => {
    const response = await axios.get(`${API_URL}/employees`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });
    return response.data;
};

export const fetchProducts = async () => {
    const response = await axios.get(`${API_URL}/products`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });
    return response.data;
};

export const fetchOrders = async () => {
    try {
        const response = await axios.get(`${API_URL}/orders`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`, // ส่ง token
            },
        });
        
        console.log("API Response:", response.data); // ตรวจสอบข้อมูลจาก API
        return response.data; // ส่งข้อมูลกลับ
    } catch (error) {
        console.error("Error fetching orders:", error);
        throw new Error("Error fetching orders.");
    }
};
