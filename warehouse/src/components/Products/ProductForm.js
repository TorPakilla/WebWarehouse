import React, { useState, useEffect } from "react";
import { categoryIcons } from "../DynamicIcon"; // ✅ ใช้ categoryIcons โดยตรง

const ProductForm = ({ onSubmit, selectedProduct, formData = {} }) => {
    const categories = Object.keys(categoryIcons).map(cat => cat.toUpperCase()); // ✅ แปลงเป็นตัวพิมพ์ใหญ่ทั้งหมด
    const [formState, setFormState] = useState({
        product_name: "",
        type: "",
        price: 0,
        description: categories.length > 0 ? categories[0] : "", // ✅ ใช้หมวดหมู่แรกเป็นค่าเริ่มต้น
        initial_quantity: 0,
        image: null,
        ...formData,
    });

    useEffect(() => {
        if (!formState.description && categories.length > 0) {
            setFormState((prev) => ({
                ...prev,
                description: categories[0], // ✅ ตั้งค่า default ให้ถูกต้อง
            }));
        }
    }, [categories]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormState((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formState);
    };

    return (
        <form onSubmit={handleSubmit} className="product-form">
            <label>Product Name</label>
            <input type="text" name="product_name" value={formState.product_name} onChange={handleChange} required />

            <label>Type</label>
            <select name="type" value={formState.type} onChange={handleChange} required>
                <option value="">Select Type</option>
                <option value="Pallet">Pallet</option>
                <option value="Box">Box</option>
                <option value="Pieces">Pieces</option>
            </select>

            <label>Price (TH)</label>
            <input type="number" name="price" value={formState.price} onChange={handleChange} required />

            {/* ✅ ใช้หมวดหมู่จาก categoryIcons โดยตรง */}
            <label>Description (Category)</label>
            <select name="description" value={formState.description} onChange={handleChange} required>
                {categories.map((category) => (
                    <option key={category} value={category}>
                        {category.toUpperCase()}
                    </option>
                ))}
            </select>

            <label>Initial Quantity</label>
            <input type="number" name="initial_quantity" value={formState.initial_quantity} onChange={handleChange} required />

            <label>Image</label>
            <input type="file" name="image" onChange={(e) => setFormState({ ...formState, image: e.target.files[0] })} />

            <button type="submit">Save Product</button>
        </form>
    );
};

export default ProductForm;
