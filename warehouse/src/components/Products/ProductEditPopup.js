import React, { useState } from "react";
import { FaCarrot, FaLaptop, FaBoxOpen, FaPumpSoap, FaGift, FaAppleAlt, FaCapsules, FaTshirt, FaBaby, FaPenFancy } from "react-icons/fa";
import { MdFastfood } from "react-icons/md";

const categoryIcons = {
    "food and beverages": MdFastfood,
    "fruits and vegetables": FaCarrot,
    "electronics": FaLaptop,
    "consumer goods": FaBoxOpen,
    "personal care": FaPumpSoap,
    "specialty products": FaGift,
    "seasonal products": FaAppleAlt,
    "pharmaceutical and health products": FaCapsules,
    "fresh produce": FaCarrot,
    "fashion": FaTshirt,
    "toys and kids' products": FaBaby,
    "stationery and office supplies": FaPenFancy
};

const ProductEditPopup = ({ selectedProduct, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        product_name: selectedProduct?.product_name || '',
        type: selectedProduct?.type || '',
        price: selectedProduct?.price || 0,
        description: selectedProduct?.description || '',
        image: selectedProduct?.image || null,
        // initial_quantity ไม่ต้องแสดงใน Popup
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onSave(formData);  // ส่งข้อมูลที่แก้ไขกลับไป
        onClose();  // ปิด popup
    };

    return (
        <div className="product-edit-popup">
            <h2>Edit Product</h2>
            <div className="product-edit-form">
                {/* รายละเอียดอื่น ๆ ที่จะแสดง */}
                <label>Product Name</label>
                <input
                    type="text"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleChange}
                />
                <label>Type</label>
                <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                >
                    <option value="Pallet">Pallet</option>
                    <option value="Box">Box</option>
                    <option value="Pieces">Pieces</option>
                </select>
                <label>Price</label>
                <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                />
                <label>Description</label>
                <select
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                >
                    {Object.keys(categoryIcons).map((category) => (
                        <option key={category} value={category}>
                            {category.toUpperCase()}
                        </option>
                    ))}
                </select>
                <label>Image</label>
                <input
                    type="file"
                    name="image"
                    onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                />
                <button onClick={handleSave}>Save</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};

export default ProductEditPopup;

