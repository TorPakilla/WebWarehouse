import axios from "./config";
import { API_BASE_URL } from "./config";


import axiosInstance from "../config/axiosInstance"; // Import axiosInstance

// ดึง Branch ทั้งหมดจาก API
export const fetchBranches = async () => {
    try {
        const response = await axiosInstance.get("/Branches");
        console.log("Fetched branches:", response.data); // Debug ข้อมูลจาก API
        if (response.data && Array.isArray(response.data.branches)) {
            return response.data.branches; // ส่งเฉพาะ Array ของ branches
        } else {
            console.error("Branches data format is invalid");
            return []; // ถ้าโครงสร้างไม่ตรง ให้ส่ง array ว่าง
        }
    } catch (error) {
        console.error("Error fetching branches:", error);
        return []; // ถ้าดึงข้อมูลไม่ได้ ให้ส่ง array ว่าง
    }
};



export const createBranch = async (branchData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/branches`, branchData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error creating branch:", error);
        throw error;
    }
};

export const updateBranch = async (id, branchData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/branches/${id}`, branchData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error updating branch:", error);
        throw error;
    }
};

export const deleteBranch = async (id) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/branches/${id}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error deleting branch:", error);
        throw error;
    }
};
