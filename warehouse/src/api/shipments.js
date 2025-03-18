import axios from "axios";

const API_URL = "http://localhost:5050";

export const fetchShipments = async () => {
  try {
    const response = await axios.get(`${API_URL}/Shipments`);
    console.log("Raw API Response:", response.data); // Debugging Log

    // ดึงค่า Shipments จาก Object และคืนค่าอาร์เรย์
    return response.data.Shipments || [];
  } catch (error) {
    console.error("Error fetching shipments:", error);
    return [];
  }
};

export const fetchShipmentsWithDetails = async () => {
    try {
        // ✅ ดึงข้อมูล Shipments
        const shipmentsRes = await axios.get(`${API_URL}/Shipments`);
        let shipments = shipmentsRes.data.Shipments || [];

        // ✅ ดึงข้อมูล Branches
        const branchesRes = await axios.get(`${API_URL}/PosBranches`);
        const branches = branchesRes.data.branches || []; // ✅ ใช้ key ที่ถูกต้อง

        console.log("Branches API Response:", branchesRes.data); // 🛠 Debugging
        console.log("Parsed Branches Data:", branches); // 🛠 Debugging

        // ✅ ดึงข้อมูล ShipmentItems
        const itemsRes = await axios.get(`${API_URL}/ShipmentItems`);
        let items = itemsRes.data.data || [];

        console.log("Shipments Data:", shipments);
        console.log("Shipment Items Data:", items);

        // ✅ สร้าง Map ของ `branch_id` -> `b_name`
        const branchMap = {};
        branches.forEach(branch => {
            branchMap[branch.branch_id] = branch.b_name;
        });

        console.log("Branch Map:", branchMap); // ✅ Debugging

        // ✅ สร้าง Map ของ ShipmentID -> Total Quantity
        const shipmentItemsMap = {};
        items.forEach(item => {
            if (!shipmentItemsMap[item.shipment_id]) {
                shipmentItemsMap[item.shipment_id] = 0;
            }
            shipmentItemsMap[item.shipment_id] += item.quantity;
        });

        console.log("Shipment Items Map:", shipmentItemsMap); // ✅ Debugging

        // ✅ อัปเดต Shipments ให้มี `branch_name` และ `total_quantity`
        shipments = shipments.map(shipment => ({
            ...shipment,
            branch_name: branchMap[shipment.to_branch_id] || "Unknown Branch",
            total_quantity: shipmentItemsMap[shipment.shipment_id] || 0
        }));

        console.log("Updated Shipments Data:", shipments); // ✅ Debugging

        return shipments;
    } catch (error) {
        console.error("Error fetching shipments with details:", error);
        return [];
    }
};

await axios.put(`${API_BASE_URL}/Requests/${shipmentId}`, {
    status: "complete",
  });

