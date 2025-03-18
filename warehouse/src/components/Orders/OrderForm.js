import React, { useState, useEffect } from "react";
import axios from "axios";
import "../Orders/Order.css";

const API_URL = "http://localhost:5050";

const OrderForm = ({ hideCategories = false }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]); 
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [orderItems, setOrderItems] = useState([]);
  const [error, setError] = useState("");

  // สินค้าที่จะเพิ่มใหม่
  const [newOrderItem, setNewOrderItem] = useState({
    productid: "",
    quantity: 1,
    unitprice: 0,
  });

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
    fetchLoggedInEmployee();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API_URL}/Supplier`);
      const rawData = response.data?.data || [];

      // สร้าง object สำหรับ group ข้อมูล
      const grouped = {};
      rawData.forEach(row => {
        const sid = row.supplier_id;
        if (!grouped[sid]) {
          grouped[sid] = {
            supplier_id: sid,
            name: row.name,
            products: []
          };
        }
        // push product เข้า array
        grouped[sid].products.push({
          product_id: row.product_id,
          price_pallet: row.price_pallet
        });
      });

      // แปลงเป็น array
      const finalSuppliers = Object.values(grouped);
      setSuppliers(finalSuppliers);

    } catch (err) {
      setError("Failed to fetch suppliers");
    }
  };

  // ดึงข้อมูล Product (ถ้าต้องการ cross-reference ชื่อสินค้า)
  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/Product`);
      setProducts(response.data?.products || []);
    } catch (err) {
      setError("Failed to fetch products");
    }
  };

  const fetchLoggedInEmployee = () => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.employees_id && parsedUser.name) {
        setSelectedEmployee(parsedUser.employees_id);
        setEmployeeName(parsedUser.name);
      }
    }
  };

  /** ฟังก์ชันดึงเฉพาะสินค้าใน supplier ที่เลือก */
  const getProductsForSelectedSupplier = () => {
    if (!selectedSupplier) return [];
    const currentSupplier = suppliers.find(
      (s) => s.supplier_id === selectedSupplier
    );
    if (!currentSupplier || !Array.isArray(currentSupplier.products)) {
      return [];
    }

    // สมมติว่ามี product_id, price_pallet
    // อยากได้ product_name จาก /Product ด้วย
    // => cross-reference
    const mappedProducts = currentSupplier.products.map((spProd) => {
      // หา productName จาก products[] (ถ้ามี)
      const pInfo = products.find(
        (p) => p.product_id === spProd.product_id
      );
      const productName = pInfo ? pInfo.product_name : spProd.product_id;

      return {
        ...spProd,
        product_name: productName,
      };
    });

    return mappedProducts;
  };

  /** เพิ่มสินค้าใน orderItems */
  const addOrderItem = () => {
    if (!newOrderItem.productid) {
      alert("Please select a product.");
      return;
    }

    // 1) หา supplier ที่เลือก
    const currentSupplier = suppliers.find(s => s.supplier_id === selectedSupplier);
    let pricePerPallet = 0;
    if (currentSupplier && Array.isArray(currentSupplier.products)) {
      // 2) หา product ที่ product_id ตรงกัน
      const spProduct = currentSupplier.products.find(
        p => p.product_id === newOrderItem.productid
      );
      // 3) ดึง price_pallet
      pricePerPallet = spProduct ? parseFloat(spProduct.price_pallet) || 0 : 0;
    }

    // สร้าง item ใหม่ โดย unitprice = price_pallet
    const newItem = {
      ...newOrderItem,
      unitprice: pricePerPallet,
    };

    setOrderItems([...orderItems, newItem]);
    setNewOrderItem({ productid: "", quantity: 1, unitprice: 0 });
  };

  /** ลบสินค้า */
  const removeOrderItem = (index) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
  };

  /** Submit สร้าง Order */
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedSupplier) {
      alert("Please select a supplier.");
      return;
    }
    if (orderItems.length === 0) {
      alert("Please add at least one product.");
      return;
    }

    const payload = {
      supplier_id: selectedSupplier,
      employees_id: selectedEmployee,
      order_items: orderItems.map((item) => ({
        productid: item.productid,
        quantity: item.quantity,
        unitprice: item.unitprice || 0,
      })),
    };
    console.log("Creating order...", payload);

    try {
      const response = await axios.post(`${API_URL}/Orders`, payload);
      console.log("Order created successfully", response.data);
      setOrderItems([]);
      alert("Order created successfully!");
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Error creating order. Please try again.");
    }
  };

  // products เฉพาะ supplier ที่เลือก
  const filteredProducts = getProductsForSelectedSupplier();

  return (
    <div className="order-form-wrapper">
      <div className="order-form-content">
        {/* ซ้าย: ฟอร์มสำหรับเพิ่มสินค้า */}
        <div className="order-form-section">
          <form className="order-form" onSubmit={handleSubmit}>
            <div className="order-item-form">
              <label>Supplier</label>
              <select
                value={selectedSupplier}
                onChange={(e) => {
                  setSelectedSupplier(e.target.value);
                  // reset productid ถ้าเปลี่ยน supplier
                  setNewOrderItem({ ...newOrderItem, productid: "" });
                }}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.supplier_id} value={supplier.supplier_id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Employee</label>
              <input type="text" value={employeeName} readOnly />
            </div>

            <h3>Add Product</h3>
            <div className="order-item-form">
              {/* แสดงเฉพาะ product ของ supplier ที่เลือก */}
              <select
                value={newOrderItem.productid}
                onChange={(e) =>
                  setNewOrderItem({ ...newOrderItem, productid: e.target.value })
                }
              >
                <option value="">Select Product</option>
                {filteredProducts.map((prod) => (
                  <option key={prod.product_id} value={prod.product_id}>
                    {prod.product_name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={newOrderItem.quantity}
                min="1"
                onChange={(e) =>
                  setNewOrderItem({ ...newOrderItem, quantity: Number(e.target.value) })
                }
                placeholder="Quantity"
              />
              <button type="button" className="add-item-btn" onClick={addOrderItem}>
                ➕ Add Product
              </button>
            </div>

            <button type="submit" className="submit-btn">
              Create Order
            </button>
          </form>
        </div>

        {/* ขวา: รายการสินค้า */}
        <div className="order-items-section">
          <h3>Order Items</h3>
          {orderItems.length === 0 ? (
            <p>No products added yet.</p>
          ) : (
            <ul>
              {orderItems.map((item, index) => {
                // หา supplier ปัจจุบัน
                const currentSupplier = suppliers.find(
                  (s) => s.supplier_id === selectedSupplier
                );

                // หา product ภายใน currentSupplier.products
                let pricePerPallet = 0;
                if (currentSupplier && Array.isArray(currentSupplier.products)) {
                  const spProduct = currentSupplier.products.find(
                    (p) => p.product_id === item.productid
                  );
                  pricePerPallet = spProduct ? parseFloat(spProduct.price_pallet) || 0 : 0;
                }

                // cross-reference เพื่อหา product_name จากตาราง Product (ถ้าต้องการ)
                const productInfo = products.find(
                  (p) => p.product_id === item.productid
                );
                const productName = productInfo ? productInfo.product_name : item.productid;

                const totalPrice = pricePerPallet * item.quantity;

                return (
                  <li key={index}>
                    <div className="item-details">
                      <strong>{productName}</strong>
                      <span>Qty: {item.quantity}</span>
                      <span>Price/Pallet: {pricePerPallet}</span>
                      <span>Total: {totalPrice}</span>
                    </div>
                    <button
                      className="remove-item-btn"
                      onClick={() => removeOrderItem(index)}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderForm;
