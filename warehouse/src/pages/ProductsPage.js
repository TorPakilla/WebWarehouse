import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { fetchProducts, createProduct, updateProduct, deleteProduct } from "../api/products";
import ProductForm from "../components/Products/ProductForm";
import "../components/Products/Products.css";
import { getCategoryIcon, useCategories } from "../components/DynamicIcon";
import axios from "../api/config";
import { API_BASE_URL } from "../api/config";

// ตั้งค่า root สำหรับ react-modal
Modal.setAppElement("#root");

const ProductsPage = () => {
  // State สำหรับสินค้าทั้งหมดและสำหรับฟอร์ม
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const [popupCategory, setPopupCategory] = useState(null); // สำหรับแสดง modal รายการสินค้าตามหมวดหมู่
  const [successMessage, setSuccessMessage] = useState("");
  const categories = useCategories();

  // State สำหรับหมวดหมู่ที่ได้จาก API อื่นๆ (เช่น Inventory, POS)
  const [inventoryCategories, setInventoryCategories] = useState([]);
  const [posCategories, setPosCategories] = useState([]);

  const [formData, setFormData] = useState({
    product_name: "",
    type: "",
    price: 0,
    description: "",
    initial_quantity: 0,
    image: null,
  });

  const navigate = useNavigate();

  // โหลดสินค้าทั้งหมดเมื่อ component mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data } = await fetchProducts();
      setProducts(data.products);
    } catch (error) {
      console.error("❌ Error fetching products:", error);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedProduct) {
        await updateProduct(selectedProduct.product_id, formData);
        setSuccessMessage("✅ Product updated successfully!");
      } else {
        await createProduct(formData);
        setSuccessMessage("✅ Product created successfully!");
      }
      loadProducts();
      setFormData({
        product_name: "",
        type: "",
        price: 0,
        description: "",
        initial_quantity: 0,
        image: null,
      });
      closeEditPopup();
    } catch (error) {
      console.error("❌ Error saving product:", error);
      setSuccessMessage("❌ Failed to save product!");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      setSuccessMessage("✅ Product deleted successfully!");
      loadProducts();
    } catch (error) {
      console.error("❌ Error deleting product:", error);
      setSuccessMessage("❌ Failed to delete product!");
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormData({
      product_name: product.product_name,
      type: product.product_unit?.[0]?.type || "",
      price: product.inventory?.[0]?.price || 0,
      description: product.description || "",
      initial_quantity: product.initial_quantity || 0,
      image: product.image || null,
    });
    setIsEditPopupOpen(true);
  };

  const closeEditPopup = () => {
    setIsEditPopupOpen(false);
    setSelectedProduct(null);
    setFormData({
      product_name: "",
      type: "",
      price: 0,
      description: "",
      initial_quantity: 0,
      image: null,
    });
    // ซ่อนข้อความแจ้งเตือนหลัง 3 วินาที
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // โหลดหมวดหมู่จาก Inventory
  useEffect(() => {
    axios.get(`${API_BASE_URL}/inventory-by-category`)
      .then(response => {
        if (response.data.categories) {
          const extractedCategories = response.data.categories.map(cat => cat.category.toLowerCase());
          setInventoryCategories(extractedCategories);
        }
      })
      .catch(error => console.error("❌ Error fetching inventory categories:", error));
  }, []);

  // โหลดหมวดหมู่จาก POS (Low Stock)
  useEffect(() => {
    axios.get(`${API_BASE_URL}/GetPosLowStock`)
      .then(response => {
        if (response.data.low_stock_items) {
          const extractedCategories = [...new Set(response.data.low_stock_items.map(item => item.category.toLowerCase()))];
          setPosCategories(extractedCategories);
        }
      })
      .catch(error => console.error("❌ Error fetching POS categories:", error));
  }, []);

  // Merge หมวดหมู่จากหลายแหล่ง
  const mergedCategories = [...new Set([...categories, ...inventoryCategories, ...posCategories])];

  // จัดกลุ่มสินค้าตามหมวดหมู่ (ในที่นี้ใช้ product.description เป็นตัวแทนหมวดหมู่)
  const groupedProducts = mergedCategories.reduce((acc, category) => {
    acc[category] = products.filter(
      (product) => product.description && product.description.toLowerCase() === category
    );
    return acc;
  }, {});

  // ฟังก์ชันปิด modal รายการสินค้าตามหมวดหมู่
  const closeCategoryModal = () => {
    setPopupCategory(null);
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>Manage Products</h1>
        <button className="back-button" onClick={() => navigate("/dashboard")}>← Back</button>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="products-content">
        <div className="product-form-container">
          <h2>Add / Edit Product</h2>
          <ProductForm
            onSubmit={handleSubmit}
            selectedProduct={selectedProduct}
            categoryIcons={getCategoryIcon}
            categoryOptions={mergedCategories}
            formData={formData}
            setFormData={setFormData}
          />
        </div>

        <div className="product-list-container">
          <div className="category-section">
            {mergedCategories.map((category) => {
              const iconData = getCategoryIcon(category);
              const productCount = groupedProducts[category]?.length || 0;
              return (
                <div
                  key={category}
                  className="category-header"
                  onClick={() => setPopupCategory(category)}
                >
                  {iconData.type === "image" ? (
                    <img src={iconData.value} alt={category} width={30} height={30} />
                  ) : (
                    React.createElement(iconData.value, { size: 30 })
                  )}
                  <h2>
                    {category.toUpperCase()} ({productCount})
                  </h2>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal สำหรับแสดงรายการสินค้าตามหมวดหมู่ */}
      {popupCategory && (
        <Modal
          isOpen={true}
          onRequestClose={closeCategoryModal}
          contentLabel="Products in Category"
          className="modal-content custom-modal-size"
          overlayClassName="modal-overlay"
        >
          <div className="modal-header">
            <h2>{popupCategory.toUpperCase()} Products</h2>
          </div>
          <div className="modal-body">
            {groupedProducts[popupCategory] && groupedProducts[popupCategory].length > 0 ? (
              <ul className="product-list">
                {groupedProducts[popupCategory].map((product) => (
                  <li key={product.product_id} className="product-list-item">
                    <span>{product.product_name}</span>
                    <div className="product-actions">
                      <button
                        className="edit-button"
                        onClick={() => {
                          handleEdit(product);
                          closeCategoryModal();
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(product.product_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No products found in this category.</p>
            )}
          </div>
          <button onClick={closeCategoryModal} style={{ marginTop: "20px" }}>
            Close
          </button>
        </Modal>
      )}

      {/* Modal สำหรับแก้ไขสินค้า (Edit Product) */}
      {isEditPopupOpen && (
        <Modal
          isOpen={true}
          onRequestClose={closeEditPopup}
          contentLabel="Edit Product"
          className="modal-content custom-modal-size"
          overlayClassName="modal-overlay"
        >
          <div className="modal-header">
            <h2>Edit Product</h2>
          </div>
          <div className="modal-body">
            <ProductForm
              onSubmit={handleSubmit}
              selectedProduct={selectedProduct}
              categoryIcons={getCategoryIcon}
              categoryOptions={mergedCategories}
              formData={formData}
              setFormData={setFormData}
            />
          </div>
          <button onClick={closeEditPopup} style={{ marginTop: "20px" }}>
            Close
          </button>
        </Modal>
      )}
    </div>
  );
};

export default ProductsPage;
