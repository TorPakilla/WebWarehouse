import React, { useEffect, useState } from "react";
import axiosInstance from "../../config/axiosInstance";

const ShipmentList = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all shipments when component mounts
  useEffect(() => {
    fetchShipments();
  }, []);

  // Fetch shipments from API
  const fetchShipments = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/Shipments");
      console.log("Fetched shipments:", response.data.Shipments);
      setShipments(response.data.Shipments || []);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      alert("Failed to fetch shipments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Shipments</h1>

      {/* Refresh Button */}
      <button onClick={fetchShipments} style={{ marginBottom: "10px" }}>
        Refresh
      </button>

      {/* Loading Indicator */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table border="1" cellPadding="10" cellSpacing="0">
          <thead>
            <tr>
              <th>ID</th>
              <th>From Branch</th>
              <th>To Branch</th>
              <th>Status</th>
              <th>Shipment Date</th>
            </tr>
          </thead>
          <tbody>
            {shipments.length > 0 ? (
              shipments.map((shipment) => (
                <tr key={shipment.shipment_id}>
                  <td>{shipment.shipment_id}</td>
                  <td>{shipment.from_branch_id}</td>
                  <td>{shipment.to_branch_id}</td>
                  <td>{shipment.status}</td>
                  <td>{new Date(shipment.shipment_date).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">No shipments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ShipmentList;
