import React, { useState, useEffect } from "react";
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../../api/employees"; // ปรับ path ให้ถูกตามโครงสร้างโปรเจกต์
import { fetchBranches } from "../../api/branches"; // ฟังก์ชันที่เราสร้างไว้
import "./EmployeesPopup.css";

const EmployeesPopup = () => {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]); // เพิ่ม state สำหรับเก็บสาขา
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // ฟอร์ม State
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "",
    name: "",
    branch_id: "",
    salary: "",
  });

  // โหลดข้อมูลพนักงาน
  const loadEmployees = async () => {
    try {
      const data = await fetchEmployees();
      setEmployees(data.Data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      alert("ไม่สามารถโหลดข้อมูลพนักงานได้");
    }
  };

  // โหลดข้อมูลสาขา
  const loadBranches = async () => {
    try {
      const data = await fetchBranches();
      setBranches(data); // สมมุติ data เป็น array ของ branch
    } catch (error) {
      console.error("Error fetching branches:", error);
      alert("ไม่สามารถโหลดข้อมูลสาขาได้");
    }
  };

  // เรียกโหลดพนักงาน + สาขา เมื่อ component mount
  useEffect(() => {
    loadEmployees();
    loadBranches();
  }, []);

  // เมื่อกดปุ่ม Submit ฟอร์ม
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEmployee?.employees_id) {
        // แก้ไขข้อมูล
        await updateEmployee(selectedEmployee.employees_id, formData);
        alert("แก้ไขข้อมูลพนักงานสำเร็จ");
      } else {
        // เพิ่มพนักงานใหม่
        await createEmployee(formData);
        alert("เพิ่มพนักงานใหม่สำเร็จ");
      }
      loadEmployees();
      clearForm();
    } catch (error) {
      console.error("Error saving employee:", error);
      alert("ไม่สามารถบันทึกข้อมูลพนักงานได้");
    }
  };

  // ฟังก์ชัน Edit
  const handleEdit = (emp) => {
    setSelectedEmployee(emp);
    setFormData({
      username: emp.username || "",
      password: "",
      role: emp.role || "",
      name: emp.name || "",
      branch_id: emp.branch_id || "",
      salary: emp.salary || "",
    });
  };

  // ฟังก์ชัน Delete
  const handleDelete = async (id) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ที่จะลบพนักงานนี้?")) return;
    try {
      await deleteEmployee(id);
      alert("ลบพนักงานสำเร็จ");
      loadEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("ไม่สามารถลบพนักงานได้");
    }
  };

  // ล้างฟอร์ม
  const clearForm = () => {
    setSelectedEmployee(null);
    setFormData({
      username: "",
      password: "",
      role: "",
      name: "",
      branch_id: "",
      salary: "",
    });
  };

  // แยกพนักงานตาม Role
  const employeesGod = employees.filter((e) => e.role === "God");
  const employeesManager = employees.filter((e) => e.role === "Manager");
  const employeesAudit = employees.filter((e) => e.role === "Audit");
  const employeesAccount = employees.filter((e) => e.role === "Account");
  const employeesStock = employees.filter((e) => e.role === "Stock");

  return (
    <div className="employees-popup-container">
      {/* ====== ฟอร์มอยู่ซ้าย ====== */}
      <div className="employee-form-container">
        <form onSubmit={handleSubmit} className="employee-form">
          <h3>{selectedEmployee ? "Edit Employee" : "Add Employee"}</h3>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Password (กรอกใหม่เมื่อแก้ไข)</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              required
            >
              <option value="">Select Role</option>
              <option value="God">God</option>
              <option value="Manager">Manager</option>
              <option value="Audit">Audit</option>
              <option value="Account">Account</option>
              <option value="Stock">Stock</option>
            </select>
          </div>

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          {/* เปลี่ยนจาก input เป็น select สำหรับ Branch ID */}
          <div className="form-group">
            <label>Branch ID</label>
            <select
              value={formData.branch_id}
              onChange={(e) =>
                setFormData({ ...formData, branch_id: e.target.value })
              }
              required
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.b_name} 
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Salary</label>
            <input
  type="number"
  value={formData.salary}
  onChange={(e) => {
    const val = e.target.value;
    setFormData({
      ...formData,
      // ถ้า val เป็น "" อาจเก็บเป็น 0 หรือไม่ส่ง field ก็ได้
      salary: val === "" ? 0 : parseFloat(val),
    });
  }}
