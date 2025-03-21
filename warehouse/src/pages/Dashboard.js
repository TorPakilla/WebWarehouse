import React, { useState, useEffect, useRef, useCallback } from "react";
import Modal from "react-modal";
import { getCategoryIcon } from "../components/DynamicIcon";
import X10 from "../styles/X10.png";
import MapComponent from "../components/MapComponent";
import "../components/DashBoard/PopupDashboard.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "../components/DashBoard/PopupDashboard.css";
import ManageOrders from "../components/Orders/ManageOrders"; 
// ===== Import ManageReports =====
import ManageReports from "../components/Reports/ManageReports";
import ManageSuppliers from "../components/Suppliers/ManageSuppliers.js";
import InlinePopupShipments from "../components/Shipments/InlinePopupShipments";
import {
  FaLayerGroup,
  FaExclamationTriangle,
  FaShippingFast,
  FaStore,
  FaUser,
  FaUserTie,
  FaUsersCog,
  FaChartPie,
  FaCashRegister,
  FaWarehouse,
  FaBars,
  FaBoxes,
  FaProductHunt,
  FaTruck,
  FaBuilding,
  FaClipboardList,
  FaIndustry,
  FaPlus,
  FaTrash,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "../components/DashBoard/Dashboard.css";
import axios from "../api/config";
import { API_BASE_URL } from "../api/config";
import { Tooltip } from "react-tooltip";

// สมมุติว่า EmployeesPopup ถูกสร้างไว้แล้วใน components/Employees/EmployeesPopup.js
import EmployeesPopup from "../components/Employees/EmployeesPopup";
import PopupShipments from "../components/Shipments/PopupShipments";

// ตั้งค่า root สำหรับ react-modal
Modal.setAppElement("#root");

// ฟังก์ชันช่วย format จำนวน (เช่น 1K)
const formatQuantity = (quantity) => {
  if (!quantity || isNaN(quantity)) return "0";
  return quantity >= 1000 ? (quantity / 1000).toFixed(1) + "K" : quantity.toString();
};

const Dashboard = () => {
  // ---------------------- Global States ----------------------
  const [userDetails, setUserDetails] = useState({});
  const loggedInUser = JSON.parse(localStorage.getItem("user")) || {};
  const token = localStorage.getItem("token");

  // ดึง role จากข้อมูลผู้ใช้ (อาจอยู่ใน userDetails.role หรือ userDetails.data.role)
  const role = userDetails.role || userDetails.data?.role || "";
  // สำหรับ Manager เราสามารถดึง branch_id จาก userDetails.branch (ตาม Role.go ที่ส่งกลับมา)
  const managerBranchId = userDetails.branch?.branch_id || "";

  // ---------------------- Dashboard Data ----------------------
  const [posCategories, setPosCategories] = useState([]);
  const [inventoryData, setInventoryData] = useState({});
  const [posLowStock, setPosLowStock] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);

  const [pendingShipments, setPendingShipments] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [posBranches, setPosBranches] = useState([]);
  const [employees, setEmployees] = useState([]);

  // ---------------------- Map & Dropdown ----------------------
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [showEmployeeHierarchy, setShowEmployeeHierarchy] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [showShipments, setShowShipments] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);

  // ---------------------- Popup & System States ----------------------
  const [openPopup, setOpenPopup] = useState(null);
  const [popupData, setPopupData] = useState(null);
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState("");

  // ---------------------- Manage Orders States ----------------------
  const [suppliers, setSuppliers] = useState([]);
  const [filteredProductsBySupplier, setFilteredProductsBySupplier] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [orderItems, setOrderItems] = useState([]);

  // ---------------------- Manage Shipments (Single) ----------------------
  const [shipment, setShipment] = useState({
    fromBranch: "",
    toBranch: "",
    products: [],
  });
  const [showShipmentProductPopup, setShowShipmentProductPopup] = useState(false);
  const [shipmentList, setShipmentList] = useState([]);
  const [shipmentCategories, setShipmentCategories] = useState([]);
  const [shipmentLoading, setShipmentLoading] = useState({
    branches: false,
    shipments: false,
    categories: false,
  });
  const [shipmentErrors, setShipmentErrors] = useState({
    branches: null,
    shipments: null,
    categories: null,
  });
  const [shipmentFromBranches, setShipmentFromBranches] = useState([]);
  const [shipmentToBranches, setShipmentToBranches] = useState([]);

  // ---------------------- Manage Products States ----------------------
  const [productFormData, setProductFormData] = useState({
    product_name: "",
    category: "",
    type: "",
    price: 0,
    quantity: 0,
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProductPopupCategory, setSelectedProductPopupCategory] = useState(null);

  // ---------------------- Manage Branches States ----------------------
  const [manageBranches, setManageBranches] = useState([]);
  const [branchFormData, setBranchFormData] = useState({ bname: "", location: "" });
  const [editingBranch, setEditingBranch] = useState(null);

  // ---------------------- State สำหรับการเลือกพิกัด ----------------------
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);

  // ---------------------- Refs for Dropdowns ----------------------
  const dropdownRef = useRef(null);
  const branchDropdownRef = useRef(null);
  const employeeDropdownRef = useRef(null);
  const lowStockDropdownRef = useRef(null);

  // ---------------------- Utility Functions ----------------------
  const getPosColor = (qty) => {
    if (qty === 0 || qty < 150) return "low-stock-red";
    if (qty < 500) return "low-stock-yellow";
    return "low-stock-white";
  };

  const getEmployeeCount = useCallback(
    (branchId) => employees.filter((emp) => emp.branch_id === branchId).length,
    [employees]
  );

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  // ---------------------- ฟังก์ชันสำหรับอัปเดตสถานะ Order ----------------------
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/Orders/${orderId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPopupData((prevData) => {
        if (!prevData || !prevData.pendingOrders) return prevData;
        const updatedOrders = prevData.pendingOrders.filter((o) => o.order_id !== orderId);
        return { ...prevData, pendingOrders: updatedOrders };
      });
      alert(`Order ${orderId} has been ${newStatus}`);
    } catch (error) {
      console.error("Failed to update order status:", error);
      alert("Failed to update order status.");
    }
  };

  // ---------------------- Fetch Data ----------------------
  useEffect(() => {
    if (loggedInUser && Object.keys(loggedInUser).length > 0) {
      setUserDetails(loggedInUser);
    } else if (token) {
      axios
        .get(`${API_BASE_URL}/user-details`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setUserDetails(res.data))
        .catch((err) => console.error("Error fetching user details:", err));
    }
  }, [loggedInUser, token]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // POS Low Stock
        const { data: posData } = await axios.get(`${API_BASE_URL}/GetPosLowStock`);
        if (posData.low_stock_items && posData.low_stock_items.length > 0) {
          setPosLowStock(posData.low_stock_items);
          setPosCategories([
            ...new Set(posData.low_stock_items.map((item) => item.category.toLowerCase())),
          ]);
        } else {
          setPosLowStock([]);
        }

        // Warehouse Branches
        const { data: branchData } = await axios.get(`${API_BASE_URL}/branches`);
        if (branchData.branches) setAllBranches(branchData.branches);

        // POS Branches
        const { data: posBranchData } = await axios.get(`${API_BASE_URL}/POSBranches`);
        if (posBranchData.branches) setPosBranches(posBranchData.branches);

        // Inventory by Category
        const { data: inventoryRes } = await axios.get(`${API_BASE_URL}/inventory-by-category`);
        const inventoryMap = {};
        inventoryRes.categories.forEach((cat) => {
          inventoryMap[cat.category.toLowerCase()] = cat.details || [];
        });
        setInventoryData(inventoryMap);

        // Shipments
        const { data: shipmentsData } = await axios.get(`${API_BASE_URL}/shipments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setShipmentList(shipmentsData.Shipments || []);

        // Employees
        const { data: employeesData } = await axios.get(`${API_BASE_URL}/Employees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEmployees(employeesData.Data || []);

        // Suppliers
        const { data: supplierData } = await axios.get(`${API_BASE_URL}/Supplier`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuppliers(supplierData.data || []);
      } catch (error) {
        console.error("Error fetching API data:", error);
      }
    };
    fetchData();
  }, [token]);

  // เมื่อเปลี่ยนแปลงค่า selectedSupplier ให้ดึงข้อมูลสินค้าของ Supplier นั้น
  useEffect(() => {
    if (selectedSupplier) {
      // แก้เป็นเรียก /ProductsBySupplier?supplier_id=xxx
      axios
        .get(`${API_BASE_URL}/ProductsBySupplier?supplier_id=${selectedSupplier}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setFilteredProductsBySupplier(res.data.products || []);
          // Reset selected product เมื่อเปลี่ยน supplier
          setSelectedProduct("");
        })
        .catch((error) => {
          console.error("Error fetching supplier products:", error);
          setFilteredProductsBySupplier([]);
        });
    } else {
      setFilteredProductsBySupplier([]);
    }
  }, [selectedSupplier, token]);

  // Filter POS Low Stock ตาม Branch/Category
  useEffect(() => {
    let filtered = posLowStock;
    if (selectedBranch) {
      filtered = filtered.filter((p) => p.branch_name === selectedBranch);
    }
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    setFilteredProducts(filtered);
  }, [selectedBranch, selectedCategory, posLowStock]);

  // เก็บ Categories จาก posLowStock
  useEffect(() => {
    const cats = [...new Set(posLowStock.map((item) => item.category))];
    setCategories(cats);
  }, [posLowStock]);

  // ฟังก์ชันสำหรับดึงข้อมูล Inventory ใหม่ (ใช้ใน Product Popup)
  const fetchInventoryData = async () => {
    try {
      const { data: inventoryRes } = await axios.get(`${API_BASE_URL}/inventory-by-category`);
      const inventoryMap = {};
      inventoryRes.categories.forEach((cat) => {
        inventoryMap[cat.category.toLowerCase()] = cat.details || [];
      });
      setInventoryData(inventoryMap);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
    }
  };

  // ---------------------- ฟังก์ชันสำหรับ Shipments Popup ----------------------
  const fetchShipmentsPopupData = async () => {
    try {
      setShipmentLoading((prev) => ({ ...prev, branches: true }));
      const [warehouseRes, posRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/WarehouseBranches`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/POSBranches`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setShipmentFromBranches(warehouseRes.data?.branches || []);
      setShipmentToBranches(posRes.data?.branches || []);
      setShipmentErrors((prev) => ({ ...prev, branches: null }));
    } catch (error) {
      console.error("Error fetching shipment branches:", error);
      setShipmentErrors((prev) => ({ ...prev, branches: "Error fetching branches" }));
    } finally {
      setShipmentLoading((prev) => ({ ...prev, branches: false }));
    }

    try {
      setShipmentLoading((prev) => ({ ...prev, shipments: true }));
      const shipmentsRes = await axios.get(`${API_BASE_URL}/Shipments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShipmentList(shipmentsRes.data?.Shipments || []);
      setShipmentErrors((prev) => ({ ...prev, shipments: null }));
    } catch (error) {
      console.error("Error fetching shipments:", error);
      setShipmentErrors((prev) => ({ ...prev, shipments: "Error fetching shipments" }));
    } finally {
      setShipmentLoading((prev) => ({ ...prev, shipments: false }));
    }

    try {
      setShipmentLoading((prev) => ({ ...prev, categories: true }));
      const categoriesRes = await axios.get(`${API_BASE_URL}/inventory-by-category`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShipmentCategories(categoriesRes.data?.categories || []);
      setShipmentErrors((prev) => ({ ...prev, categories: null }));
    } catch (error) {
      console.error("Error fetching shipment categories:", error);
      setShipmentErrors((prev) => ({ ...prev, categories: "Error fetching categories" }));
    } finally {
      setShipmentLoading((prev) => ({ ...prev, categories: false }));
    }
  };

  // ---------------------- ฟังก์ชันสำหรับ Map Location Selection ----------------------
  const handleMapClick = (coordinate) => {
    const locationString = `${coordinate.lng}, ${coordinate.lat}`;
    setBranchFormData((prev) => ({ ...prev, location: locationString }));
    setSelectedLocation(locationString);
    setIsSelectingLocation(false);
    setOpenPopup({ name: "Manage Branches", route: "/branches", icon: FaBuilding });
  };

  // ---------------------- ฟังก์ชันสำหรับ Manage Branches ----------------------
  const fetchManageBranches = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/Branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setManageBranches(res.data.branches || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await axios.put(
          `${API_BASE_URL}/Branches/${editingBranch.branch_id}`,
          {
            b_name: branchFormData.bname,
            location: branchFormData.location,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/Branches`,
          {
            b_name: branchFormData.bname,
            location: branchFormData.location,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      fetchManageBranches();
      setBranchFormData({ bname: "", location: "" });
      setEditingBranch(null);
    } catch (error) {
      console.error("Error saving branch:", error);
    }
  };

  const handleBranchDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/Branches/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchManageBranches();
    } catch (error) {
      console.error("Error deleting branch:", error);
    }
  };

  const handleBranchEdit = (branch) => {
    setEditingBranch(branch);
    setBranchFormData({ bname: branch.b_name, location: branch.location });
  };

  const handleBranchCancel = () => {
    setBranchFormData({ bname: "", location: "" });
    setEditingBranch(null);
  };

  // ---------------------- Handle System Click ----------------------
  const handleSystemClick = async (system) => {
    console.log("System clicked:", system);
    if (system.name === "Manage Orders") {
      try {
        const res = await axios.get(`${API_BASE_URL}/Orders?status=pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allOrders = res.data?.data || [];
        const pendingOrdersOnly = allOrders.filter((o) => o.status === "Pending");
        setPopupData({ pendingOrders: pendingOrdersOnly });
      } catch (error) {
        console.error("Error fetching pending orders:", error);
        setPopupData({ pendingOrders: [] });
      }
    } else if (system.name === "Manage Products") {
      // รีเซ็ต Manage Products
      setSelectedProductPopupCategory(null);
      setProductFormData({
        product_name: "",
        category: "",
        type: "",
        price: 0,
        quantity: 0,
      });
      setEditingProduct(null);
      setPopupData(null);
    } else if (system.name === "Manage Shipments") {
      await fetchShipmentsPopupData();
      setPopupData(null);
    } else if (system.name === "Manage Branches") {
      // สำหรับ Manage Branches ให้ดึงข้อมูลสาขาก่อนเปิด popup
      await fetchManageBranches();
      setPopupData(null);
    } else if (system.name === "Manage Reports") {
      setPopupData(null);
    } else if (system.name === "Manage Suppliers") {
      setPopupData(null);
    } else {
      setPopupData(null);
    }
    setOpenPopup(system);
  };

  // ---------------------- Manage Products Functions ----------------------
  const handleProductSubmit = async () => {
    try {
      const productPayload = {
        product_name: productFormData.product_name,
        description: productFormData.category,
        type: productFormData.type,
        price: productFormData.price,
        initial_quantity: productFormData.quantity,
      };
      if (editingProduct) {
        // ใช้ PUT แทน PATCH
        await axios.put(`${API_BASE_URL}/Product/${editingProduct.id}`, productPayload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Product updated successfully!");
      } else {
        await axios.post(`${API_BASE_URL}/Product`, productPayload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Product created successfully!");
      }

      await fetchInventoryData();
      setProductFormData({ product_name: "", category: "", type: "", price: 0, quantity: 0 });
      setEditingProduct(null);
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product.");
    }
  };

  const handleProductEdit = (product) => {
    setEditingProduct(product);
    setProductFormData({
      product_name: product.product_name,
      category: product.category,
      type: product.type,
      price: product.price,
      quantity: product.quantity,
    });
  };

  const handleProductDelete = async (productId) => {
    try {
      await axios.delete(`${API_BASE_URL}/Product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Product deleted successfully!");
      await fetchInventoryData();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product.");
    }
  };

  // ---------------------- ฟังก์ชันการอัปเดตสินค้าใน Shipment เดียว ----------------------
  const handleProductsSelected = (productSelection) => {
    console.log("[handleProductsSelected] productSelection =", productSelection);
    setShipment((prev) => ({
      ...prev,
      products: [...prev.products, productSelection],
    }));
  };

  // ฟังก์ชัน Reset Shipment (Add New Shipment)
  const handleResetShipment = () => {
    setShipment({ fromBranch: "", toBranch: "", products: [] });
  };

  // ฟังก์ชัน Submit Shipment เดียว
  const handleSubmitShipment = async () => {
    if (!shipment.fromBranch || !shipment.toBranch || shipment.products.length === 0) {
      alert("Shipment has incomplete data.");
      return;
    }
    try {
      const shipmentRequests = shipment.products.map((product) => {
        const requestData = {
          from_branch_id: shipment.fromBranch,
          to_branch_id: shipment.toBranch,
          items: [
            {
              warehouse_inventory_id: product.warehouse_inventory_id,
              pos_inventory_id: product.pos_inventory_id,
              product_unit_id: product.product_unit_id || "",
              quantity: product.quantity,
            },
          ],
        };
        return axios.post(`${API_BASE_URL}/Shipments`, requestData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      });
      await Promise.all(shipmentRequests);
      alert("Shipments created successfully!");
      setShipment({ fromBranch: "", toBranch: "", products: [] });
      setShowShipmentProductPopup(false);
    } catch (error) {
      console.error("Error creating shipments:", error);
      alert("Failed to create shipments.");
    }
  };

  // ---------------------- Modal Helpers ----------------------
  const resetModalStates = () => {
    // รีเซ็ต state สำหรับ Manage Products, Shipments, Branches เป็นต้น
    setProductFormData({ product_name: "", category: "", type: "", price: 0, quantity: 0 });
    setEditingProduct(null);
    setSelectedProductPopupCategory(null);
    setShipment({ fromBranch: "", toBranch: "", products: [] });
    setShowShipmentProductPopup(false);
    setBranchFormData({ bname: "", location: "" });
    setEditingBranch(null);
  };

  const closeModal = () => {
    setOpenPopup(null);
    resetModalStates();
  };

  // ฟังก์ชันคัดกรอง System Cards ตาม role
  const systemCards = [
    {
      id: "1",
      name: "Manage Orders",
      route: "/orders",
      icon: FaBoxes,
      alert: true,
      alertMessage: "สินค้าในมีสต๊อกสินค้าต่ำ",
    },
    {
      id: "2",
      name: "Manage Products",
      route: "/Product",
      icon: FaProductHunt,
      alert: false,
      alertMessage: "ในหมวดหมู่สินค้า ไม่มีสินค้านั้นอยู่",
    },
    {
      id: "3",
      name: "Manage Shipments",
      route: "/shipments",
      icon: FaTruck,
      alert: true,
      alertMessage: "สินค้าในร้านค้ามีสต๊อกสินค้าต่ำ",
    },
    { id: "4", name: "Manage Branches", route: "/branches", icon: FaBuilding },
    { id: "5", name: "Manage Employees", route: "/employees", icon: FaUserTie },
    { id: "6", name: "Manage Reports", route: "/inventory", icon: FaClipboardList },
    { id: "7", name: "Manage Suppliers", route: "/suppliers", icon: FaIndustry },
  ];

  const getAllowedSystems = (role) => {
    if (role === "God") {
      return systemCards;
    } else if (role === "Stock") {
      return systemCards.filter(
        (system) => system.name === "Manage Orders" || system.name === "Manage Shipments"
      );
    } else if (role === "Audit" || role === "Account") {
      return systemCards.filter((system) => system.name === "Manage Reports");
    } else if (role === "Manager") {
      return systemCards; // Manager เห็นทุกระบบใน overlay แต่ใน dropdown branches ให้กรองตามสาขาของตัวเอง
    }
    return [];
  };

  // แยก render เนื้อหาใน Modal ตาม openPopup.name
  const renderModalContent = () => {
    switch (openPopup?.name) {
      case "Manage Orders":
        return (
          <ManageOrders
            popupData={popupData}
            setPopupData={setPopupData}
            suppliers={suppliers}
            selectedSupplier={selectedSupplier}
            setSelectedSupplier={setSelectedSupplier}
            filteredProductsBySupplier={filteredProductsBySupplier}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            selectedCategoryLabel={selectedCategoryLabel}
            setSelectedCategoryLabel={setSelectedCategoryLabel}
            quantity={quantity}
            setQuantity={setQuantity}
            orderItems={orderItems}
            setOrderItems={setOrderItems}
            handleUpdateOrderStatus={handleUpdateOrderStatus}
            token={token}
            posCategories={posCategories}
            getCategoryIcon={getCategoryIcon}
          />
        );

      case "Manage Suppliers":
        return (
          <div className="modal-body">
            <ManageSuppliers />
          </div>
        );

      case "Manage Products":
        // Define reusable style objects
        const modalBodyStyle = {
          display: "grid",
          gridTemplateColumns: "auto 300px",
          gridTemplateRows: "auto 120px",
          gap: "10px",
          height: "100%",
        };

        const leftMiddleContainerStyle = {
          gridColumn: "1",
          gridRow: "1",
          display: "flex",
          flexDirection: "row",
          gap: "10px",
          overflow: "hidden",
        };

        const formSectionStyle = {
          flex: "0 0 35%",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        };

        const pendingOrdersColumnStyle = {
          flex: 1,
          overflowY: "auto",
        };

        const categoriesContainerStyle = {
          gridColumn: "2",
          gridRow: "1 / 3",
          overflowY: "auto",
        };

        const summaryContainerStyle = {
          gridColumn: "1",
          gridRow: "2",
          border: "1px solid #ffcc00",
          borderRadius: "8px",
          padding: "10px",
          display: "flex",
          gap: "20px",
          justifyContent: "space-between",
          alignItems: "flex-start",
        };

        return (
          <div className="modal-body product-popup-content" style={modalBodyStyle}>
            {/* ซ้าย: Form สร้าง/แก้ไขสินค้า และรายการสินค้าใน Category */}
            <div className="left-middle-container" style={leftMiddleContainerStyle}>
              <div className="modal-section divider" style={formSectionStyle}>
                <div className="header-row-for-form">
                  <h4>{editingProduct ? "Edit Product" : "Create New Product"}</h4>
                  <button className="modal-button add-product-button" onClick={handleProductSubmit}>
                    <FaPlus /> {editingProduct ? "Update Product" : "Add Product"}
                  </button>
                </div>
                {/* Form Fields */}
                <div className="form-group">
                  <label>Product Name</label>
                  <input
                    type="text"
                    value={productFormData.product_name}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        product_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={productFormData.category}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        category: e.target.value,
                      })
                    }
                    placeholder="Enter product description"
                  />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={productFormData.type}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        type: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Type</option>
                    <option value="Pallet">Pallet</option>
                    <option value="Box">Box</option>
                    <option value="Pieces">Pieces</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    value={productFormData.price}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        price: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Initial Quantity</label>
                  <input
                    type="number"
                    value={productFormData.quantity}
                    onChange={(e) =>
                      setProductFormData({
                        ...productFormData,
                        quantity: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              {/* ขวา: รายการสินค้าใน Category */}
              <div className="modal-section divider pending-orders-column" style={pendingOrdersColumnStyle}>
                <h4>
                  Products in{" "}
                  {selectedProductPopupCategory
                    ? selectedProductPopupCategory.toUpperCase()
                    : "All"}
                </h4>
                {selectedProductPopupCategory ? (
                  <ul className="pending-orders-list">
                    {(inventoryData[selectedProductPopupCategory] || []).map((product) => (
                      <li key={`wh-${product.id}`} className="pending-order-item">
                        <span>{product.product_name} (Warehouse)</span>
                      </li>
                    ))}
                    {[...new Map(
                      posLowStock
                        .filter(
                          (item) =>
                            item.category.toLowerCase() === selectedProductPopupCategory
                        )
                        .map((item) => [item.product_name.toLowerCase(), item])
                    ).values()].map((item, index) => (
                      <li key={`pos-${index}`} className="pending-order-item">
                        <span>{item.product_name} (POS)</span>
                        <div>
                          <button
                            className="status-button approve"
                            onClick={() =>
                              setProductFormData({
                                ...productFormData,
                                product_name: item.product_name,
                                category: item.category.toLowerCase(),
                              })
                            }
                          >
                            <FaCheck />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Please select a category.</p>
                )}
              </div>
            </div>
            {/* ส่วน Categories + Summary */}
            <div className="categories-container" style={categoriesContainerStyle}>
              <h4>Categories</h4>
              <div className="all-categories-grid">
                {[...new Set([
                  ...Object.keys(inventoryData).map((cat) => cat.toLowerCase()),
                  ...posCategories.map((cat) => cat.toLowerCase()),
                ])].map((cat, idx) => {
                  const iconData = getCategoryIcon(cat);
                  const whCount = inventoryData[cat] ? inventoryData[cat].length : 0;
                  const posCount = posLowStock.filter(
                    (item) => item.category.toLowerCase() === cat
                  ).length;
                  return (
                    <div
                      key={idx}
                      className="category-item"
                      style={{ cursor: "pointer", marginBottom: "5px" }}
                      onClick={() => {
                        setSelectedProductPopupCategory(cat);
                        setProductFormData({ ...productFormData, category: cat });
                      }}
                    >
                      {iconData.type === "image" ? (
                        <img
                          src={iconData.value}
                          alt={cat}
                          className="category-icon-Dashboard"
                          style={{ width: "26px", height: "26px" }}
                        />
                      ) : (
                        React.createElement(iconData.value, { size: 26 })
                      )}
                      <div className="category-item-text">
                        {cat.toUpperCase()} (WH: {whCount}, POS: {posCount})
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="summary-container" style={summaryContainerStyle}>
              <div style={{ flex: 1 }}>
                <h5>Warehouse Summary</h5>
                {selectedProductPopupCategory &&
                inventoryData[selectedProductPopupCategory] &&
                inventoryData[selectedProductPopupCategory].length > 0 ? (
                  <p>
                    Quantity:{" "}
                    {inventoryData[selectedProductPopupCategory].reduce(
                      (sum, prod) => sum + (prod.quantity || 0),
                      0
                    )}{" "}
                    Price:{" "}
                    {inventoryData[selectedProductPopupCategory].reduce(
                      (sum, prod) => sum + (prod.price || 0),
                      0
                    )}
                  </p>
                ) : (
                  <p>No Warehouse data.</p>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h5>POS Summary</h5>
                {selectedProductPopupCategory
                  ? (() => {
                      const posItems = posLowStock.filter(
                        (item) =>
                          item.category.toLowerCase() === selectedProductPopupCategory
                      );
                      const uniquePos = [
                        ...new Map(
                          posItems.map((item) => [item.product_name.toLowerCase(), item])
                        ).values(),
                      ];
                      const totalQty = uniquePos.reduce(
                        (sum, item) => sum + (item.quantity || 0),
                        0
                      );
                      const totalPrice = uniquePos.reduce(
                        (sum, item) => sum + (item.price || 0),
                        0
                      );
                      return (
                        <p>
                          Quantity: {totalQty} Price: {totalPrice > 0 ? totalPrice : "-"}
                        </p>
                      );
                    })()
                  : (
                    <p>No POS data.</p>
                  )}
              </div>
            </div>
          </div>
        );

      case "Manage Shipments":
        return (
          <div className="modal-body shipments-popup">
            <div className="left-column">
              <h3>Create New Shipment</h3>
              <div className="shipment-form-column">
                <div className="shipment-form-row">
                  <div style={{ flex: 1 }}>
                    <label>
                      <FaWarehouse /> Select Warehouse:
                    </label>
                    {shipmentLoading.branches ? (
                      <p>Loading warehouses...</p>
                    ) : shipmentErrors.branches ? (
                      <p className="error">{shipmentErrors.branches}</p>
                    ) : (
                      <select
                        value={shipment.fromBranch}
                        onChange={(e) => setShipment({ ...shipment, fromBranch: e.target.value })}
                      >
                        <option value="">Select Warehouse</option>
                        {shipmentFromBranches.map((branch) => (
                          <option key={branch.branch_id} value={branch.branch_id}>
                            {branch.b_name || branch.branch_id}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>
                      <FaTruck /> Select POS:
                    </label>
                    {shipmentLoading.branches ? (
                      <p>Loading POS branches...</p>
                    ) : shipmentErrors.branches ? (
                      <p className="error">{shipmentErrors.branches}</p>
                    ) : (
                      <select
                        value={shipment.toBranch}
                        onChange={(e) => setShipment({ ...shipment, toBranch: e.target.value })}
                      >
                        <option value="">Select POS</option>
                        {shipmentToBranches.map((branch) => (
                          <option key={branch.branch_id} value={branch.branch_id}>
                            {branch.b_name || branch.branch_id}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="selected-products-block">
                  <h5>Selected Products:</h5>
                  {shipment.products.length > 0 ? (
                    <ul>
                      {shipment.products.map((prod, idx) => (
                        <li key={idx}>
                          {prod.product_name} - Qty: {prod.quantity}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: "12px", color: "#aaa" }}>No products selected</p>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <button className="modal-button" onClick={handleResetShipment}>
                  <FaPlus /> Add New Shipment
                </button>
                {shipment.fromBranch && shipment.toBranch && (
                  <button className="modal-button" onClick={() => setShowShipmentProductPopup(true)}>
                    <FaPlus /> Select Products
                  </button>
                )}
              </div>
              <button className="modal-button" onClick={handleSubmitShipment}>
                Submit Shipment
              </button>
            </div>
            <div className="right-column">
              <div className="right-column-header">
                <h3>All Shipments</h3>
              </div>
              {shipmentLoading.shipments ? (
                <p>Loading shipments...</p>
              ) : shipmentErrors.shipments ? (
                <p className="error">{shipmentErrors.shipments}</p>
              ) : shipmentList.length === 0 ? (
                <p>No shipments found.</p>
              ) : (
                <div className="table-container">
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
                      {shipmentList.map((s) => (
                        <tr key={s.shipment_id}>
                          <td>{s.shipment_id}</td>
                          <td>{s.from_branch_id}</td>
                          <td>{s.to_branch_id}</td>
                          <td>{new Date(s.shipment_date).toLocaleDateString()}</td>
                          <td className={`status-${s.status.toLowerCase()}`}>{s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      case "Manage Reports":
        return (
          <div className="modal-body">
            <ManageReports />
          </div>
        );

      case "Manage Branches":
        return (
          <div className="modal-body manage-branches-popup">
            <form onSubmit={handleBranchSubmit} className="branch-form">
              <div className="form-group">
                <label htmlFor="branchName">Branch Name:</label>
                <input
                  id="branchName"
                  type="text"
                  value={branchFormData.bname}
                  onChange={(e) =>
                    setBranchFormData({ ...branchFormData, bname: e.target.value })
                  }
                  required
                  placeholder="Enter branch name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="branchLocation">Location (Coordinates):</label>
                <input
                  id="branchLocation"
                  type="text"
                  value={branchFormData.location}
                  onChange={(e) =>
                    setBranchFormData({ ...branchFormData, location: e.target.value })
                  }
                  required
                  placeholder="Select location on map or enter manually"
                />
                <button
                  type="button"
                  className="select-map-btn"
                  onClick={() => {
                    setIsSelectingLocation(true);
                    setOpenPopup(null);
                  }}
                >
                  Select on Map
                </button>
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  {editingBranch ? "Update Branch" : "Add Branch"}
                </button>
                {editingBranch && (
                  <button type="button" onClick={handleBranchCancel} className="cancel-btn">
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="branches-table-container">
              <table className="branches-table">
                <thead>
                  <tr>
                    <th>Branch ID</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {manageBranches && manageBranches.length > 0 ? (
                    // สำหรับ role Manager ให้แสดงเฉพาะสาขาที่ Manager สังกัด
                    manageBranches
                      .filter((branch) =>
                        role === "Manager" ? branch.branch_id === managerBranchId : true
                      )
                      .map((branch) => (
                        <tr key={branch.branch_id}>
                          <td>{branch.branch_id}</td>
                          <td>{branch.b_name}</td>
                          <td>{branch.location}</td>
                          <td>
                            <button onClick={() => handleBranchEdit(branch)} className="edit-btn">
                              Edit
                            </button>
                            <button
                              onClick={() => handleBranchDelete(branch.branch_id)}
                              className="delete-btn"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="4">No branches available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "Manage Employees":
        return (
          <div className="modal-body">
            <EmployeesPopup />
          </div>
        );
      default:
        return null;
    }
  };

  // ---------------------- Render JSX ----------------------
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="dashboard-container">
        {/* ================= HEADER ================= */}
        <header className="dashboard-header">
          <div className="logo-container">
            <div className="logo-box">
              <img src={X10} alt="X10 Logo" className="x10-logo" />
            </div>
            {/* แสดงชื่อสาขาจากข้อมูลผู้ใช้ (อาจมาจาก userDetails.data หรือ userDetails.branch) */}
            <h1>{userDetails.data?.b_name || userDetails.branch?.b_name || "Branch Name"}</h1>
          </div>

          <div className="header-right">
            {/* POS Low Stock Alert */}
            <div className="icon-box" onClick={() => setShowLowStock((prev) => !prev)}>
              <FaExclamationTriangle size={26} />
              <div className="icon-label">POS Low Stock</div>
              <span className="icon-number">
                {posLowStock.length > 0 ? filteredProducts.length : "0"}
              </span>
            </div>
            {showLowStock && (
              <div ref={lowStockDropdownRef} className="low-stock-dropdown">
                <h4>Low Stock Alert</h4>
                <select
                  className="branch-selector"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="">📍 All POS Branches</option>
                  {posBranches.map((branch, index) => (
                    <option key={index} value={branch.b_name}>
                      {branch.b_name} - {branch.location}
                    </option>
                  ))}
                </select>
                <select
                  className="category-selector"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">📦 All Categories</option>
                  {categories.map((cat, i) => (
                    <option key={i} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <PosLowStockGrid products={filteredProducts} selectedBranch={selectedBranch} />
              </div>
            )}

            {/* Shipments Icon */}
            <div className="icon-box" onClick={() => setShowShipments((prev) => !prev)}>
              <FaShippingFast size={26} />
              <div className="icon-label">Shipments</div>
              <div className="icon-number">{formatQuantity(pendingShipments.length)}</div>
            </div>
            {showShipments && (
              <div className="shipment-dropdown">
                <h4>Shipment List</h4>
                {pendingShipments.length > 0 ? (
                  pendingShipments.map((shipment, index) => (
                    <div key={index} className="shipment-item">
                      <div className="shipment-info">
                        <FaShippingFast className="shipment-icon" />
                        <span className="shipment-number">{shipment.shipment_number}</span>
                      </div>
                      <span className="shipment-status">{shipment.status}</span>
                    </div>
                  ))
                ) : (
                  <div className="no-shipments">No Shipments Available</div>
                )}
              </div>
            )}

            {/* Branches Icon */}
            <div className="icon-box" onClick={() => setShowBranches((prev) => !prev)}>
              <FaStore size={26} />
              <div className="icon-label">Branches</div>
              <div className="icon-number">{allBranches.length}</div>
            </div>
            {showBranches && (
              <div ref={branchDropdownRef} className="dropdown-content branch-dropdown">
                <h4>Branch List</h4>
                {allBranches.length > 0 ? (
                  <ul>
                    {allBranches
                      .filter((branch) =>
                        role === "Manager" ? branch.branch_id === managerBranchId : true
                      )
                      .map((branch, index) => (
                        <li key={index} className="branch-item">
                          <div className="branch-info">
                            <FaStore className="branch-icon" size={14} />
                            <strong>{branch.b_name}</strong> - {branch.location}
                          </div>
                          <div className="branch-employees">
                            <FaUser className="employee-icon" size={14} />
                            <span>{getEmployeeCount(branch.branch_id)}</span>
                          </div>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>No branches available.</p>
                )}
              </div>
            )}

            {/* Employees Icon */}
            <div className="icon-box" onClick={() => setShowEmployeeHierarchy((prev) => !prev)}>
              <FaUser size={26} />
              <div className="icon-label">Employees</div>
              <div className="icon-number">{formatQuantity(employees.length)}</div>
            </div>
            {showEmployeeHierarchy && (
              <div ref={employeeDropdownRef} className="employee-dropdown">
                <div className="employee-role god">
                  <FaUserTie size={22} /> God
                  <ul>
                    {employees.filter((emp) => emp.role === "God").map((emp) => (
                      <li key={emp.id}>{emp.name}</li>
                    ))}
                  </ul>
                </div>
                <div className="employee-role manager">
                  <FaUsersCog size={22} /> Manager
                  <ul>
                    {employees.filter((emp) => emp.role === "Manager").map((emp) => (
                      <li key={emp.id}>{emp.name}</li>
                    ))}
                  </ul>
                </div>
                <div className="employee-subroles">
                  <div className="subrole">
                    <FaChartPie size={22} /> Audit
                    <ul>
                      {employees.filter((emp) => emp.role === "Audit").map((emp) => (
                        <li key={emp.id}>{emp.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="subrole">
                    <FaCashRegister size={22} /> Account
                    <ul>
                      {employees.filter((emp) => emp.role === "Account").map((emp) => (
                        <li key={emp.id}>{emp.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="subrole">
                    <FaWarehouse size={22} /> Stock
                    <ul>
                      {employees.filter((emp) => emp.role === "Stock").map((emp) => (
                        <li key={emp.id}>{emp.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Categories Icon */}
            <div
              className="category-box-for-dashboard more-button"
              onClick={() => setShowMoreCategories((prev) => !prev)}
            >
              <FaLayerGroup size={26} />
              <div className="icon-label">Category</div>
              <div className="icon-number">
                {formatQuantity(
                  categories.reduce((acc, cat) => {
                    const catLower = cat.toLowerCase();
                    const catData = inventoryData[catLower] || [];
                    return acc + catData.reduce((sum, p) => sum + (p.quantity || 0), 0);
                  }, 0)
                )}
              </div>
            </div>
            <div
              ref={dropdownRef}
              className={`category-dropdown ${showMoreCategories ? "expanded" : "hidden"}`}
            >
              <div className="category-grid">
                {posCategories.map((cat, index) => {
                  const categoryIcon = getCategoryIcon(cat);
                  const totalQty = (inventoryData[cat] || []).reduce(
                    (acc, p) => acc + p.quantity,
                    0
                  );
                  return (
                    <div key={index} className="category-dropdown-item">
                      <div className="category-icon-wrapper">
                        {categoryIcon.type === "image" ? (
                          <img
                            src={categoryIcon.value}
                            alt={cat}
                            className="category-icon-Dashboard"
                            style={{ width: "26px", height: "26px" }}
                          />
                        ) : (
                          <categoryIcon.value size={26} />
                        )}
                      </div>
                      <div className="category-name">{cat.toUpperCase()}</div>
                      <div className="category-total-quantity">{formatQuantity(totalQty)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hamburger Icon for User Menu */}
            <div className="icon-box" onClick={() => setShowUserMenu((prev) => !prev)}>
              <FaBars size={26} />
            </div>
            {showUserMenu && (
              <div className="user-menu-dropdown open">
                <div className="user-info">
                  <FaUser size={20} />
                  <span>{userDetails.name || "Guest"}</span>
                </div>
                <div className="user-details">
                  {userDetails.email && (
                    <p>
                      <strong>Email:</strong> {userDetails.email}
                    </p>
                  )}
                  {userDetails.role && (
                    <p>
                      <strong>Role:</strong> {userDetails.role}
                    </p>
                  )}
                </div>
                <button onClick={handleLogout} className="logout-button">
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ================= Map + Systems Overlay ================= */}
        <div className="map-container-with-systems">
          <MapComponent
            location={selectedLocation}
            onMapClick={handleMapClick}
            isSelectingLocation={isSelectingLocation}
            allShipments={pendingShipments}
            allBranches={allBranches}
          />
          <div className="systems-overlay">
            {getAllowedSystems(role).map((system) => (
              <div
                key={system.id}
                className="card-container"
                data-tooltip-id={`tooltip-${system.id}`}
                onClick={() => handleSystemClick(system)}
                style={{ cursor: "pointer" }}
              >
                <div className="card-content">
                  <system.icon size={36} className="manage-icon" />
                  <p className="card-title">{system.name}</p>
                  {system.alert && (
                    <span className="alert-icon">
                      <FaExclamationTriangle size={20} color="#FFC107" />
                    </span>
                  )}
                </div>
                {system.alert && (
                  <Tooltip id={`tooltip-${system.id}`} place="top" effect="solid">
                    {system.alertMessage}
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ================= Modal Popup สำหรับ Systems ================= */}
        {openPopup && (
          <Modal
            isOpen={true}
            onRequestClose={closeModal}
            contentLabel={openPopup.name}
            className="modal-content custom-modal-size"
            overlayClassName="modal-overlay"
          >
            <div className="modal-header">
              <h2>{openPopup.name}</h2>
              <button className="popup-close-button" onClick={closeModal}>
                Close
              </button>
            </div>
            {renderModalContent()}
          </Modal>
        )}

        {/* InlinePopupShipments เมื่อกด Select Products */}
        {showShipmentProductPopup && (
          <div className="inline-popup-shipments">
            <InlinePopupShipments
              fromBranch={shipment.fromBranch}
              toBranch={shipment.toBranch}
              onConfirm={handleProductsSelected}
              onClose={() => setShowShipmentProductPopup(false)}
            />
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default Dashboard;

/* -----------------------------------------------
   Sub-Component: PosLowStockGrid
----------------------------------------------- */
const PosLowStockGrid = ({ products, selectedBranch }) => {
  const branchGroups = products.reduce((groups, p) => {
    (groups[p.branch_name] = groups[p.branch_name] || []).push(p);
    return groups;
  }, {});
  const branchNames = Object.keys(branchGroups);
  const isSingleBranch = selectedBranch !== "";
  return (
    <div className="low-stock-grid-container">
      {branchNames.map((branchName) => {
        const items = branchGroups[branchName] || [];
        const columns = isSingleBranch ? 5 : 2;
        const rows = [];
        for (let i = 0; i < items.length; i += columns) {
          rows.push(items.slice(i, i + columns));
        }
        const rowClassName = isSingleBranch
          ? "low-stock-grid-row six-columns"
          : "low-stock-grid-row two-columns";
        const isSelected = branchName === selectedBranch;

        return (
          <div
            key={branchName}
            className={`low-stock-grid-item ${
              isSelected ? "selected-branch" : ""
            } ${isSingleBranch ? "single-branch-mode" : "all-branches-mode"}`}
          >
            <h4>{branchName}</h4>
            <div className="low-stock-grid-rows">
              {rows.map((row, rowIndex) => (
                <div className={rowClassName} key={rowIndex}>
                  {row.map((product, idx) => (
                    <div className="low-stock-grid-cell" key={idx}>
                      {product.product_name} ({product.quantity} left)
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
