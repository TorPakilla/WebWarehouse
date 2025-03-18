import axiosInstance from "../config/axiosInstance";

// Fetch all products
export const fetchProducts = async () => {
    const response = await axiosInstance.get("/Product");
    return response.data.data || []; // Ensure fallback to an empty array
};

// Fetch all product units
export const fetchProductUnits = async () => {
    const response = await axiosInstance.get("/ProductUnits");
    return response.data.data || [];
};

// Fetch all branches
export const fetchBranches = async () => {
    const response = await axiosInstance.get("/Branch");
    return response.data.data || [];
};

// Fetch all inventories
export const fetchInventories = async () => {
    const response = await axiosInstance.get("/Inventory");
    return response.data.data || [];
};

// Add a new product
export const createProduct = async (data) => {
    const response = await axiosInstance.post("/Product", data);
    return response.data;
};

// Add a new product unit
export const createProductUnit = async (data) => {
    const response = await axiosInstance.post("/ProductUnits", data);
    return response.data;
};

// Update a product
export const updateProduct = async (id, data) => {
    const response = await axiosInstance.put(`/Product/${id}`, data);
    return response.data;
};

// Delete a product
export const deleteProduct = async (id) => {
    const response = await axiosInstance.delete(`/Product/${id}`);
    return response.data;
};

// Create an inventory record
export const createInventory = async (inventoryData) => {
    const response = await axiosInstance.post("/Inventory", inventoryData);
    return response.data.data;
};

// Delete an inventory record
export const deleteInventory = async (id) => {
    const response = await axiosInstance.delete(`/Inventory/${id}`);
    return response.data.message;
};

export const fetchPosLowStock = async () => {
    try {
      const response = await axiosInstance.get("/GetPosLowStock");
      return response.data.inventory_summary || [];
    } catch (error) {
      console.error("Error fetching POS Low Stock:", error);
      return [];
    }
  };

  export const fetchInventoryByCategory = async () => {
    try {
        const response = await axiosInstance.get("/inventory-by-category");
        return response.data.categories || [];
    } catch (error) {
        console.error("Error fetching inventory by category:", error);
        return [];
    }
};
