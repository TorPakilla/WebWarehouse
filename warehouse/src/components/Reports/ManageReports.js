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

  // สำหรับ Product report
  const [totalOrderQuantity, setTotalOrderQuantity] = useState(0);
  const [totalShipmentQuantity, setTotalShipmentQuantity] = useState(0);

  // ----- State สำหรับ Filter Dropdown -----
  // filterType: "Product" หรือ "Finance"
  // selectedBranch: "All" หรือเลือกสาขาเฉพาะ
  const [filterType, setFilterType] = useState("Product");
  const [selectedBranch, setSelectedBranch] = useState("All");

  // ===== ดึงข้อมูล Orders / Shipments =====
  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const ordersRes = await axios.get(`${API_BASE_URL}/Orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const shipmentsRes = await axios.get(`${API_BASE_URL}/shipments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(ordersRes.data?.data || []);
        setShipments(shipmentsRes.data?.Shipments || []);
      } catch (error) {
        console.error("Error fetching reports data:", error);
      }
    };
    fetchReportsData();
  }, [token]);

  // ===== กรองข้อมูลตามสาขาที่เลือก =====
  const filteredOrders =
    selectedBranch === "All"
      ? orders
      : orders.filter((order) => order.branch_id === selectedBranch);
  const filteredShipments =
    selectedBranch === "All"
      ? shipments
      : shipments.filter((sh) => sh.to_branch_id === selectedBranch);

  // ===== คำนวณ Product Totals จากข้อมูลที่ถูกกรอง =====
  const totalOrderQuantityFiltered = filteredOrders.reduce((acc, order) => {
    const orderTotal = order.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    return acc + orderTotal;
  }, 0);

  const totalShipmentQuantityFiltered = filteredShipments.reduce((acc, s) => {
    const shipmentTotal = s.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
    return acc + shipmentTotal;
  }, 0);

  useEffect(() => {
    setTotalOrderQuantity(totalOrderQuantityFiltered);
  }, [totalOrderQuantityFiltered]);

  useEffect(() => {
    setTotalShipmentQuantity(totalShipmentQuantityFiltered);
  }, [totalShipmentQuantityFiltered]);

  // คำนวณ POS Branch-wise Shipments Summary ให้รวม Total Quantity ด้วย
const branchShipmentSummaryComputed =
selectedBranch === "All"
  ? (() => {
      // ใช้ reduce ในการสรุปผล
      const summary = shipments.reduce((acc, sh) => {
        const branch = sh.to_branch_id;
        // คำนวณจำนวนสินค้าจากแต่ละ shipment โดยรวม quantity ของ item ทุกตัว
        const itemCount = sh.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        if (acc[branch]) {
          acc[branch].shipmentsCount += 1;
          acc[branch].totalQuantity += itemCount;
        } else {
          acc[branch] = { toBranch: branch, shipmentsCount: 1, totalQuantity: itemCount };
        }
        return acc;
      }, {});
      return Object.values(summary);
    })()
  : [];


  // ===== คำนวณ Finance Summary (ใช้ฟิลด์ order_total, shipment_total) =====
  const ordersFinance = filteredOrders.reduce(
    (acc, order) => acc + (order.order_total || 0),
    0
  );
  const shipmentsFinance = filteredShipments.reduce(
    (acc, sh) => acc + (sh.shipment_total || 0),
    0
  );
  const combinedFinance = ordersFinance + shipmentsFinance;

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
  const branchLabels = branchShipmentSummaryComputed.map((b) => b.toBranch);
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
            : `Finance Summary for Branch ${selectedBranch}`,
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
        const count = sh.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
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
          b.toBranch,
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
    } else {
      // Finance export
      doc.text("Finance Report", 20, 60);
      if (selectedBranch === "All") {
        doc.text(`Orders Finance Amount: ${ordersFinance}`, 20, 80);
        doc.text(`Shipments Finance Amount: ${shipmentsFinance}`, 20, 100);
        doc.text(`Combined Finance Amount: ${combinedFinance}`, 20, 120);
      } else {
        doc.text(`Orders Finance Amount for Branch ${selectedBranch}: ${ordersFinance}`, 20, 80);
        doc.text(`Shipments Finance Amount for Branch ${selectedBranch}: ${shipmentsFinance}`, 20, 100);
        doc.text(`Combined Finance Amount: ${combinedFinance}`, 20, 120);
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
          const count = sh.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
          return [sh.shipment_id, sh.from_branch_id, sh.to_branch_id, sh.status, count];
        }),
      ];
      const shipmentSheet = XLSX.utils.aoa_to_sheet(shipmentSheetData);
      XLSX.utils.book_append_sheet(workbook, shipmentSheet, "Shipments");

      if (selectedBranch === "All") {
        const branchSheetData = [
          ["Branch", "Shipments Count", "Total Quantity"],
          ...branchShipmentSummaryComputed.map((b) => [b.toBranch, b.shipmentsCount, b.totalQuantity]),
        ];
        const branchSheet = XLSX.utils.aoa_to_sheet(branchSheetData);
        XLSX.utils.book_append_sheet(workbook, branchSheet, "BranchWise");
      }
    } else {
      const financeSheetData = [
        ["Metric", "Amount"],
        ["Orders Finance Amount", ordersFinance],
        ["Shipments Finance Amount", shipmentsFinance],
        ["Combined Finance Amount", combinedFinance],
      ];
      const financeSheet = XLSX.utils.aoa_to_sheet(financeSheetData);
      XLSX.utils.book_append_sheet(workbook, financeSheet, "Finance");
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
            </select>
          </label>
          <label>
            Branch:{" "}
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              <option value="All">All</option>
              {Array.from(
                new Set([
                  ...orders.map((o) => o.branch_id),
                  ...shipments.map((s) => s.to_branch_id),
                ])
              ).map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
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
        {filterType === "Product" ? (
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
                          <td>{b.toBranch}</td>
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
        ) : (
          <>
            <div className="left-column">
              <div className="report-card">
                <h3>Finance Summary</h3>
                {selectedBranch === "All" ? (
                  <>
                    <p>Orders Finance Amount: {ordersFinance}</p>
                    <p>Shipments Finance Amount: {shipmentsFinance}</p>
                    <p>Combined Finance Amount: {combinedFinance}</p>
                  </>
                ) : (
                  <>
                    <p>Orders Finance Amount for Branch {selectedBranch}: {ordersFinance}</p>
                    <p>Shipments Finance Amount for Branch {selectedBranch}: {shipmentsFinance}</p>
                    <p>Combined Finance Amount: {combinedFinance}</p>
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
      </div>
    </div>
  );
};

export default Reports;
