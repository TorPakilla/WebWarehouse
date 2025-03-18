import React, { useState, useEffect } from "react";
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from "../api/employees";
import EmployeeForm from "../components/Employees/EmployeeForm";
import EmployeeList from "../components/Employees/EmployeeList";
import "../components/Employees/Employees.css";

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // โหลดข้อมูลพนักงาน
  const loadEmployees = async () => {
    try {
      const data = await fetchEmployees();
      setEmployees(data.Data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      alert("Failed to fetch employees.");
    }
  };

  // เพิ่ม/แก้ไขข้อมูลพนักงาน
  const handleCreateOrUpdate = async (employeeData, isEdit) => {
    try {
      console.log("Employee form submitted:", employeeData);
      const updatedEmployeeData = {
        ...employeeData,
        branch_id: employeeData.branchid || employeeData.branch_id,
      };
      delete updatedEmployeeData.brancheid;

      if (isEdit && selectedEmployee?.employees_id) {
        await updateEmployee(selectedEmployee.employees_id, updatedEmployeeData);
        alert("Employee updated successfully");
      } else {
        await createEmployee(updatedEmployeeData);
        alert("Employee created successfully");
      }
      loadEmployees();
      setSelectedEmployee(null);
    } catch (error) {
      console.error("Error saving employee:", error.response?.data || error.message);
      alert("Failed to save employee.");
    }
  };

  // ลบพนักงาน
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    try {
      await deleteEmployee(id);
      alert("Employee deleted successfully");
      loadEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("Failed to delete employee.");
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  return (
    <div className="employees-page-container">
      <header className="employees-header">
        <h1>Manage Employees</h1>
      </header>

      <div className="employees-content">
        <EmployeeForm
          onSubmit={handleCreateOrUpdate}
          selectedEmployee={selectedEmployee}
          setSelectedEmployee={setSelectedEmployee}
        />
        <EmployeeList
          employees={employees}
          onEdit={setSelectedEmployee}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};

export default EmployeesPage;