/>

          </div>

          <div className="form-buttons">
            <button type="submit" className="submit-button">
              {selectedEmployee ? "Update" : "Add"} Employee
            </button>
            {selectedEmployee && (
              <button
                type="button"
                className="cancel-button"
                onClick={clearForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ====== ผังองค์กร (Org Chart) อยู่ขวา ====== */}
      <div className="org-chart-container">
        {/* God */}
        <div className="role-level god-level">
          <h4 className="role-title">God</h4>
          <div className="role-employee-list">
            {employeesGod.length === 0 ? (
              <p className="no-employee">No employees</p>
            ) : (
              employeesGod.map((emp) => (
                <div className="employee-box" key={emp.employees_id}>
                  <span className="employee-name">{emp.name}</span>
                  <span className="employee-branch">Branch: {emp.branch_id}</span>
                  <span className="employee-salary">Salary: {emp.salary}</span>
                  <div className="employee-actions">
                    <button onClick={() => handleEdit(emp)}>Edit</button>
                    <button onClick={() => handleDelete(emp.employees_id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {employeesGod.length > 0 && <div className="vertical-line" />}
        </div>

        {/* Manager */}
        <div className="role-level manager-level">
          <h4 className="role-title">Manager</h4>
          <div className="role-employee-list">
            {employeesManager.length === 0 ? (
              <p className="no-employee">No employees</p>
            ) : (
              employeesManager.map((emp) => (
                <div className="employee-box" key={emp.employees_id}>
                  <span className="employee-name">{emp.name}</span>
                  <span className="employee-branch">Branch: {emp.branch_id}</span>
                  <span className="employee-salary">Salary: {emp.salary}</span>
                  <div className="employee-actions">
                    <button onClick={() => handleEdit(emp)}>Edit</button>
                    <button onClick={() => handleDelete(emp.employees_id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {employeesManager.length > 0 && <div className="vertical-line" />}
        </div>

        {/* Sub-roles (Audit, Account, Stock) */}
        <div className="sub-role-level">
          <div className="horizontal-line" />
          {/* Audit */}
          <div className="sub-role audit">
            <h4 className="role-title">Audit</h4>
            <div className="role-employee-list">
              {employeesAudit.length === 0 ? (
                <p className="no-employee">No employees</p>
              ) : (
                employeesAudit.map((emp) => (
                  <div className="employee-box" key={emp.employees_id}>
                    <span className="employee-name">{emp.name}</span>
                    <span className="employee-branch">Branch: {emp.branch_id}</span>
                    <span className="employee-salary">Salary: {emp.salary}</span>
                    <div className="employee-actions">
                      <button onClick={() => handleEdit(emp)}>Edit</button>
                      <button onClick={() => handleDelete(emp.employees_id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Account */}
          <div className="sub-role account">
            <h4 className="role-title">Account</h4>
            <div className="role-employee-list">
              {employeesAccount.length === 0 ? (
                <p className="no-employee">No employees</p>
              ) : (
                employeesAccount.map((emp) => (
                  <div className="employee-box" key={emp.employees_id}>
                    <span className="employee-name">{emp.name}</span>
                    <span className="employee-branch">Branch: {emp.branch_id}</span>
                    <span className="employee-salary">Salary: {emp.salary}</span>
                    <div className="employee-actions">
                      <button onClick={() => handleEdit(emp)}>Edit</button>
                      <button onClick={() => handleDelete(emp.employees_id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Stock */}
          <div className="sub-role stock">
            <h4 className="role-title">Stock</h4>
            <div className="role-employee-list">
              {employeesStock.length === 0 ? (
                <p className="no-employee">No employees</p>
              ) : (
                employeesStock.map((emp) => (
                  <div className="employee-box" key={emp.employees_id}>
                    <span className="employee-name">{emp.name}</span>
                    <span className="employee-branch">Branch: {emp.branch_id}</span>
                    <span className="employee-salary">Salary: {emp.salary}</span>
                    <div className="employee-actions">
                      <button onClick={() => handleEdit(emp)}>Edit</button>
                      <button onClick={() => handleDelete(emp.employees_id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeesPopup;
