import { useState, useEffect } from "react";
import axios from "../api/config";
import { API_BASE_URL } from "../api/config";
import { FaClipboardList } from "react-icons/fa";

// 🎨 **Category Icons (Now with Proper Paths)**
export const categoryIcons = {
  "food and beverages": "/icons/food and beverages.png",
  "fruits and vegetables": "/icons/fruits and vegetables.png",
  "electronics": "/icons/electronics.png",
  "consumer goods": "/icons/consumer goods.png",
  "personal care": "/icons/personal care.png",
  "specialty products": "/icons/specialty products.png",
  "fashion": "/icons/fashion.png",
  "pharmaceutical and health products": "/icons/pharmaceutical and health products.png",
  "toys and kids' products": "/icons/toys and kids products.png",
  "stationery and office supplies": "/icons/stationery and office supplies.png",
  "books and magazines": "/icons/books and magazines.png",
  "seasonal products": "/icons/seasonal products.png",
  "fresh produce": "/icons/fresh produce.png",
};

// 🔄 **Default Fallbacks**
const defaultIcon = FaClipboardList;
const defaultImage = "/icons/default.png";
// 🤖 **Function to Get Category Icon**
export const getCategoryIcon = (category) => {
  if (!category || typeof category !== "string") {
    console.warn("⚠️ Category is missing for icon lookup!");
    return { type: "image", value: defaultImage }; // Default image fallback
  }

  const lowerCategory = category.trim().toLowerCase();

  if (categoryIcons[lowerCategory]) {
    return { type: "image", value: categoryIcons[lowerCategory] }; // Return Image
  }

  console.warn(`⚠️ No matching icon found for category: "${category}"`);
  return { type: "icon", value: defaultIcon }; // Return React Icon
};

// 📦 **Custom Hook to Fetch Categories from API**
export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [posCategories, setPosCategories] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const fetchCategories = async () => {
      try {
        // 📌 Fetch Inventory Categories
        const categoryResponse = await axios.get(`${API_BASE_URL}/inventory-by-category`);
        let inventoryCategories = [];

        if (categoryResponse.data.categories && Array.isArray(categoryResponse.data.categories)) {
          inventoryCategories = categoryResponse.data.categories
            .filter(cat => cat.category)
            .map(cat => cat.category.toLowerCase());
        }
        setCategories(inventoryCategories);

        // 📌 Fetch Low Stock POS Items
        const lowStockResponse = await axios.get(`${API_BASE_URL}/GetPosLowStock`);
        let lowStockCategories = new Set();

        if (lowStockResponse.data.low_stock_items && Array.isArray(lowStockResponse.data.low_stock_items)) {
          lowStockCategories = new Set(
            lowStockResponse.data.low_stock_items
              .filter(item => item.category)
              .map(item => item.category.toLowerCase())
          );
        }

        // ✅ Only update state if data actually changed
        setPosCategories(prevPosCategories => 
          JSON.stringify([...prevPosCategories]) !== JSON.stringify([...lowStockCategories]) 
            ? lowStockCategories 
            : prevPosCategories
        );

      } catch (error) {
        console.error("❌ Error fetching categories:", error);
        setCategories([]); // Prevent undefined errors
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // ✅ Return only categories that exist in both inventory & POS low stock
  return loading ? [] : categories.filter(category => posCategories.has(category));
};

export const useAllCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const fetchCategories = async () => {
      try {
        const categoryResponse = await axios.get(`${API_BASE_URL}/inventory-by-category`);
        let inventoryCategories = [];

        if (categoryResponse.data.categories && Array.isArray(categoryResponse.data.categories)) {
          inventoryCategories = categoryResponse.data.categories
            .filter(cat => cat.category)  // ✅ กรองเฉพาะอันที่มี category
            .map(cat => cat.category.toUpperCase());  // ✅ แปลงเป็นตัวพิมพ์ใหญ่ทั้งหมด
        }

        console.log("✅ หมวดหมู่ที่โหลดจาก API:", inventoryCategories); // 🛠 Debug

        setCategories(inventoryCategories);

      } catch (error) {
        console.error("❌ Error fetching categories:", error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return loading ? [] : categories; // ✅ คืนค่าหมวดหมู่ทั้งหมด
};
