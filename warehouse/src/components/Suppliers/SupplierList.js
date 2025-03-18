import React from 'react';

const SupplierList = ({
  suppliers,
  onEdit,
  onDelete,
  onMoreProduct,
  // ถ้าต้องการใช้แก้ไข/ลบสินค้าเดียวผ่าน Dropdown ต้องส่ง callback เหล่านี้
  onEditProduct,
  onDeleteProduct,
}) => {
  return (
    <table className="suppliers-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Avg Price/Pallet</th>
          <th>Products</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {suppliers.map((supplier) => {
          // คำนวณค่าเฉลี่ยราคา
          let avgPrice = 0;
          let productCount = 0;
          if (supplier.product_suppliers && supplier.product_suppliers.length > 0) {
            productCount = supplier.product_suppliers.length;
            const sum = supplier.product_suppliers.reduce(
              (acc, ps) => acc + (ps.price_pallet || 0),
              0
            );
            avgPrice = sum / productCount;
          }

          return (
            <tr key={supplier.supplier_id}>
              {/* คอลัมน์ Name */}
              <td>{supplier.name}</td>

              {/* คอลัมน์ Avg Price/Pallet (ถ้าไม่มีสินค้า ให้แสดง '-') */}
              <td>{productCount > 0 ? avgPrice.toFixed(2) : '-'}</td>

              {/* คอลัมน์ Products (ใช้ Dropdown แทน) */}
              <td>
                {productCount > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <select style={{ minWidth: '140px' }} defaultValue="">
                      <option value="">-- Select Product --</option>
                      {supplier.product_suppliers.map((ps) => (
                        <option key={ps.id} value={ps.id}>
                          {ps.product
                            ? ps.product.product_name
                            : ps.product_id}
                          {' - '}
                          {ps.price_pallet}
                        </option>
                      ))}
                    </select>

                    {/* ถ้าต้องการปุ่ม Edit / Delete สำหรับสินค้าที่เลือก */}
                    {onEditProduct && (
                      <button
                        onClick={() => {
                          // ตัวอย่างเรียก onEditProduct แบบ prompt ให้ผู้ใช้เลือกเอง
                          alert('โปรดเลือกสินค้าจาก dropdown ก่อน แล้วปรับโค้ดตามต้องการ');
                        }}
                      >
                        Edit Product
                      </button>
                    )}
                    {onDeleteProduct && (
                      <button
                        onClick={() => {
                          alert('โปรดเลือกสินค้าจาก dropdown ก่อน แล้วปรับโค้ดตามต้องการ');
                        }}
                      >
                        Delete Product
                      </button>
                    )}
                  </div>
                ) : (
                  <span>No products</span>
                )}
              </td>

              {/* คอลัมน์ Actions (Edit/Delete Supplier + More Product) */}
              <td>
                <button onClick={() => onEdit(supplier)}>Edit</button>
                <button onClick={() => onDelete(supplier.supplier_id)}>Delete</button>
                <button onClick={() => onMoreProduct(supplier)}>More Product</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default SupplierList;
