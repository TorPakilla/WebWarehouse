import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FaTimes,
  FaCheck,
  FaArrowLeft,
  FaUserCircle,
  FaExclamationTriangle,
  FaTrash,
  FaPlus
} from "react-icons/fa";
import { getCategoryIcon } from "../components/DynamicIcon.js";
import Modal from "react-modal";
import "../components/Orders/Order.css";

const API_URL = "http://localhost:5050";

Modal.setAppElement("#root");

const getColor = (quantity) => {
  if (quantity === 0) return "low-stock-red";
  if (quantity < 150) return "low-stock-red";
  if (quantity < 500) return "low-stock-yellow";
  return "low-stock-white";
};

const OrderPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [pendingOrders, setPendingOrders] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [orderItems, setOrderItems] = useState([]);
  // State สำหรับ hover tooltip ของ category (ยังคงเหมือนเดิม)
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredCategoryDescription, setHoveredCategoryDescription] = useState(null);
  // State สำหรับ popup order details
  const [openOrderModal, setOpenOrderModal] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
    fetchPendingOrders();
  }, []);

  useEffect(() => {
    if (selectedSupplier) fetchProductsBySupplier(selectedSupplier);
  }, [selectedSupplier]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/inventory-by-category`);
      console.log("Fetched Categories:", response.data?.categories);
      setCategories(response.data?.categories || []);
    } catch (err) {
      console.error("Failed to fetch categories", err);
      setCategories([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API_URL}/Supplier`);
      setSuppliers(response.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/Orders?status=pending`);
      setPendingOrders(
        response.data?.data?.filter((order) => order.status === "Pending") || []
      );
    } catch (err) {
      console.error("Failed to fetch pending orders", err);
      setPendingOrders([]);
    }
  };

  const fetchProductsBySupplier = async (supplierId) => {
    try {
      const response = await axios.get(
        `${API_URL}/ProductsBySupplier?supplier_id=${supplierId}`
      );
      setFilteredProducts(response.data.products || []);
    } catch (error) {
      setFilteredProducts([]);
    }
  };

  const addProductToOrder = () => {
    if (selectedProduct && quantity > 0 && selectedSupplier) {
      const product = filteredProducts.find((p) => p.product_id === selectedProduct);
      if (product) {
        setOrderItems((prevItems) => [
          ...prevItems,
          {
            product_id: product.product_id,
            product_name: product.product_name,
            quantity
          }
        ]);
        setSelectedProduct("");
        setQuantity(1);
      }
    }
  };

  const removeOrderItem = (index) => {
    setOrderItems((prevItems) => prevItems.filter((_, i) => i !== index));
  };

  const createOrder = async () => {
    if (orderItems.length === 0) {
      alert("Please add at least one product to the order.");
      return;
    }

    const orderData = {
      supplier_id: selectedSupplier,
      order_items: orderItems.map((item) => ({
        productid: item.product_id,
        quantity: item.quantity,
        unitprice: 0 // Adjust this as needed
      }))
    };

    try {
      const response = await axios.post(`${API_URL}/Orders`, orderData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      alert("Order created successfully!");
      setOrderItems([]);
      fetchPendingOrders(); // Refresh pending orders after creating order
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order.");
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(
        `${API_URL}/Orders/${orderId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
      alert(`Order ${newStatus.toLowerCase()} successfully!`);
      fetchPendingOrders();
    } catch (error) {
      console.error("Failed to update order status:", error);
      alert("Failed to update order status.");
    }
  };

  // ฟังก์ชันเปิด popup สำหรับดูรายละเอียด order
  const handleViewOrderDetails = (order) => {
    setOpenOrderModal(order);
  };

  return (
    <div className="order-page-container">
      <header className="order-header">
        <h1>Orders</h1>
        <div className="user-actions">
          <span className="user-name">{user?.name || "User"}</span>
          <FaUserCircle size={30} color="#007bff" />
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>
      </header>

      <div className="category-container">
        <h3>Product Categories</h3>
        <div className="category-grid">
          {categories?.map((categoryItem, index) => {
            if (!categoryItem || !categoryItem.category) return null;
            const categoryIcon = getCategoryIcon(
              categoryItem.category?.toLowerCase() || ""
            );
            const categoryColor = getColor(categoryItem.total_quantity || 0);
            return (
              <div
                key={index}
                className={`category-box ${categoryColor}`}
                onMouseEnter={() => {
                  setHoveredCategory(categoryItem.category);
                  setHoveredCategoryDescription(
                    categoryItem.details && categoryItem.details.length > 0
                      ? categoryItem.details
                          .map(
                            (detail) =>
                              `<span class='${getColor(detail.quantity)}'>${detail.product_name}: ${detail.quantity}</span>`
                          )
                          .join("<br />")
                      : "No details available"
                  );
                }}
                onMouseLeave={() => {
                  setHoveredCategory(null);
                  setHoveredCategoryDescription(null);
                }}
              >
                {categoryIcon.type === "image" ? (
                  <img
                    src={categoryIcon.value}
                    alt={categoryItem.category}
                    className="category-icon-Order"
                    onError={(e) => (e.target.src = "/icons/default.png")}
                  />
                ) : (
                  <categoryIcon.value size={40} />
                )}
                <div>
                  {categoryItem.category?.toUpperCase() || "UNKNOWN CATEGORY"}
                </div>
                {hoveredCategory === categoryItem.category &&
                  hoveredCategoryDescription && (
                    <div className="tooltip tooltip-box">
                      <div
                        className="tooltip-container"
                        dangerouslySetInnerHTML={{
                          __html: hoveredCategoryDescription
                        }}
                      />
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="order-main-layout">
        <div className="pending-orders-container">
          <h3>Pending Orders</h3>
          <ul>
            {pendingOrders?.map((order) => (
              <li
                key={order.order_id}
                className="pending-order-item"
              >
                <span>
                  {order.order_number} - {order.total_amount}
                </span>
                <div className="order-actions">
                  <button
                    className="approve-btn"
                    onClick={() =>
                      updateOrderStatus(order.order_id, "Approved")
                    }
                  >
                    <FaCheck />
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() =>
                      updateOrderStatus(order.order_id, "Rejected")
                    }
                  >
                    <FaTimes />
                  </button>
                  <button
                    className="details-btn"
                    onClick={() => handleViewOrderDetails(order)}
                  >
                    View Details
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-details-wrapper">
          <div className="order-details-container-for-order-page">
            <div className="order-details-header">
              <h3>Order Details</h3>
              {selectedSupplier && selectedProduct && quantity > 0 && (
                <button className="add-item-btn" onClick={addProductToOrder}>
                  <FaPlus /> Add
                </button>
              )}
            </div>
            <div className="form-group-for-order-page">
              <label>Supplier</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.supplier_id} value={supplier.supplier_id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group-for-order-page">
              <label>Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                disabled={!selectedSupplier}
              >
                <option value="">Select Product</option>
                {filteredProducts.map((product) => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.product_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group-for-order-page">
              <label>Quantity</label>
              <input
                type="number"
                value={quantity}
                min="1"
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>
          </div>

          {orderItems.length > 0 && (
            <div className="order-summary-container">
              <h3>Order Summary</h3>
              <ul>
                {orderItems.map((item, index) => (
                  <li key={index} className="order-item">
                    {item.product_name} : {item.quantity}{" "}
                    <FaTrash
                      className="delete-icon"
                      onClick={() => removeOrderItem(index)}
                    />
                  </li>
                ))}
              </ul>
              <button className="submit-btn-for-order-page" onClick={createOrder}>
                Create Order
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Popup สำหรับ Order Details */}
      {openOrderModal && (
        <Modal
          isOpen={true}
          onRequestClose={() => setOpenOrderModal(null)}
          contentLabel="Order Details"
          className="modal-content"
          overlayClassName="modal-overlay"
        >
          <h2>Order Details</h2>
          <p>
            <strong>Order Number:</strong> {openOrderModal.order_number}
          </p>
          <p>
            <strong>Total Amount:</strong> {openOrderModal.total_amount}
          </p>
          <p>
            <strong>Supplier:</strong> {openOrderModal.supplier_name}
          </p>
          <p>
            <strong>Items:</strong>{" "}
            {openOrderModal.items
              ?.map(
                (item) => `${item.product_name} x ${item.quantity}`
              )
              .join(", ")}
          </p>
          <button onClick={() => setOpenOrderModal(null)}>Close</button>
        </Modal>
      )}
    </div>
  );
};

export default OrderPage;
