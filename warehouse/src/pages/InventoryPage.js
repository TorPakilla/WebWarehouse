import React, { useState, useEffect } from "react";
import {
  fetchProductUnits,
  fetchBranches,
  fetchInventories,
  createInventory,
  deleteInventory,
} from "../api/inventory";
import InventoryList from "../components/Inventory/InventoryList";
import "../components/Inventory/Inventory.css";

const InventoryPage = () => {
  const [productUnits, setProductUnits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [formData, setFormData] = useState({
    productUnitId: "",
    branchId: "",
    quantity: "",
    price: "",
  });
  const [editingInventory, setEditingInventory] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const units = await fetchProductUnits();
        const branchData = await fetchBranches();
        const inventoryData = await fetchInventories();
        setProductUnits(units);
        setBranches(branchData);
        setInventories(inventoryData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingInventory) {
        // Update logic (สามารถเพิ่ม API call สำหรับ update ได้ที่นี่)
        setEditingInventory(null);
      } else {
        await createInventory({
          productunitid: formData.productUnitId,
          brancheid: formData.branchId,
          quantity: parseInt(formData.quantity, 10),
          price: parseFloat(formData.price),
        });
      }
      const inventoryData = await fetchInventories();
      setInventories(inventoryData);
      setFormData({ productUnitId: "", branchId: "", quantity: "", price: "" });
    } catch (error) {
      console.error("Error handling inventory:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteInventory(id);
      const inventoryData = await fetchInventories();
      setInventories(inventoryData);
    } catch (error) {
      console.error("Error deleting inventory:", error);
    }
  };

  return (
    <div className="inventory-page-container">
      <header className="inventory-header">
        <h1>Inventory Management</h1>
      </header>

      <div className="inventory-content">
        <form onSubmit={handleSubmit} className="inventory-form-container">
          <div className="form-group">
            <label>Product Unit:</label>
            <select
              name="productUnitId"
              value={formData.productUnitId}
              onChange={handleChange}
              required
            >
              <option value="">Select Product Unit</option>
              {productUnits.map((unit) => (
                <option key={unit.product_unit_id} value={unit.product_unit_id}>
                  {unit.type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Branch:</label>
            <select
              name="branchId"
              value={formData.branchId}
              onChange={handleChange}
              required
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantity:</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Price:</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">
              {editingInventory ? "Update" : "Add"}
            </button>
            {editingInventory && (
              <button
                type="button"
                onClick={() => setEditingInventory(null)}
                className="cancel-btn"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="inventory-list-container">
          <InventoryList
            inventories={inventories}
            onEdit={setEditingInventory}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
