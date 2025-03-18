import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SupplierForm from './SupplierForm.js';
import SupplierList from './SupplierList.js';
import {
  fetchSuppliers,
  fetchProducts,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../../api/suppliers';
import axios from '../../api/config'; // <-- import axios หรือ axiosInstance ของคุณ
import './Suppliers.css';

// ฟังก์ชันสำหรับเพิ่มสินค้าของ Supplier (เรียกไปยัง backend จริง)
const addSupplierProduct = async (supplierId, payload) => {
  // เรียก API POST /Supplier/:supplierId/products (ปรับตามฝั่ง Backend ของคุณ)
  const response = await axios.post(`/Supplier/${supplierId}/products`, payload);
  return response.data;
};

// ฟังก์ชันแก้ไขสินค้าของ Supplier (ตัวเดียว) - PUT /Supplier/:supplierId/products/:psId
const editSupplierProduct = async (supplierId, psId, payload) => {
  const response = await axios.put(`/Supplier/${supplierId}/products/${psId}`, payload);
  return response.data;
};

// ฟังก์ชันลบสินค้าของ Supplier (ตัวเดียว) - DELETE /Supplier/:supplierId/products/:psId
const deleteSupplierProduct = async (supplierId, psId) => {
  const response = await axios.delete(`/Supplier/${supplierId}/products/${psId}`);
  return response.data;
};

const ManageSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null); // <--- ถ้ามีค่า แปลว่ากำลังแก้ไขอยู่

  // State สำหรับการเปิด/ปิดฟอร์มเพิ่มสินค้า (More Product)
  const [showMoreProductForm, setShowMoreProductForm] = useState(false);

  // State เก็บข้อมูลเมื่อจะเพิ่มสินค้าให้ Supplier
  const [moreProductData, setMoreProductData] = useState({
    supplierId: '',
    supplierName: '',
    productId: '',
    price: '',
  });

  const navigate = useNavigate();

  // โหลดข้อมูล Suppliers
  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      alert('Failed to fetch suppliers.');
    }
  };

  // โหลดข้อมูล Products
  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to fetch products.');
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  // สร้าง/อัปเดต Supplier
  const handleCreateOrUpdate = async (supplier, isEdit) => {
    try {
      if (isEdit) {
        // กรณี Edit
        await updateSupplier(selectedSupplier.supplier_id, supplier);
      } else {
        // กรณี Create ใหม่
        await createSupplier(supplier);
      }
      // เคลียร์ state edit
      setSelectedSupplier(null);
      // รีโหลดข้อมูลใหม่
      loadSuppliers();
    } catch (error) {
      console.error('Error creating/updating supplier:', error.response?.data || error.message);
      alert('Failed to create/update supplier.');
    }
  };

  // ฟังก์ชันเมื่อกด Edit ในตาราง (Supplier ทั้งหมด)
  const handleEdit = (supplier) => {
    // เก็บ Supplier ที่ต้องการแก้ไขลง state
    setSelectedSupplier(supplier);
  };

  // ลบ Supplier ทั้งหมด
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await deleteSupplier(id);
      loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Failed to delete supplier.');
    }
  };

  // เมื่อคลิก More Product จะตั้งค่า supplier id และชื่อ แล้วเปิดฟอร์มเพิ่มสินค้า
  const handleMoreProductClick = (supplier) => {
    setMoreProductData({
      supplierId: supplier.supplier_id,
      supplierName: supplier.name,
      productId: '',
      price: '',
    });
    setShowMoreProductForm(true);
  };

  // ส่งข้อมูล More Product ไปเพิ่มสินค้าของ supplier
  const handleAddMoreProduct = async (e) => {
    e.preventDefault();
    if (!moreProductData.productId || !moreProductData.price) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    try {
      await addSupplierProduct(moreProductData.supplierId, {
        product_id: moreProductData.productId,
        price: moreProductData.price, // parseFloat เรียบร้อย
        supplier_name: moreProductData.supplierName,
      });
      // เรียกโหลดข้อมูลใหม่
      await loadSuppliers();

      alert('เพิ่มสินค้าสำหรับ Supplier นี้สำเร็จ');
      setShowMoreProductForm(false);
    } catch (error) {
      console.error('Error adding product to supplier:', error);
      alert('ไม่สามารถเพิ่มสินค้าได้');
    }
  };

  // ======== ฟังก์ชัน Edit Product (สินค้าเดียว) ========
  const handleEditProduct = async (supplier, productSupplier) => {
    // ตัวอย่างง่าย ๆ: prompt รับราคาใหม่
    const newPrice = prompt(
      `Enter new price for product ${productSupplier.product?.product_name || productSupplier.product_id}`,
      productSupplier.price_pallet
    );
    if (!newPrice) return; // กด cancel
    try {
      await editSupplierProduct(supplier.supplier_id, productSupplier.id, {
        price_pallet: parseFloat(newPrice),
      });
      alert('Product updated successfully');
      loadSuppliers();
    } catch (error) {
      console.error('Failed to update product', error);
      alert('Failed to update product');
    }
  };

  // ======== ฟังก์ชัน Delete Product (สินค้าเดียว) ========
  const handleDeleteProduct = async (supplier, psId) => {
    if (!window.confirm('Are you sure you want to delete this product from supplier?')) return;
    try {
      await deleteSupplierProduct(supplier.supplier_id, psId);
      alert('Product deleted successfully');
      loadSuppliers();
    } catch (error) {
      console.error('Failed to delete product', error);
      alert('Failed to delete product');
    }
  };

  return (
    <div className="suppliers-page-container">
      {/* ส่วนคอนเทนต์หลัก: ฟอร์มซ้าย - ตารางขวา */}
      <div className="suppliers-content">
        {/* ฟอร์มจัดการ Suppliers */}
        <div className="supplier-form-wrapper">
          <SupplierForm
            onSubmit={handleCreateOrUpdate}
            selectedSupplier={selectedSupplier}
            setSelectedSupplier={setSelectedSupplier}
          />
        </div>

        {/* ตาราง Suppliers */}
        <div className="supplier-list-wrapper">
          <SupplierList
            suppliers={suppliers}
            products={products}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onMoreProduct={handleMoreProductClick}
            // ส่ง callback สำหรับแก้ไข/ลบสินค้าเดียว
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        </div>
      </div>

      {/* ฟอร์ม (Modal) สำหรับเพิ่มสินค้าให้ Supplier */}
      {showMoreProductForm && (
        <div className="more-product-form-container">
          <h2>เพิ่มสินค้าให้กับ {moreProductData.supplierName}</h2>
          <form onSubmit={handleAddMoreProduct} className="more-product-form">
            <div className="form-group">
              <label>สินค้า:</label>
              <select
                value={moreProductData.productId}
                onChange={(e) =>
                  setMoreProductData({ ...moreProductData, productId: e.target.value })
                }
                required
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((prod) => (
                  <option key={prod.product_id} value={prod.product_id}>
                    {prod.product_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>ราคา:</label>
              <input
                type="number"
                value={moreProductData.price}
                onChange={(e) =>
                  setMoreProductData({
                    ...moreProductData,
                    price: parseFloat(e.target.value),
                  })
                }
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-btn">
                เพิ่มสินค้า
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowMoreProductForm(false)}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ManageSuppliers;
