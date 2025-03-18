// MapComponent.jsx
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { FaWarehouse, FaStore } from "react-icons/fa";
import axios from "../api/config";
import { API_BASE_URL } from "../api/config";
import "../styles/Map.css";
import OrderForm from "../components/Orders/OrderForm.js";
import { Tooltip } from "react-tooltip";
import ShipmentPanel from "../components/Shipments/InlinePopupShipments";

// Mapbox Access Token
mapboxgl.accessToken =
  "pk.eyJ1IjoiNjQwMTEyMTEwMzMiLCJhIjoiY203azdqM2JjMGZlazJpcHp6eHphdDFwbiJ9.pOBvyrQx5heYS0OekyAuBA";

/** (1) ดึงข้อมูลสาขา */
const fetchBranchInfo = async (branchId, branchType) => {
  try {
    const url =
      branchType === "pos"
        ? `${API_BASE_URL}/POSBranches/${branchId}`
        : `${API_BASE_URL}/Branches/${branchId}`;
    const response = await axios.get(url);
    return response.data.branch;
  } catch (error) {
    console.error("❌ Error fetching branch info:", error);
    return null;
  }
};

/** (2) เรียก Directions API */
async function fetchRouteGeometry(fromCoord, toCoord) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromCoord[0]},${fromCoord[1]};${toCoord[0]},${toCoord[1]}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) {
      console.warn("No routes found from Directions API");
      return null;
    }
    const routeCoords = data.routes[0].geometry.coordinates;
    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: routeCoords,
      },
      properties: {},
    };
  } catch (err) {
    console.error("Error fetching route geometry:", err);
    return null;
  }
}

/** (3) วาดเส้น route ลงใน Mapbox */
function drawRouteOnMap(map, routeId, routeData) {
  if (!map) return;
  if (map.getLayer(routeId)) map.removeLayer(routeId);
  if (map.getSource(routeId)) map.removeSource(routeId);
  map.addSource(routeId, {
    type: "geojson",
    data: routeData,
  });
  map.addLayer({
    id: routeId,
    type: "line",
    source: routeId,
    layout: {},
    paint: {
      "line-color": "#ff0000",
      "line-width": 3,
    },
  });
}

/** (4) ลบเส้น route ทั้งหมด */
function removeRoutesForShipments(map, shipments) {
  shipments.forEach((sh, idx) => {
    const routeId = `route-${sh.shipment_id || idx}`;
    if (map.getLayer(routeId)) map.removeLayer(routeId);
    if (map.getSource(routeId)) map.removeSource(routeId);
  });
}

