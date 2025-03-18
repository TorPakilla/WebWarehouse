import React, { useState } from 'react';
import axios from '../../api/config'; // หรือ import ที่ตั้งค่าไว้

const ProductManagementModal = ({ supplier, onClose, onUpdated }) => {
  const [selectedProducts, setSelectedProducts] = useState([]);

  // สร้างฟังก์ชัน handleCheckboxChange สำหรับเลือกสินค้าหลายตัว
  const handleCheckboxChange = (psId, isChecked) => {
    if (isChecked) {
      setSelectedProducts([...selectedProducts, psId]);
    } else {
      setSelectedProducts(selectedProducts.filter((id) => id !== psId));
    }
  };

  // ฟังก์ชันลบหลายสินค้า
  const handleDeleteSelected = async () => {
    if (!window.confirm('Are you sure to delete selected products?')) return;
    try {
      // เรียก API ลบทีละตัว หรือสร้าง endpoint ลบหลายตัว
      for (const psId of selectedProducts) {
        await axios.delete(`/Supplier/${supplier.supplier_id}/products/${psId}`);
      }
      alert('Deleted selected products');
      onUpdated(); // reload data + close
    } catch (error) {
      console.error('Failed to delete products', error);
      alert('Failed to delete products');
    }
  };

  // ฟังก์ชัน edit รายตัว (ถ้าต้องการ)
  const handleEditProduct = async (psId) => {
    const newPrice = prompt('Enter new price');
    if (!newPrice) return;
    try {
      await axios.put(`/Supplier/${supplier.supplier_id}/products/${psId}`, {
        price_pallet: parseFloat(newPrice),
      });
      alert('Price updated');
      onUpdated();
    } catch (error) {
      console.error('Failed to update product', error);
      alert('Failed to update product');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Manage Products for {supplier.name}</h2>

        {supplier.product_suppliers && supplier.product_suppliers.length > 0 ? (
          <table className="product-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Product</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supplier.product_suppliers.map((ps) => (
                <tr key={ps.id}>
                  <td>
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        handleCheckboxChange(ps.id, e.target.checked)
                      }
                    />
                  </td>
                  <td>{ps.product?.product_name || ps.product_id}</td>
                  <td>{ps.price_pallet}</td>
                  <td>
                    <button onClick={() => handleEditProduct(ps.id)}>Edit</button>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Delete this product?')) return;
                        try {
                          await axios.delete(`/Supplier/${supplier.supplier_id}/products/${ps.id}`);
                          alert('Deleted product');
                          onUpdated();
                        } catch (error) {
                          console.error('Failed to delete product', error);
                          alert('Failed to delete product');
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No products</p>
        )}

        <div style={{ marginTop: '1rem' }}>
          <button onClick={handleDeleteSelected}>Delete Selected</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ProductManagementModal;
