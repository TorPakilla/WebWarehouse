import React, { useState, useEffect } from "react";
import axios from "../../api/config";
import { API_BASE_URL } from "../../api/config";

// === Chart.js ===
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";

// === Export PDF & Excel ===
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// === CSS ===
import "./Reports.css";

// ลงทะเบียนส่วนประกอบของ Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const Reports = () => {
  const token = localStorage.getItem("token");

  // ----- State หลัก -----
  const [orders, setOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [inventories, setInventories] = useState([]);

  // สำหรับ Product report
  const [totalOrderQuantity, setTotalOrderQuantity] = useState(0);
  const [totalShipmentQuantity, setTotalShipmentQuantity] = useState(0);

  // ----- State สำหรับ Filter Dropdown -----
  // filterType: "Product", "Finance", "Audit", "Receipt"
  // selectedBranch: "All" หรือเลือกสาขาเฉพาะ (value เป็น branch id)
  const [filterType, setFilterType] = useState("Product");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [receiptType, setReceiptType] = useState("Order Receipt");

  // ===== ดึงข้อมูล Orders, Shipments, Branches, Inventories =====
  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const [ordersRes, shipmentsRes, branchesRes, inventoriesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/Orders`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/shipments`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/Branches`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/Inventory`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setOrders(ordersRes.data?.data || []);
        setShipments(shipmentsRes.data?.Shipments || []);
        setBranches(branchesRes.data?.data || []);
        setInventories(inventoriesRes.data?.data || []);

        console.log("=== Debug: Orders data ===", ordersRes.data?.data);
        console.log("=== Debug: Shipments data ===", shipmentsRes.data?.Shipments);
        console.log("=== Debug: Branches data ===", branchesRes.data?.data);
        console.log("=== Debug: Inventories data ===", inventoriesRes.data?.data);
      } catch (error) {
        console.error("Error fetching reports data:", error);
      }
    };
    fetchReportsData();
  }, [token]);

  // ===== สร้าง mapping branch_id => branch_name =====
  const branchMap = branches.reduce((acc, branch) => {
    acc[branch.branch_id] = branch.b_name;
    return acc;
  }, {});

  // ===== สร้าง mapping product_id => price =====
  const productPriceMap = inventories.reduce((acc, inv) => {
    acc[inv.product_id] = inv.price;
    return acc;
  }, {});

  // ===== กรองข้อมูลตามสาขาที่เลือก =====
  const filteredOrders =
    selectedBranch === "All"
      ? orders
      : orders.filter((order) => order.branch_id === selectedBranch);

  const filteredShipments =
    selectedBranch === "All"
      ? shipments
      : shipments.filter((sh) => sh.to_branch_id === selectedBranch);

  // ===== คำนวณ Product Totals =====
  const totalOrderQuantityFiltered = filteredOrders.reduce((acc, order) => {
    const orderTotal = order.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    return acc + orderTotal;
  }, 0);

  const totalShipmentQuantityFiltered = filteredShipments.reduce((acc, sh) => {
    const shipmentTotal = sh.shipment_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    return acc + shipmentTotal;
  }, 0);

  useEffect(() => {
    setTotalOrderQuantity(totalOrderQuantityFiltered);
  }, [totalOrderQuantityFiltered]);

  useEffect(() => {
    setTotalShipmentQuantity(totalShipmentQuantityFiltered);
  }, [totalShipmentQuantityFiltered]);

  // ===== คำนวณ POS Branch-wise Shipments Summary =====
  const branchShipmentSummaryComputed =
    selectedBranch === "All"
      ? (() => {
          const summary = shipments.reduce((acc, sh) => {
            const branchId = sh.to_branch_id;
            const itemCount = sh.shipment_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
            if (acc[branchId]) {
              acc[branchId].shipmentsCount += 1;
              acc[branchId].totalQuantity += itemCount;
            } else {
              acc[branchId] = {
                branchId,
                branchName: branchMap[branchId] || branchId,
                shipmentsCount: 1,
                totalQuantity: itemCount,
              };
            }
            return acc;
          }, {});
          return Object.values(summary);
        })()
      : [];

  // ===== คำนวณ Finance Summary =====
  const ordersFinance = filteredOrders.reduce(
    (acc, order) => acc + (order.total_amount || 0),
    0
  );

  const shipmentsFinance = filteredShipments.reduce((acc, sh) => {
    const shipmentFinance = sh.shipment_items?.reduce((sum, item) => {
      const productId = item.warehouse_inventory_id;
      const price = productPriceMap[productId] || 0;
      return sum + ((item.quantity || 0) * price);
    }, 0) || 0;
    return acc + shipmentFinance;
  }, 0);

  const combinedFinance = ordersFinance + shipmentsFinance;

  // ===== Audit: ตรวจสอบความไม่สอดคล้อง =====
  const quantityDiscrepancy = totalOrderQuantityFiltered - totalShipmentQuantityFiltered;
  const financeDiscrepancy = ordersFinance - shipmentsFinance;

  const auditOrderIssues = filteredOrders.filter(order => {
    const totalItems = order.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    return !order.order_items || order.order_items.length === 0 || totalItems <= 0;
  });

  const auditShipmentIssues = filteredShipments.filter(sh => {
    const totalItems = sh.shipment_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    return !sh.shipment_items || sh.shipment_items.length === 0 || totalItems <= 0;
  });

  // ===== Data สำหรับกราฟต่าง ๆ =====
  const chartData = {
    labels: ["Orders", "Shipments"],
    datasets: [
      {
        label: "Total Quantity",
        data: [totalOrderQuantityFiltered, totalShipmentQuantityFiltered],
        backgroundColor: ["#4287f5", "#f56545"],
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      title: { display: true, text: "Comparison of Orders vs Shipments" },
    },
  };

  const branchLabels = branchShipmentSummaryComputed.map((b) => b.branchName);
  const branchQuantities = branchShipmentSummaryComputed.map((b) => b.totalQuantity);
  const branchChartData = {
    labels: branchLabels,
    datasets: [
      {
        label: "Items Shipped",
        data: branchQuantities,
        backgroundColor: "#FFA500",
      },
    ],
  };
  const branchChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      title: { display: true, text: "Shipments by POS Branch" },
    },
  };

  const financeChartData = {
    labels: ["Orders", "Shipments"],
    datasets: [
      {
        label: "Finance Amount",
        data: [ordersFinance, shipmentsFinance],
        backgroundColor: ["#4caf50", "#2196f3"],
      },
    ],
  };
  const financeChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      title: {
        display: true,
        text:
          selectedBranch === "All"
            ? "Finance Summary for All Branches"
            : `Finance Summary for Branch ${branchMap[selectedBranch] || selectedBranch}`,
      },
    },
  };

  // ===== Export PDF (โค้ดเดิม) =====
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });
    doc.text("X10 Reports Summary", 20, 30);
    // โค้ด PDF export เดิม
    doc.save("X10_Reports.pdf");
  };

  // ===== Export Excel (โค้ดเดิม) =====
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    // โค้ด Excel export เดิม
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "X10_Reports.xlsx");
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>X10 Reports Summary</h2>
        <div className="filter-dropdowns">
          <label>
            Filter Type:{" "}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setSelectedBranch("All");
              }}
            >
              <option value="Product">Product</option>
              <option value="Finance">Finance</option>
              <option value="Audit">Audit</option>
              <option value="Receipt">Receipt</option>
            </select>
          </label>
          <label>
            Branch:{" "}
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              <option value="All">All</option>
              {branches.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.b_name}
                </option>
              ))}
            </select>
          </label>
          {filterType === "Receipt" && (
            <label>
              Receipt Type:{" "}
              <select value={receiptType} onChange={(e) => setReceiptType(e.target.value)}>
                <option value="Order Receipt">Order Receipt</option>
                <option value="Shipment Receipt">Shipment Receipt</option>
              </select>
            </label>
          )}
        </div>
        <div className="export-buttons">
          <button onClick={handleExportPDF}>Export to PDF</button>
          <button onClick={handleExportExcel}>Export to Excel</button>
        </div>
      </div>

      <div className="reports-content">
        {filterType === "Product" && (
          <>
            <div className="left-column">
              <div className="report-card">
                <h3>Order Report</h3>
                <p>Total Number of Orders: {filteredOrders.length}</p>
                <p>Total Quantity Received in Orders: {totalOrderQuantityFiltered}</p>
              </div>
              <div className="report-card">
                <h3>Shipment Report</h3>
                <p>Total Number of Shipments: {filteredShipments.length}</p>
                <p>Total Quantity Shipped Out: {totalShipmentQuantityFiltered}</p>
              </div>
            </div>
            <div className="center-column">
              <div className="chart-section">
                <Bar data={chartData} options={chartOptions} />
              </div>
              {selectedBranch === "All" && (
                <div className="chart-section">
                  <Bar data={branchChartData} options={branchChartOptions} />
                </div>
              )}
            </div>
            <div className="right-column">
              {selectedBranch === "All" && (
                <div className="branch-summary-section">
                  <h3>POS Branch-wise Shipments</h3>
                  <table className="branch-shipment-table">
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th>Shipments Count</th>
                        <th>Total Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchShipmentSummaryComputed.length > 0 ? (
                        branchShipmentSummaryComputed.map((b, idx) => (
                          <tr key={idx}>
                            <td>{b.branchName}</td>
                            <td>{b.shipmentsCount}</td>
                            <td>{b.totalQuantity}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3">No POS branch shipments found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {filterType === "Finance" && (
          <>
            <div className="left-column">
              <div className="report-card">
                <h3>Finance Summary</h3>
                {selectedBranch === "All" ? (
                  <>
                    <p>Orders Finance Amount: {ordersFinance}</p>
                    <p>Shipments Finance Amount: {shipmentsFinance}</p>
                    <p>Combined Finance Amount: {ordersFinance + shipmentsFinance}</p>
                  </>
                ) : (
                  <>
                    <p>
                      Orders Finance Amount for Branch {branchMap[selectedBranch] || selectedBranch}: {ordersFinance}
                    </p>
                    <p>
                      Shipments Finance Amount for Branch {branchMap[selectedBranch] || selectedBranch}: {shipmentsFinance}
                    </p>
                    <p>Combined Finance Amount: {ordersFinance + shipmentsFinance}</p>
                  </>
                )}
              </div>
            </div>
            <div className="center-column">
              <div className="chart-section">
                <Bar data={financeChartData} options={financeChartOptions} />
              </div>
            </div>
          </>
        )}

        {filterType === "Audit" && (
          <>
            <div className="left-column">
              <div className="report-card">
                <h3>Audit Summary</h3>
                <p>Quantity Discrepancy (Orders - Shipments): {totalOrderQuantity - totalShipmentQuantity}</p>
                <p>Finance Discrepancy (Orders - Shipments): {ordersFinance - shipmentsFinance}</p>
              </div>
            </div>
            <div className="center-column">
              <div className="audit-details">
                <h3>Orders with Issues</h3>
                {auditOrderIssues.length > 0 ? (
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Order Number</th>
                        <th>Status</th>
                        <th>Item Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditOrderIssues.map((ord, idx) => {
                        const count = ord.order_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
                        return (
                          <tr key={idx}>
                            <td>{ord.order_number}</td>
                            <td>{ord.status}</td>
                            <td>{count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p>No issues found in orders.</p>
                )}
              </div>
            </div>
            <div className="right-column">
              <div className="audit-details">
                <h3>Shipments with Issues</h3>
                {auditShipmentIssues.length > 0 ? (
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Shipment ID</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Status</th>
                        <th>Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditShipmentIssues.map((sh, idx) => {
                        const count = sh.shipment_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
                        return (
                          <tr key={idx}>
                            <td>{sh.shipment_id}</td>
                            <td>{sh.from_branch_id}</td>
                            <td>{sh.to_branch_id}</td>
                            <td>{sh.status}</td>
                            <td>{count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p>No issues found in shipments.</p>
                )}
              </div>
            </div>
          </>
        )}

        {filterType === "Receipt" && (
          <>
            <div className="left-column">
              <div className="report-card">
                {receiptType === "Order Receipt" ? (
                  <>
                    <p>Total Order Receipts: {filteredOrders.length}</p>
                    <p>Total Order Receipt Amount: {ordersFinance}</p>
                  </>
                ) : (
                  <>
                    <p>Total Shipment Receipts: {filteredShipments.length}</p>
                    <p>Total Shipment Receipt Amount: {shipmentsFinance}</p>
                  </>
                )}
              </div>
            </div>
            <div className="center-column">
              <div className="receipt-details">
                {receiptType === "Order Receipt" ? (
                  <table className="receipt-table">
                    <thead>
                      <tr>
                        <th>Order Number</th>
                        <th>Status</th>
                        <th>Total Items</th>
                        <th>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((ord, idx) => {
                        const count = ord.order_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
                        return (
                          <tr key={idx}>
                            <td>{ord.order_number}</td>
                            <td>{ord.status}</td>
                            <td>{count}</td>
                            <td>{ord.total_amount || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="receipt-table">
                    <thead>
                      <tr>
                        <th>Shipment ID</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Status</th>
                        <th>Total Items</th>
                        <th>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShipments.map((sh, idx) => {
                        const count = sh.shipment_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
                        const amount =
                          sh.shipment_items?.reduce(
                            (sum, i) =>
                              sum + ((i.quantity || 0) * (productPriceMap[i.warehouse_inventory_id] || 0)),
                            0
                          ) || 0;
                        return (
                          <tr key={idx}>
                            <td>{sh.shipment_id}</td>
                            <td>{sh.from_branch_id}</td>
                            <td>{sh.to_branch_id}</td>
                            <td>{sh.status}</td>
                            <td>{count}</td>
                            <td>{amount}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
