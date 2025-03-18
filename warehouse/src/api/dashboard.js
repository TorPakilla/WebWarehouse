import axiosInstance from "../config/axiosInstance";

export const getUserData = async () => {
  try {
    const response = await axiosInstance.get("/Employees");
    return response.data.Data[0];
  } catch (error) {
    console.error("Error fetching user data:", error.response?.data || error.message);
    return null;
  }
};

export const getInventoryByCategory = async () => {
  try {
    const response = await axiosInstance.get("/inventory-by-category");
    return response.data.categories;
  } catch (error) {
    console.error("Error fetching inventory categories:", error.response?.data || error.message);
    return [];
  }
};

export const getShipments = async () => {
    const response = await fetch("http://localhost:5050/Shipments");
    return response.json();
  };
  
  

  export const getPendingShipments = async () => {
    try {
      const response = await fetch("http://localhost:5050/Shipments"); // Update this URL based on your actual API endpoint
      if (!response.ok) {
        throw new Error('Failed to fetch pending shipments');
      }
      const data = await response.json();
      return data; // Assuming the API returns an array of pending shipments
    } catch (error) {
      console.error('Error fetching pending shipments:', error);
      return [];
    }
  };