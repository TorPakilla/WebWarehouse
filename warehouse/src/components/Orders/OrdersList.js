import React, { useEffect, useState } from 'react';
import { fetchOrders } from '../../api/orders';

const OrdersList = () => {
    const [orders, setOrders] = useState([]); // เก็บข้อมูลของคำสั่งซื้อ
    const [loading, setLoading] = useState(true); // ใช้เพื่อตรวจสอบการโหลดข้อมูล
    const [error, setError] = useState(''); // เก็บข้อความ error

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const data = await fetchOrders();
                console.log("Fetched Orders:", data); // ตรวจสอบข้อมูลจาก API
                
                // สมมติว่า API ส่งข้อมูลในฟิลด์ชื่อ 'orders'
                if (data && data.orders) {
                    setOrders(data.orders); // อัพเดตข้อมูลคำสั่งซื้อ
                } else {
                    setError('No orders available');
                }
            } catch (error) {
                console.error("Error fetching orders:", error);
                setError("Failed to fetch orders.");
            } finally {
                setLoading(false); // ตั้งค่าให้การโหลดเสร็จสิ้น
            }
        };

        loadOrders();
    }, []); // จะทำงานเมื่อคอมโพเนนต์โหลด

    // การแสดงผล UI ขึ้นอยู่กับสถานะการโหลดข้อมูล
    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>{error}</div>;
    }

    return (
        <ul>
            {orders.length > 0 ? (
                orders.map((order) => (
                    <li key={order.orderid}>
                        {order.ordernumber} - {order.status}
                    </li>
                ))
            ) : (
                <li>No orders available</li> // ถ้าไม่มีคำสั่งซื้อ
            )}
        </ul>
    );
};

export default OrdersList;
