import axios from "./config";
import { API_BASE_URL } from "./config";

// Fetch all employees
export const fetchEmployees = async () => {
    const response = await axios.get(`${API_BASE_URL}/Employees`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });
    return response.data;
};

// Create a new employee
export const createEmployee = async (employeeData) => {
    const response = await axios.post(`${API_BASE_URL}/Employees`, employeeData, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });
    return response.data;
};

// Update an employee
export const updateEmployee = async (id, employeeData) => {
    const response = await axios.put(`${API_BASE_URL}/Employees/${id}`, employeeData, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });
    return response.data;
};

// Delete an employee
export const deleteEmployee = async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/Employees/${id}`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });
    return response.data;
};
