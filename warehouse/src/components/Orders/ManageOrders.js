import React, { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaCheck, FaTimes, FaClipboardList } from "react-icons/fa";
import axios from "../../api/config"; // import axios instance
import { API_BASE_URL } from "../../api/config"; // import config
import "./PopupOrder.css"; // <-- Import CSS ที่ปรับแล้ว

const ManageOrders = ({
  // Props จาก Dashboard
  popupData,
  setPopupData,
  suppliers,
  selectedSupplier,
  setSelectedSupplier,
  filteredProductsBySupplier,
  selectedProduct,
  setSelectedProduct,
  selectedCategoryLabel,
  setSelectedCategoryLabel,
  quantity,
  setQuantity,
  orderItems,
  setOrderItems,
  handleUpdateOrderStatus,
  token,
  // ไม่ใช้ posCategories อีกต่อไป
  getCategoryIcon,
}) => {
  // ===== State สำหรับดึง "หมวดหมู่จาก DB" (พร้อมข้อมูลย่อย) =====
  const [dbCategories, setDbCategories] = useState([]);

  // ===== useEffect เรียก API ดึงหมวดหมู่จาก DB =====
  useEffect(() => {
    const fetchCategoriesFromDB = async () => {
      try {
        // ตัวอย่างเรียก /inventory-by-category 
        // (ให้ตรวจสอบให้ตรงกับเส้นทาง/endpoint ใน Go-Fiber ของคุณ)
        const res = await axios.get(`${API_BASE_URL}/inventory-by-category`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data && res.data.categories) {
          // โครงสร้าง JSON ที่ backend ส่งกลับ: { "categories": [...] }
          setDbCategories(res.data.categories);
        }
      } catch (error) {
        console.error("Error fetching categories from DB:", error);
      }
    };

    fetchCategoriesFromDB();
  }, [token]);

  // ===== ฟังก์ชันสร้าง Order =====
  const createOrder = async () => {
    if (orderItems.length === 0) {
      alert("Please add at least one product to the order.");
      return;
    }
    try {
      const orderData = {
        supplier_id: selectedSupplier,
        order_items: orderItems.map((item) => ({
          productid: item.product_id,
          quantity: item.quantity,
          unitprice: 0,
        })),
      };
      await axios.post(`${API_BASE_URL}/Orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Order created successfully!");

      // Reset state
      setSelectedSupplier("");
      setSelectedProduct("");
      setQuantity(1);
      setOrderItems([]);
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order.");
    }
  };

  return (
    <div className="modal-body two-column-layout">
      {/* ====== คอลัมน์ซ้าย (Create New Order + Pending Orders) ====== */}
      <div className="left-column">
        {/* ------ ส่วน Create New Order ------ */}
        <div className="create-order-section">
          <h4>Create New Order</h4>
          <div className="form-group">
            <label>Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">Select Supplier</option>
              {suppliers.map((sup) => (
                <option key={sup.supplier_id} value={sup.supplier_id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => {
                const productId = e.target.value;
                setSelectedProduct(productId);
                // หา category ของ product นั้น
                const foundProduct = filteredProductsBySupplier.find(
                  (p) => p.product_id === productId
                );
                setSelectedCategoryLabel(foundProduct?.category || "");
              }}
              disabled={!selectedSupplier}
            >
              <option value="">Select Product</option>
              {filteredProductsBySupplier.map((prod) => (
                <option key={prod.product_id} value={prod.product_id}>
                  {prod.product_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              value={quantity}
              min="1"
              onChange={(e) => setQuantity(parseInt(e.target.value))}
            />
          </div>

          <button
            className="modal-button"
            onClick={() => {
              if (selectedProduct && quantity > 0 && selectedSupplier) {
                const productObj = filteredProductsBySupplier.find(
                  (p) => p.product_id === selectedProduct
                );
                if (productObj) {
                  setOrderItems((prev) => [
                    ...prev,
                    {
                      product_id: productObj.product_id,
                      product_name: productObj.product_name,
                      quantity,
                    },
                  ]);
                  // Reset
                  setSelectedProduct("");
                  setQuantity(1);
                }
              }
            }}
          >
            <FaPlus /> Add to Order
          </button>

          {/* แสดงรายการ Order Items ที่จะสร้าง */}
          {orderItems.length > 0 && (
            <div className="order-items-list">
              <h4>Order Items</h4>
              <ul>
                {orderItems.map((item, index) => (
                  <li key={index}>
                    {item.product_name} x {item.quantity}
                    <FaTrash
                      style={{ cursor: "pointer", marginLeft: "5px" }}
                      onClick={() =>
                        setOrderItems((prev) => prev.filter((_, i) => i !== index))
                      }
                    />
                  </li>
                ))}
              </ul>
              <button className="modal-button" onClick={createOrder}>
                Create Order
              </button>
            </div>
          )}
        </div>

        {/* ------ ส่วน Pending Orders ------ */}
        <div className="pending-orders-section">
          <h4>Pending Orders</h4>
          {popupData && popupData.pendingOrders ? (
            popupData.pendingOrders.length > 0 ? (
              <ul className="pending-orders-list">
                {popupData.pendingOrders.map((order) => (
                  <li key={order.order_id} className="pending-order-item">
                    <FaClipboardList className="order-icon" />
                    <span className="order-text">
                      {order.order_number} - {order.status}
                    </span>
                    <button
                      className="status-button approve"
                      onClick={() => handleUpdateOrderStatus(order.order_id, "Approved")}
                    >
                      <FaCheck />
                    </button>
                    <button
                      className="status-button reject"
                      onClick={() => handleUpdateOrderStatus(order.order_id, "Rejected")}
                    >
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No pending orders.</p>
            )
          ) : (
            <p>Loading or no data available.</p>
          )}
        </div>
      </div>

      {/* ====== คอลัมน์ขวา (All Categories) ====== */}
      <div className="right-column">
        <h4>All Categories</h4>

        <div className="all-categories-grid">
          {/* แทนที่จะใช้ posCategories.map(...) เราจะใช้ dbCategories.map(...) */}
          {dbCategories.map((cat, index) => {
            // cat.category = ชื่อหมวดหมู่ (string)
            // cat.details = array ของสินค้า (หรือข้อมูลย่อย) จาก DB
            const categoryIcon = getCategoryIcon(cat.category);

            return (
              <div key={index} className="category-item">
                {categoryIcon.type === "image" ? (
                  <img
                    src={categoryIcon.value}
                    alt={cat.category}
                    className="category-icon-Dashboard"
                    style={{ width: "26px", height: "26px" }}
                  />
                ) : (
                  <categoryIcon.value size={26} />
                )}

                {/* แสดงชื่อหมวดหมู่ (category) */}
                <div className="category-item-text">
                  {cat.category ? cat.category.toUpperCase() : "UNKNOWN"}
                </div>

                {/* ===== ตัวอย่าง Tooltip (ข้อมูลย่อย) ===== */}
                <div className="tooltip-text">
                  {/* ถ้า details เป็น array ก็สามารถ map เพื่อแสดงแต่ละรายการได้ */}
                  {Array.isArray(cat.details) && cat.details.length > 0 ? (
                    cat.details.map((detail, idx) => (
                      <div key={idx}>
                        {detail.product_name} | Qty: {detail.quantity} | Price: {detail.price}
                      </div>
                    ))
                  ) : (
                    <div>No details</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ManageOrders;
