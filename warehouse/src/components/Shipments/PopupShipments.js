import React, { useState, useEffect } from "react";
import axiosInstance from "../../config/axiosInstance";
import { FaTimes } from "react-icons/fa";
import { getCategoryIcon, useAllCategories } from "../DynamicIcon.js";
import "./PopupShipments.css";

const PopupShipments = ({ fromBranch, toBranch, onClose }) => {
  const categories = useAllCategories();

  // State หลัก
  const [selectedCategory, setSelectedCategory] = useState("");
  const [warehouseProducts, setWarehouseProducts] = useState([]);
  const [selectedWarehouseProduct, setSelectedWarehouseProduct] = useState("");

  const [posProducts, setPosProducts] = useState([]);
  const [selectedPosProduct, setSelectedPosProduct] = useState("");
  const [shipmentQuantity, setShipmentQuantity] = useState("");

  const [warehouseInventoryID, setWarehouseInventoryID] = useState("");
  const [posInventoryID, setPosInventoryID] = useState("");
  const [productUnitID, setProductUnitID] = useState("");

  // Loading/Error
  const [loadingWarehouse, setLoadingWarehouse] = useState(false);
  const [errorWarehouse, setErrorWarehouse] = useState(null);
  const [loadingPos, setLoadingPos] = useState(false);
  const [errorPos, setErrorPos] = useState(null);

  // เมื่อเปลี่ยน Category => reset product
  useEffect(() => {
    if (!selectedCategory) {
      setWarehouseProducts([]);
      setSelectedWarehouseProduct("");
      setPosProducts([]);
      setSelectedPosProduct("");
      setShipmentQuantity("");
      return;
    }
    fetchProductsByCategory();
  }, [selectedCategory]);

  // เมื่อเปลี่ยน product ใน Warehouse => reset POS product
  useEffect(() => {
    if (!selectedWarehouseProduct) {
      setPosProducts([]);
      setSelectedPosProduct("");
      setShipmentQuantity("");
      return;
    }
    fetchMatchingProductsInPOS();
  }, [selectedWarehouseProduct]);

  const fetchProductsByCategory = async () => {
    setLoadingWarehouse(true);
    setErrorWarehouse(null);
    try {
      const response = await axiosInstance.get(
        `/GetProductsByCategoryAndBranch?branchId=${fromBranch}&category=${selectedCategory}`
      );
      setWarehouseProducts(response.data.products || []);
    } catch (error) {
      console.error("Error fetching products by category:", error);
      setErrorWarehouse("Failed to load warehouse products.");
    } finally {
      setLoadingWarehouse(false);
    }
  };

  const fetchMatchingProductsInPOS = async () => {
    setLoadingPos(true);
    setErrorPos(null);
    try {
      const response = await axiosInstance.get(
        `/GetMatchingProductsInPOS?branchId=${toBranch}&productName=${selectedWarehouseProduct}`
      );
      setPosProducts(response.data.products || []);
    } catch (error) {
      console.error("Error fetching matching products in POS:", error);
      setErrorPos("Failed to load POS products.");
    } finally {
      setLoadingPos(false);
    }
  };

  const handleConfirm = async () => {
    if (!warehouseInventoryID || !posInventoryID) {
      alert("Error: Warehouse or POS Inventory ID is missing.");
      return;
    }
    const quantityNumber = Number(shipmentQuantity);
    if (!quantityNumber || quantityNumber <= 0) {
      alert("Invalid quantity.");
      return;
    }

    const requestData = {
      from_branch_id: fromBranch,
      to_branch_id: toBranch,
      items: [
        {
          warehouse_inventory_id: warehouseInventoryID,
          pos_inventory_id: posInventoryID,
          product_unit_id: productUnitID || "",
          quantity: quantityNumber,
        },
      ],
    };

    try {
      const response = await axiosInstance.post("/Shipments", requestData);
      alert("Shipment created successfully!");
      onClose();
    } catch (error) {
      console.error("❌ Error creating shipment:", error.response?.data || error);
      alert(`Failed to create shipment: ${error.response?.data?.error || "Unknown error"}`);
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup-content dashboard-popup">
        <button className="close-btn" onClick={onClose}>
          <FaTimes />
        </button>
        <h3>Select Products for Shipment</h3>
        {/* Category List */}
        <div className="category-list">
          {categories.map((category, index) => {
            const iconData = getCategoryIcon(category);
            return (
              <div
                key={index}
                className={`category-item ${selectedCategory === category ? "selected" : ""}`}
                onClick={() => setSelectedCategory(category)}
              >
                {iconData.type === "image" ? (
                  <img src={iconData.value} alt={category} className="category-icon" />
                ) : (
                  <iconData.value className="category-icon" />
                )}
                <span>{category.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
        {/* Warehouse Products */}
        {selectedCategory && (
          <>
            <label>Select Product from Warehouse:</label>
            {loadingWarehouse && <p>Loading warehouse products...</p>}
            {errorWarehouse && <p style={{ color: "red" }}>{errorWarehouse}</p>}
            <select
              value={selectedWarehouseProduct}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedWarehouseProduct(val);
                const product = warehouseProducts.find(
                  (p) => p.product_name.trim().toLowerCase() === val.trim().toLowerCase()
                );
                if (product) {
                  setWarehouseInventoryID(product.inventory_id || product.product_id);
                } else {
                  setWarehouseInventoryID("");
                }
              }}
            >
              <option value="">Select Product</option>
              {warehouseProducts.map((product) => (
                <option key={product.product_id} value={product.product_name}>
                  {product.product_name} - Qty: {product.quantity}
                </option>
              ))}
            </select>
          </>
        )}
        {/* POS Products */}
        {selectedWarehouseProduct && (
          <>
            <label>Select Matching Product from POS:</label>
            {loadingPos && <p>Loading POS products...</p>}
            {errorPos && <p style={{ color: "red" }}>{errorPos}</p>}
            <select
              value={selectedPosProduct}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedPosProduct(val);
                const product = posProducts.find(
                  (p) => p.product_name.trim().toLowerCase() === val.trim().toLowerCase()
                );
                if (product) {
                  setPosInventoryID(product.inventory_id || product.product_id);
                  setProductUnitID(product.product_unit_id);
                } else {
                  setPosInventoryID("");
                  setProductUnitID("");
                }
              }}
            >
              <option value="">Select Matching Product</option>
              {posProducts.map((product) => (
                <option key={product.product_id} value={product.product_name}>
                  {product.product_name} - Qty: {product.quantity}
                </option>
              ))}
            </select>
          </>
        )}
        {/* Quantity */}
        {selectedPosProduct && (
          <>
            <label>Enter Quantity to Ship:</label>
            <input
              type="number"
              min="1"
              value={shipmentQuantity}
              onChange={(e) => setShipmentQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
          </>
        )}
        <button
          className="confirm-btn"
          disabled={!selectedPosProduct || !shipmentQuantity}
          onClick={handleConfirm}
        >
          Confirm Selection
        </button>
      </div>
    </div>
  );
};

export default PopupShipments;