/** (5) Component หลัก: MapComponent */
const MapComponent = ({ location, allShipments = [], onMapClick, isSelectingLocation = false }) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);
  const popupCoordinatesRef = useRef(null);
  const selectionMarkerRef = useRef(null); // สำหรับ marker ที่เลือกพิกัด
  const [tempCoordinate, setTempCoordinate] = useState(null);
  const [posShipments, setPosShipments] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [allShipmentItems, setAllShipmentItems] = useState([]);

  // (A) ศูนย์กลางเริ่มต้น
  const defaultCenter = location
    ? location.split(",").map((coord) => parseFloat(coord.trim()))
    : [100.5018, 13.7563]; // Bangkok

  // (B) สร้าง Map และตั้งค่า canvas tabindex เป็น -1
  useEffect(() => {
    if (!mapContainer.current) return;
    if (!mapInstance.current) {
      mapInstance.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/navigation-night-v1",
        center: defaultCenter,
        zoom: 6,
      });
      mapInstance.current.on("load", () => {
        const canvasEl = mapInstance.current.getCanvas();
        if (canvasEl) {
          canvasEl.setAttribute("tabindex", "-1");
          canvasEl.blur();
        }
        console.log("Map loaded, canvas tabindex set to -1");
      });
    }
  }, [defaultCenter]);

  // (C) อัปเดต Center เมื่อ location เปลี่ยน
  useEffect(() => {
    if (mapInstance.current && location) {
      const newCenter = location.split(",").map((coord) => parseFloat(coord.trim()));
      if (newCenter.length === 2 && !isNaN(newCenter[0]) && !isNaN(newCenter[1])) {
        mapInstance.current.setCenter(newCenter);
      }
    }
  }, [location]);

  // (D) ดึงข้อมูล Branches
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [warehouseRes, posRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/WarehouseBranches`),
          axios.get(`${API_BASE_URL}/POSBranches`),
        ]);
        const wBranches = warehouseRes.data.branches || [];
        const pBranches = posRes.data.branches || [];
        const combinedBranches = [
          ...wBranches.map((b) => ({
            ...b,
            type: "warehouse",
            imageUrl: "/icons/default-warehouse.jpg",
          })),
          ...pBranches.map((b) => ({
            ...b,
            type: "pos",
            imageUrl: b.image_url || "/icons/default-pos.jpg",
          })),
        ];
        const posBranches = combinedBranches.filter((b) => b.type === "pos");
        const posBranchesWithInfo = await Promise.all(
          posBranches.map(async (b) => {
            const info = await fetchBranchInfo(b.branch_id, b.type);
            return { ...b, branchInfo: info };
          })
        );
        const updatedBranches = combinedBranches.map((b) => {
          if (b.type === "pos") {
            const found = posBranchesWithInfo.find((x) => x.branch_id === b.branch_id);
            return found || b;
          }
          return b;
        });
        setAllBranches(updatedBranches);
      } catch (error) {
        console.error("❌ Error fetching branches:", error);
      }
    };
    fetchData();
  }, []);

  // (D2) ดึง ShipmentItems (POS)
  useEffect(() => {
    const fetchShipmentItems = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/POSShipmentItems`);
        setAllShipmentItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching shipment items:", err);
        setAllShipmentItems([]);
      }
    };
    fetchShipmentItems();
  }, []);

  // (D3) ดึง Shipments ของ POS
  useEffect(() => {
    const fetchPosShipments = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/POSShipments`);
        setPosShipments(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching pos shipments:", err);
        setPosShipments([]);
      }
    };
    fetchPosShipments();
  }, []);

  // (E) สร้าง Marker สำหรับ Branches
  useEffect(() => {
    if (!mapInstance.current || allBranches.length === 0) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    allBranches.forEach((branch, index) => {
      let rawLocation = branch.type === "warehouse" ? branch.location : branch.google_location;
      if (!rawLocation) return;
      const coords = rawLocation.split(",").map((coord) => parseFloat(coord.trim()));
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return;
      let lng, lat;
      if (branch.type === "warehouse") {
        [lng, lat] = coords;
      } else {
        [lat, lng] = coords;
      }
      const markerContainer = document.createElement("div");
      markerContainer.className = branch.type === "warehouse" ? "warehouse-marker" : "pos-marker";
      markerContainer.addEventListener("click", async () => {
        // เมื่อ Marker ถูกคลิก ให้ปิด popup เก่าก่อน
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
        const branchInfo = await fetchBranchInfo(branch.branch_id, branch.type);
        const popupNode = document.createElement("div");
        ReactDOM.render(
          <BranchPopup
            branch={branch}
            branchIndex={index}
            branchInfo={branchInfo}
            allShipments={allShipments}
            posShipments={posShipments}
            allBranches={allBranches}
            mapInstance={mapInstance.current}
            allShipmentItems={allShipmentItems}
          />,
          popupNode
        );
        const newPopup = new mapboxgl.Popup({
          offset: 25,
          anchor: "left",
          closeOnMove: false,
        })
          .setLngLat([lng, lat])
          .setDOMContent(popupNode)
          .addTo(mapInstance.current);
        popupRef.current = newPopup;
        popupCoordinatesRef.current = [lng, lat];
      });
      const marker = new mapboxgl.Marker(markerContainer)
        .setLngLat([lng, lat])
        .addTo(mapInstance.current);
      markersRef.current.push(marker);
      ReactDOM.render(
        branch.type === "warehouse" ? (
          <FaWarehouse className="warehouse-icon" />
        ) : (
          <FaStore className="store-icon" />
        ),
        markerContainer
      );
    });
  }, [allBranches, allShipments, posShipments, allShipmentItems]);

  // (F) ย้าย Popup เมื่อ Marker หลุดจากขอบจอ
  useEffect(() => {
    if (!mapInstance.current) return;
    const handleMoveEnd = () => {
      if (!popupRef.current || !popupCoordinatesRef.current) return;
      const [lng, lat] = popupCoordinatesRef.current;
      const screenPos = mapInstance.current.project([lng, lat]);
      const container = mapContainer.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const outOfBounds =
        screenPos.x < 0 ||
        screenPos.x > rect.width ||
        screenPos.y < 0 ||
        screenPos.y > rect.height;
      if (outOfBounds) {
        popupRef.current.options.anchor = "left";
        if (typeof popupRef.current._update === "function") popupRef.current._update();
        const newLngLat = mapInstance.current.unproject([10, screenPos.y]);
        popupRef.current.setLngLat(newLngLat);
      } else {
        popupRef.current.options.anchor = "left";
        if (typeof popupRef.current._update === "function") popupRef.current._update();
        popupRef.current.setLngLat([lng, lat]);
      }
    };
    mapInstance.current.on("moveend", handleMoveEnd);
    return () => {
      mapInstance.current.off("moveend", handleMoveEnd);
    };
  }, []);

  // (H) เมื่อ isSelectingLocation เป็น true ให้สร้าง draggable marker (Selection Marker)
  // ปรับปรุง: ไม่เพิ่มปุ่ม Confirm ลงใน markerEl
  useEffect(() => {
    if (!mapInstance.current) return;
    if (isSelectingLocation) {
      if (!selectionMarkerRef.current) {
        const markerEl = document.createElement("div");
        markerEl.className = "selection-marker";
        markerEl.style.width = "40px";
        markerEl.style.height = "40px";
        markerEl.style.backgroundColor = "#00ff00";
        markerEl.style.borderRadius = "50%";
        markerEl.style.border = "2px solid #fff";
        markerEl.style.boxShadow = "0 0 4px #000";
        markerEl.style.cursor = "move";
        markerEl.innerText = "📍";
        markerEl.style.fontSize = "24px";
        markerEl.style.textAlign = "center";
        markerEl.style.lineHeight = "40px";
  
        const marker = new mapboxgl.Marker({
          element: markerEl,
          draggable: true,
        })
          .setLngLat(mapInstance.current.getCenter())
          .addTo(mapInstance.current);
  
        marker.on("dragend", () => {
          const lngLat = marker.getLngLat();
          setTempCoordinate({ lat: lngLat.lat, lng: lngLat.lng });
        });
  
        setTempCoordinate({
          lat: mapInstance.current.getCenter().lat,
          lng: mapInstance.current.getCenter().lng,
        });
  
        selectionMarkerRef.current = marker;
      }
      mapInstance.current.getCanvas().style.cursor = "crosshair";
    } else {
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.remove();
        selectionMarkerRef.current = null;
      }
      mapInstance.current.getCanvas().style.cursor = "";
    }
  }, [isSelectingLocation]);

  // ฟังก์ชัน Confirm Location: เมื่อกดปุ่ม Confirm จะส่งค่า tempCoordinate กลับไปให้ onMapClick
  const handleConfirmLocation = () => {
    if (tempCoordinate && typeof onMapClick === "function") {
      onMapClick(tempCoordinate);
    }
  };

  // ตรวจสอบ focus ของ canvas เมื่อ isSelectingLocation เปลี่ยน
  useEffect(() => {
    if (mapInstance.current) {
      const canvasEl = mapInstance.current.getCanvas();
      if (canvasEl && canvasEl === document.activeElement) {
        canvasEl.blur();
      }
    }
  }, [isSelectingLocation]);

  return (
    <div className="combined-map-container" style={{ position: "relative" }}>
      <div ref={mapContainer} className="map-container" />
      {isSelectingLocation && (
  <button
    style={{
      position: "absolute",
      top: "10px",           // ปรับระยะห่างจากด้านบนตามที่ต้องการ
      left: "50%",           // อยู่ตรงกลางด้านซ้ายของ container
      transform: "translateX(-50%)", // เลื่อนกลับมากลางจริง ๆ
      zIndex: 1000,
      padding: "8px 12px",
      backgroundColor: "#fff",
      border: "1px solid #ccc",
      borderRadius: "4px",
      cursor: "pointer"
    }}
    onClick={handleConfirmLocation}
  >
    Confirm Location
  </button>
)}

      {/* ส่วน PosLowStockGrid ยังคงแสดงอยู่ */}
      <PosLowStockGrid branches={allBranches} />
    </div>
  );
};

export default MapComponent;

/* -------------------------------------------
   Sub-Component: BranchPopup
------------------------------------------- */
function parseBranchCoord(branch) {
  if (!branch) return null;
  const raw = branch.type === "warehouse" ? branch.location : branch.google_location;
  if (!raw) return null;
  const parts = raw.split(",").map((x) => parseFloat(x.trim()));
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return branch.type === "warehouse" ? [parts[0], parts[1]] : [parts[1], parts[0]];
}

const BranchPopup = ({
  branch,
  branchIndex,
  branchInfo,
  allShipments = [],
  posShipments = [],
  allBranches,
  mapInstance,
  allShipmentItems,
}) => {
  const [previewImage, setPreviewImage] = useState(branch.imageUrl);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [showShipmentPanel, setShowShipmentPanel] = useState(false);
  const [pinnedTooltipId, setPinnedTooltipId] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/POSBranches/${branch.branch_id}/upload-image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (response.data.image_url) {
        setPreviewImage(response.data.image_url + "?t=" + Date.now());
      }
    } catch (error) {
      console.error("❌ Error uploading image:", error);
    }
  };

  useEffect(() => {
    if (branch.type === "pos" && branch.imageUrl) {
      setPreviewImage(branch.imageUrl);
    } else if (branchInfo && branchInfo.image_url) {
      setPreviewImage(branchInfo.image_url);
    } else {
      setPreviewImage(
        branch.type === "warehouse"
          ? "/icons/default-warehouse.jpg"
          : "/icons/default-pos.jpg"
      );
    }
  }, [branchInfo, branch.type, branch.imageUrl]);

  const pendingShipments = (allShipments || []).filter(
    (s) => s.status === "Pending" && s.from_branch_id === branch.branch_id
  );
  const pendingPosShipments = posShipments.filter(
    (ps) => ps.Status === "pending" && ps.BranchID === branch.branch_id
  );

  const handleCompletePosShipmentChange = async (shipmentId, checked) => {
    if (!checked) return;
    try {
      await axios.put(`${API_BASE_URL}/POSShipments/${shipmentId}`, {
        status: "complete",
      });
      alert(`POSShipment (id: ${shipmentId}) updated to complete`);
    } catch (err) {
      console.error(err);
      alert("Error updating shipment");
    }
  };

  function getShipmentItems(shipmentId) {
    if (!Array.isArray(allShipmentItems)) return [];
    return allShipmentItems.filter((item) => item.ShipmentID === shipmentId);
  }

  const renderCategoryOrStock = () => {
    if (branch.type === "pos") {
      return (
        <div className="popup-row">
          <span className="popup-label">Low Stock Alert</span>
          <span className="popup-value">{branchInfo?.stock_count ?? 0}</span>
        </div>
      );
    } else {
      return (
        <div className="popup-row">
          <span className="popup-label">Category</span>
          <span className="popup-value">{branchInfo?.categories || "N/A"}</span>
        </div>
      );
    }
  };

  const renderTopicOrShop = () => {
    if (branch.type === "pos") {
      return (
        <div className="popup-row">
          <span className="popup-label">Shop</span>
          <span className="popup-value">
            {branchIndex === 0 ? "Main Branch" : "Sub Branch"}
          </span>
        </div>
      );
    } else {
      return (
        <div className="popup-row">
          <span className="popup-label">Topic</span>
          <span className="popup-value">
            {branchIndex === 0 ? "Main Branch" : "Sub Branch"}
          </span>
        </div>
      );
    }
  };

  const handleOrdersClick = () => setShowOrderPanel(true);
  const handleCloseOrderPanel = () => setShowOrderPanel(false);
  const handleShipmentClick = () => setShowShipmentPanel(true);
  const handleCloseShipmentPanel = () => setShowShipmentPanel(false);

  const handleTooltipEnter = (shipmentId) => setPinnedTooltipId(shipmentId);
  const handleTooltipLeave = () => setPinnedTooltipId(null);

  return (
    <div className="branch-popup-container" style={{ position: "relative" }}>
      <div className="popup-image-wrapper">
        <img src={previewImage} alt="Branch" className="popup-branch-image" />
        <input
          type="file"
          accept="image/*"
          id={`upload-${branch.branch_id}`}
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />
        <label className="upload-button" htmlFor={`upload-${branch.branch_id}`}>
          Change Image
        </label>
      </div>
      <div className="popup-branch-title">{branch.b_name}</div>
      <div className="popup-info-box">
        {renderTopicOrShop()}
        {renderCategoryOrStock()}
      </div>
      {branch.type === "pos" ? (
        <div className="popup-shipment-box">
          <div className="popup-label-shipment">POS Shipments (Pending)</div>
          {pendingPosShipments.length === 0 ? (
            <div className="no-pending">No pending shipments.</div>
          ) : (
            pendingPosShipments.map((sh) => {
              const items = getShipmentItems(sh.ShipmentID);
              return (
                <div key={sh.ShipmentID} className="pending-item">
                  <span
                    style={{ flex: 1, cursor: "pointer", position: "relative" }}
                    onMouseEnter={() => handleTooltipEnter(sh.ShipmentID)}
                    onMouseLeave={handleTooltipLeave}
                  >
                    Details
                    {pinnedTooltipId === sh.ShipmentID &&
                      ReactDOM.createPortal(
                        <div className="tooltip">
                          {items.length === 0
                            ? "No items."
                            : items.map((itm) => (
                                <div key={itm.ShipmentItemID}>
                                  Product: {itm.ProductID}, Qty: {itm.Quantity}
                                </div>
                              ))}
                        </div>,
                        document.body
                      )}
                  </span>
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      handleCompletePosShipmentChange(sh.ShipmentID, e.target.checked)
                    }
                    style={{ marginLeft: 5 }}
                  />
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="popup-shipment-box">
          <div className="popup-label-shipment">Pending Shipments (Warehouse)</div>
          {pendingShipments.length === 0 ? (
            <div className="no-pending">No pending shipments.</div>
          ) : (
            pendingShipments.map((sh) => (
              <div
                key={sh.shipment_id}
                className="pending-item"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  // handlePendingShipmentClick(sh);
                }}
              >
                <span>
                  {allBranches.find((b) => b.branch_id === sh.to_branch_id)?.b_name}
                </span>
              </div>
            ))
          )}
        </div>
      )}
      <div className="popup-button-group">
        {branch.type === "warehouse" && (
          <button className="popup-button" onClick={handleOrdersClick}>
            Orders
          </button>
        )}
        {branch.type === "pos" && (
          <button className="popup-button" onClick={handleShipmentClick}>
            Shipment
          </button>
        )}
      </div>
      {showOrderPanel && (
        <div className="order-panel open">
          <button className="close-panel-button" onClick={handleCloseOrderPanel}>
            Close
          </button>
          <OrderForm hideCategories={true} />
        </div>
      )}
      {branch.type === "pos" && showShipmentPanel && (
        <div className="shipment-panel open">
          <button className="close-panel-button" onClick={handleCloseShipmentPanel}>
            Close
          </button>
          <ShipmentPanel onClose={handleCloseShipmentPanel} branchId={branch.branch_id} />
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------
   Component: PosLowStockGrid
------------------------------------------- */
const PosLowStockGrid = ({ branches }) => {
  const posLowStockBranches = branches.filter(
    (b) => b.type === "pos" && b.branchInfo?.categories === "POS Low Stock"
  );
  if (posLowStockBranches.length === 0) return null;
  return (
    <div className="pos-lowstock-grid-container">
      <h3>All POS Branches (Low Stock)</h3>
      <div className="pos-lowstock-grid">
        <div className="grid-row grid-header">
          {posLowStockBranches.map((b) => (
            <div key={b.branch_id} className="grid-cell">
              {b.b_name}
            </div>
          ))}
        </div>
        <div className="grid-row">
          {posLowStockBranches.map((b) => (
            <div key={b.branch_id} className="grid-cell">
              {b.branchInfo?.stock_info || "Low Stock"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { MapComponent, BranchPopup, PosLowStockGrid };
