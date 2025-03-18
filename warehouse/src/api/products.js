import axiosInstance from "../config/axiosInstance";

export const fetchProducts = async () => {
    try {
        const response = await axiosInstance.get("/Product");
        console.log("API Response:", response.data); // ✅ Debug API Response
        return response;
    } catch (error) {
        console.error("Error fetching products:", error);
        return { data: { products: [] } }; // ถ้ามีข้อผิดพลาดให้คืนค่าเริ่มต้น
    }
};


export const createProduct = async (formData) => {
    return axiosInstance.post("/Product", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
};

export const updateProduct = async (id, formData) =>
    axiosInstance.put(`/Product/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });

export const deleteProduct = async (id) => axiosInstance.delete(`/Product/${id}`);

export const fetchProductById = async (id) => axiosInstance.get(`/Product/${id}`);