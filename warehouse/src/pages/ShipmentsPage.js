import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../config/axiosInstance";
import "../components/Shipments/Shipments.css";
import PopupShipments from "../components/Shipments/PopupShipments";
import { FaArrowLeft, FaWarehouse, FaTruck, FaShippingFast } from "react-icons/fa";
import { getCategoryIcon } from "../components/DynamicIcon";

const ShipmentsPage = () => {
  const navigate = useNavigate();

  // ============ State ============
  const [fromBranches, setFromBranches] = useState([]);
  const [toBranches, setToBranches] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [categories, setCategories] = useState([]);

  const [fromBranch, setFromBranch] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  // สถานะการโหลดข้อมูลและ error แยกตามกลุ่ม
  const [loading, setLoading] = useState({
    branches: false,
    shipments: false,
    categories: false,
  });
  const [errors, setErrors] = useState({
    branches: null,
    shipments: null,
    categories: null,
  });

  // ============ Lifecycle ============
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    // เรียก Promise.all เพื่อโหลดพร้อมกัน
    await Promise.all([fetchBranches(), fetchShipments(), fetchCategories()]);
  };

  // ============ Fetch Functions ============
  const fetchBranches = async () => {
    setLoading((prev) => ({ ...prev, branches: true }));
    try {
      const [warehouseRes, posRes] = await Promise.all([
        axiosInstance.get("/WarehouseBranches"),
        axiosInstance.get("/POSBranches"),
      ]);

      setFromBranches(warehouseRes.data?.branches || []);
      setToBranches(posRes.data?.branches || []);
      setErrors((prev) => ({ ...prev, branches: null }));
    } catch (error) {
      console.error("Error fetching branches:", error);
      setErrors((prev) => ({ ...prev, branches: "Error fetching branches" }));
    } finally {
      setLoading((prev) => ({ ...prev, branches: false }));
    }
  };

  const fetchShipments = async () => {
    setLoading((prev) => ({ ...prev, shipments: true }));
    try {
      const response = await axiosInstance.get("/Shipments");
      setShipments(response.data?.Shipments || []);
      setErrors((prev) => ({ ...prev, shipments: null }));
    } catch (error) {
      console.error("Error fetching shipments:", error);
      setErrors((prev) => ({ ...prev, shipments: "Error fetching shipments" }));
    } finally {
      setLoading((prev) => ({ ...prev, shipments: false }));
    }
  };

  const fetchCategories = async () => {
    setLoading((prev) => ({ ...prev, categories: true }));
    try {
      const response = await axiosInstance.get("/inventory-by-category");
      setCategories(response.data?.categories || []);
      setErrors((prev) => ({ ...prev, categories: null }));
    } catch (error) {
      console.error("Error fetching categories:", error);
      setErrors((prev) => ({ ...prev, categories: "Error fetching categories" }));
    } finally {
      setLoading((prev) => ({ ...prev, categories: false }));
    }
  };

  // ============ Render ============
  return (
    <div className="shipments-page-container">
      <Header navigate={navigate} />

      {/* ส่วนแสดง Category */}
      <CategorySection
        categories={categories}
        loading={loading.categories}
        error={errors.categories}
      />

      <div className="shipments-main-layout">
        {/* ฟอร์มสร้าง Shipment */}
        <ShipmentForm
          fromBranch={fromBranch}
          toBranch={toBranch}
          fromBranches={fromBranches}
          toBranches={toBranches}
          loadingBranches={loading.branches}
          errorBranches={errors.branches}
          onChangeFromBranch={setFromBranch}
          onChangeToBranch={setToBranch}
          onOpenPopup={() => setShowPopup(true)}
        />

        {/* ตารางรายการ Shipments */}
        <ShipmentList
          shipments={shipments}
          loading={loading.shipments}
          error={errors.shipments}
        />
      </div>

      {/* Popup สำหรับเลือกสินค้า */}
      {showPopup && (
        <PopupShipments
          fromBranch={fromBranch}
          toBranch={toBranch}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
};

export default ShipmentsPage;

/* ----------------------------------------------------------------
 * 1) Sub-Component: Header
 * ----------------------------------------------------------------*/
const Header = ({ navigate }) => {
  return (
    <header className="shipments-header">
      <h1>Shipments</h1>
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>
    </header>
  );
};

/* ----------------------------------------------------------------
 * 2) Sub-Component: CategorySection
 * ----------------------------------------------------------------*/
const CategorySection = ({ categories, loading, error }) => {
  return (
    <div className="category-container">
      <h3>Product Categories</h3>

      {loading ? (
        <p>Loading categories...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : categories.length === 0 ? (
        <p>No categories found.</p>
      ) : (
        <div className="category-grid">
          {categories.map((cat, index) => {
            const iconObj = getCategoryIcon(cat.category);
            return (
              <div key={index} className="category-box">
                {iconObj.type === "image" ? (
                  <img
                    src={iconObj.value}
                    alt={cat.category}
                    className="category-icon"
                  />
                ) : (
                  <iconObj.value size={40} className="category-icon" />
                )}
                <span>{cat.category.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ----------------------------------------------------------------
 * 3) Sub-Component: ShipmentForm (สร้าง Shipment)
 * ----------------------------------------------------------------*/
const ShipmentForm = ({
  fromBranch,
  toBranch,
  fromBranches,
  toBranches,
  loadingBranches,
  errorBranches,
  onChangeFromBranch,
  onChangeToBranch,
  onOpenPopup,
}) => {
  return (
    <div className="shipment-form-container">
      <h3>Create New Shipment</h3>

      {/* Warehouse */}
      <label>
        <FaWarehouse /> Select Warehouse:
      </label>
      {loadingBranches ? (
        <p>Loading warehouses...</p>
      ) : errorBranches ? (
        <p className="error">{errorBranches}</p>
      ) : (
        <select value={fromBranch} onChange={(e) => onChangeFromBranch(e.target.value)}>
          <option value="">Select Warehouse</option>
          {fromBranches.map((branch) => (
            <option key={branch.branch_id} value={branch.branch_id}>
              {branch.b_name || branch.branch_id}
            </option>
          ))}
        </select>
      )}

      {/* POS */}
      <label>
        <FaTruck /> Select POS:
      </label>
      {loadingBranches ? (
        <p>Loading POS branches...</p>
      ) : errorBranches ? (
        <p className="error">{errorBranches}</p>
      ) : (
        <select value={toBranch} onChange={(e) => onChangeToBranch(e.target.value)}>
          <option value="">Select POS</option>
          {toBranches.map((branch) => (
            <option key={branch.branch_id} value={branch.branch_id}>
              {branch.b_name || branch.branch_id}
            </option>
          ))}
        </select>
      )}

      {/* ปุ่ม Select Products */}
      {fromBranch && toBranch && (
        <button className="open-popup-btn" onClick={onOpenPopup}>
          Select Products
        </button>
      )}
    </div>
  );
};

/* ----------------------------------------------------------------
 * 4) Sub-Component: ShipmentList (ตารางแสดงรายการ Shipments)
 * ----------------------------------------------------------------*/
const ShipmentList = ({ shipments, loading, error }) => {
  return (
    <div className="shipments-list-container">
      <h3>
        <FaShippingFast /> All Shipments
      </h3>

      {loading ? (
        <p>Loading shipments...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : shipments.length === 0 ? (
        <p>No shipments found.</p>
      ) : (
        <table className="shipments-table">
          <thead>
            <tr>
              <th>Shipment ID</th>
              <th>From</th>
              <th>To</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((shipment) => (
              <tr key={shipment.shipment_id}>
                <td>{shipment.shipment_id}</td>
                <td>{shipment.from_branch_id}</td>
                <td>{shipment.to_branch_id}</td>
                <td>
                  {new Date(shipment.shipment_date).toLocaleDateString()}
                </td>
                <td className={`status-${shipment.status.toLowerCase()}`}>
                  {shipment.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
