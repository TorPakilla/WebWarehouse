import axiosInstance from '../config/axiosInstance';

export const fetchSuppliers = async () => {
    const response = await axiosInstance.get('/Supplier');
    return response.data.data;
};

export const fetchProducts = async () => {
    try {
        const response = await axiosInstance.get('/Product');
        return response.data.products || []; // Access the correct key in the API response
    } catch (error) {
        console.error('Error fetching products:', error);
        return []; // Return an empty array on failure
    }
};


export const createSupplier = async (supplier) => {
    await axiosInstance.post('/Supplier', supplier);
};

export const updateSupplier = async (id, supplier) => {
    await axiosInstance.put(`/Supplier/${id}`, supplier);
};

export const deleteSupplier = async (id) => {
    await axiosInstance.delete(`/Supplier/${id}`);
};
