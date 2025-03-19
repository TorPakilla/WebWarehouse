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
  const [inventories, setInventories] = useState([]); // เก็บข้อมูล Inventory

  // สำหรับ Product report
  const [totalOrderQuantity, setTotalOrderQuantity] = useState(0);
  const [totalShipmentQuantity, setTotalShipmentQuantity] = useState(0);

  // ----- State สำหรับ Filter Dropdown -----
  // filterType: "Product", "Finance" หรือ "Audit"
  // selectedBranch: "All" หรือเลือกสาขาเฉพาะ (value เป็น branch id)
  const [filterType, setFilterType] = useState("Product");
  const [selectedBranch, setSelectedBranch] = useState("All");

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

        // ตั้งค่าลง State ตามฟิลด์ที่ response ส่งมา
        // สมมติว่า /Inventory ส่งข้อมูลในฟิลด์ "data"
        setOrders(ordersRes.data?.data || []);
        setShipments(shipmentsRes.data?.Shipments || []);
        setBranches(branchesRes.data?.data || []);
        setInventories(inventoriesRes.data?.data || []);

        // Debug เฉพาะครั้งเดียวหลังดึงข้อมูลเสร็จ
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
    // ต้องแน่ใจว่าใน "inventories" มี product_id และ price
    // ถ้า API ใช้ฟิลด์อื่นเช่น "unit_price" ต้องเปลี่ยนเป็น inv.unit_price
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
    const shipmentTotal = sh.shipment_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
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
            // รวม quantity ของ shipment_items
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
  // 1) Orders Finance
  const ordersFinance = filteredOrders.reduce(
    (acc, order) => acc + (order.total_amount || 0),
    0
  );

  // 2) Shipments Finance
  const shipmentsFinance = filteredShipments.reduce((acc, sh) => {
    const shipmentFinance = sh.shipment_items?.reduce((sum, item) => {
      const productId = item.warehouse_inventory_id; // สมมติว่าใช้ warehouse_inventory_id
      const price = productPriceMap[productId] || 0; // ถ้า productId ไม่ match หรือ price เป็น 0 จะได้ 0
      return sum + ((item.quantity || 0) * price);
    }, 0) || 0;
    return acc + shipmentFinance;
  }, 0);

  const combinedFinance = ordersFinance + shipmentsFinance;

  // ===== Audit: ตรวจสอบความไม่สอดคล้อง =====
  const quantityDiscrepancy = totalOrderQuantityFiltered - totalShipmentQuantityFiltered;
  const financeDiscrepancy = ordersFinance - shipmentsFinance;

  // ตรวจจับปัญหาใน orders
  const auditOrderIssues = filteredOrders.filter(order => {
    const totalItems = order.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    return !order.order_items || order.order_items.length === 0 || totalItems <= 0;
  });

  // ตรวจจับปัญหาใน shipments
  const auditShipmentIssues = filteredShipments.filter(sh => {
    const totalItems = sh.shipment_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    return !sh.shipment_items || sh.shipment_items.length === 0 || totalItems <= 0;
  });

  // ===== Data สำหรับกราฟ Product (Orders vs Shipments) =====
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

  // ===== Data สำหรับกราฟ Branch-wise (Product) =====
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

  // ===== Data สำหรับกราฟ Finance (Orders vs Shipments) =====
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

  // ===== Export PDF =====
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });
    doc.text("X10 Reports Summary", 20, 30);

    if (filterType === "Product") {
      doc.text("Product Report", 20, 60);
      const orderTableColumns = ["Order Number", "Status", "Item Count"];
      const orderTableRows = filteredOrders.map((ord) => {
        const count = ord.order_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
        return [ord.order_number, ord.status, count];
      });
      doc.autoTable({
        head: [orderTableColumns],
        body: orderTableRows,
        startY: 70,
        margin: { left: 20 },
        theme: "striped",
      });
      let finalY = doc.lastAutoTable.finalY + 30;

      doc.text("Shipment Report", 20, finalY);
      const shipmentTableColumns = ["Shipment ID", "From", "To", "Status", "Items"];
      const shipmentTableRows = filteredShipments.map((sh) => {
        const count = sh.shipment_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
        return [sh.shipment_id, sh.from_branch_id, sh.to_branch_id, sh.status, count];
      });
      doc.autoTable({
        head: [shipmentTableColumns],
        body: shipmentTableRows,
        startY: finalY + 10,
        margin: { left: 20 },
        theme: "striped",
      });

      if (selectedBranch === "All") {
        let finalY2 = doc.lastAutoTable.finalY + 30;
        doc.text("POS Branch-wise Shipments", 20, finalY2);
        const branchColumns = ["Branch", "Shipments Count", "Total Quantity"];
        const branchRows = branchShipmentSummaryComputed.map((b) => [
          b.branchName,
          b.shipmentsCount,
          b.totalQuantity,
        ]);
        doc.autoTable({
          head: [branchColumns],
          body: branchRows,
          startY: finalY2 + 10,
          margin: { left: 20 },
          theme: "striped",
        });
      }

    } else if (filterType === "Finance") {
      doc.text("Finance Report", 20, 60);
      if (selectedBranch === "All") {
        doc.text(`Orders Finance Amount: ${ordersFinance}`, 20, 80);
        doc.text(`Shipments Finance Amount: ${shipmentsFinance}`, 20, 100);
        doc.text(`Combined Finance Amount: ${ordersFinance + shipmentsFinance}`, 20, 120);
      } else {
        doc.text(
          `Orders Finance Amount for Branch ${branchMap[selectedBranch] || selectedBranch}: ${ordersFinance}`,
          20,
          80
        );
        doc.text(
          `Shipments Finance Amount for Branch ${branchMap[selectedBranch] || selectedBranch}: ${shipmentsFinance}`,
          20,
          100
        );
        doc.text(`Combined Finance Amount: ${ordersFinance + shipmentsFinance}`, 20, 120);
      }

    } else if (filterType === "Audit") {
      doc.text("Audit Report", 20, 60);
      doc.text(
        `Quantity Discrepancy (Orders - Shipments): ${totalOrderQuantity - totalShipmentQuantity}`,
        20,
        80
      );
      doc.text(
        `Finance Discrepancy (Orders - Shipments): ${ordersFinance - shipmentsFinance}`,
        20,
        100
      );

      let finalY = 120;
      doc.text("Orders with Issues", 20, finalY);
      const orderIssueColumns = ["Order Number", "Status", "Item Count"];
      const orderIssueRows = auditOrderIssues.map((ord) => {
        const count = ord.order_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
        return [ord.order_number, ord.status, count];
      });
      if (orderIssueRows.length > 0) {
        doc.autoTable({
          head: [orderIssueColumns],
          body: orderIssueRows,
          startY: finalY + 10,
          margin: { left: 20 },
          theme: "striped",
        });
        finalY = doc.lastAutoTable.finalY + 30;
      } else {
        doc.text("No issues found in orders.", 20, finalY + 20);
        finalY += 40;
      }

      doc.text("Shipments with Issues", 20, finalY);
      const shipmentIssueColumns = ["Shipment ID", "From", "To", "Status", "Items"];
      const shipmentIssueRows = auditShipmentIssues.map((sh) => {
        const count = sh.shipment_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
        return [sh.shipment_id, sh.from_branch_id, sh.to_branch_id, sh.status, count];
      });
      if (shipmentIssueRows.length > 0) {
        doc.autoTable({
          head: [shipmentIssueColumns],
          body: shipmentIssueRows,
          startY: finalY + 10,
          margin: { left: 20 },
          theme: "striped",
        });
      } else {
        doc.text("No issues found in shipments.", 20, finalY + 20);
      }
    }
    doc.save("X10_Reports.pdf");
  };

  // ===== Export Excel =====
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (filterType === "Product") {
      const orderSheetData = [
        ["Order Number", "Status", "Item Count"],
        ...filteredOrders.map((ord) => {
          const count = ord.order_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
          return [ord.order_number, ord.status, count];
        }),
      ];
      const orderSheet = XLSX.utils.aoa_to_sheet(orderSheetData);
      XLSX.utils.book_append_sheet(workbook, orderSheet, "Orders");

      const shipmentSheetData = [
        ["Shipment ID", "From", "To", "Status", "Items"],
        ...filteredShipments.map((sh) => {
          const count = sh.shipment_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
          return [sh.shipment_id, sh.from_branch_id, sh.to_branch_id, sh.status, count];
        }),
      ];
      const shipmentSheet = XLSX.utils.aoa_to_sheet(shipmentSheetData);
      XLSX.utils.book_append_sheet(workbook, shipmentSheet, "Shipments");

      if (selectedBranch === "All") {
        const branchSheetData = [
          ["Branch", "Shipments Count", "Total Quantity"],
          ...branchShipmentSummaryComputed.map((b) => [b.branchName, b.shipmentsCount, b.totalQuantity]),
        ];
        const branchSheet = XLSX.utils.aoa_to_sheet(branchSheetData);
        XLSX.utils.book_append_sheet(workbook, branchSheet, "BranchWise");
      }

    } else if (filterType === "Finance") {
      const financeSheetData = [
        ["Metric", "Amount"],
        ["Orders Finance Amount", ordersFinance],
        ["Shipments Finance Amount", shipmentsFinance],
        ["Combined Finance Amount", ordersFinance + shipmentsFinance],
      ];
      const financeSheet = XLSX.utils.aoa_to_sheet(financeSheetData);
      XLSX.utils.book_append_sheet(workbook, financeSheet, "Finance");

    } else if (filterType === "Audit") {
      const auditSheetData = [
        ["Audit Metric", "Value"],
        ["Quantity Discrepancy (Orders - Shipments)", totalOrderQuantity - totalShipmentQuantity],
        ["Finance Discrepancy (Orders - Shipments)", ordersFinance - shipmentsFinance],
      ];
      const auditSheet = XLSX.utils.aoa_to_sheet(auditSheetData);
      XLSX.utils.book_append_sheet(workbook, auditSheet, "Audit Summary");

      const orderIssueData = [
        ["Order Number", "Status", "Item Count"],
        ...auditOrderIssues.map((ord) => {
          const count = ord.order_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
          return [ord.order_number, ord.status, count];
        }),
      ];
      const orderIssueSheet = XLSX.utils.aoa_to_sheet(orderIssueData);
      XLSX.utils.book_append_sheet(workbook, orderIssueSheet, "Order Issues");

      const shipmentIssueData = [
        ["Shipment ID", "From", "To", "Status", "Items"],
        ...auditShipmentIssues.map((sh) => {
          const count = sh.shipment_items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
          return [sh.shipment_id, sh.from_branch_id, sh.to_branch_id, sh.status, count];
        }),
      ];
      const shipmentIssueSheet = XLSX.utils.aoa_to_sheet(shipmentIssueData);
      XLSX.utils.book_append_sheet(workbook, shipmentIssueSheet, "Shipment Issues");
    }

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
        </div>
        <div className="export-buttons">
          <button onClick={handleExportPDF}>Export to PDF</button>
          <button onClick={handleExportExcel}>Export to Excel</button>
        </div>
      </div>

      <div className="reports-content">
        {filterType === "Product" && (
          <>
            {/* รายงาน Product */}
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
            {/* รายงาน Finance */}
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
                      Orders Finance Amount for Branch {branchMap[selectedBranch] || selectedBranch}:{" "}
                      {ordersFinance}
                    </p>
                    <p>
                      Shipments Finance Amount for Branch {branchMap[selectedBranch] || selectedBranch}:{" "}
                      {shipmentsFinance}
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
            {/* รายงาน Audit */}
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
      </div>
    </div>
  );
};

export default Reports;
