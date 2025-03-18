import React, { useState, useEffect } from "react";
import { FaCarrot, FaLaptop, FaBoxOpen, FaPumpSoap, FaGift, FaAppleAlt, FaCapsules, FaTshirt, FaBaby, FaPenFancy } from "react-icons/fa";
import { MdFastfood } from "react-icons/md";
import "./Products.css";
import axiosInstance from "../../config/axiosInstance";

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

const normalizeCategory = (category) => category?.trim().toLowerCase();

const ProductList = ({ products }) => {
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        console.log("Products Data:", products);
    }, [products]);

    const groupedProducts = products.reduce((acc, product) => {
        const category = normalizeCategory(product.description);
        if (!category) return acc;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {});

    console.log("Grouped Products:", groupedProducts);

    return (
        <div className="product-list-container">
            {Object.keys(groupedProducts).map((category) => {
                const IconComponent = categoryIcons[category] || FaBoxOpen;
                console.log("Rendering Category:", category, "Products:", groupedProducts[category]);
                return (
                    <div key={category} className="category-section">
                        <div className="category-header" onClick={() => setSelectedCategory(category)}>
                            <IconComponent size={50} />
                            <h2>{category.toUpperCase()}</h2>
                        </div>
                        {selectedCategory === category && (
                            <div className="product-popup">
                                <div className="product-popup-header">
                                    <h2>{category.toUpperCase()}</h2>
                                    <button className="popup-close-button" onClick={() => setSelectedCategory(null)}>✖</button>
                                </div>
                                <div className="product-popup-content">
                                    {groupedProducts[category].map((product) => (
                                        <div key={product.product_id} className="product-popup-item">
                                            <h3>{product.product_name}</h3>
                                            <p><strong>Type:</strong> {product.type}</p>
                                            <p><strong>Initial Quantity:</strong> {product.initial_quantity}</p>
                                            <p><strong>Price:</strong> ${product.price}</p>
                                            <p><strong>Branch:</strong> {product.branch_id}</p>
                                            {product.image && (
                                                <img src={`data:image/jpeg;base64,${product.image}`} alt={product.product_name} className="product-popup-image" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ProductList;
