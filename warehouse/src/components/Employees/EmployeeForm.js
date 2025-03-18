import React, { useState, useEffect } from "react";
import { fetchBranches } from "../../api/branches";

const EmployeeForm = ({ onSubmit, selectedEmployee, setSelectedEmployee }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("");
    const [name, setName] = useState("");
    const [branch, setBranch] = useState("");
    const [salary, setSalary] = useState("");
    const [branches, setBranches] = useState([]);
    const roles = ["Stock", "Account", "Manager", "Audit", "God"];

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const branches = await fetchBranches();
                console.log("Branches in EmployeeForm:", branches); // Debug ข้อมูล
    
                if (Array.isArray(branches) && branches.length > 0) {
                    setBranches(branches); // อัปเดต branches
                } else {
                    console.error("Branches data is empty or invalid");
                    alert("No branches available");
                    setBranches([]); // กำหนดเป็น array ว่าง
                }
            } catch (error) {
                console.error("Error fetching branches:", error.response?.data || error.message);
                alert("Failed to fetch branches.");
            }
        };
    
        loadBranches();
    
        if (selectedEmployee) {
            setUsername(selectedEmployee.username);
            setPassword("");
            setRole(selectedEmployee.role);
            setName(selectedEmployee.name);
            setBranch(selectedEmployee.branch?.branch_id || "");
            setSalary(selectedEmployee.salary);
        } else {
            resetForm();
        }
    }, [selectedEmployee]);
    

    const resetForm = () => {
        setUsername("");
        setPassword("");
        setRole("");
        setName("");
        setBranch("");
        setSalary("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
    
        if (!branch || !role) {
            alert("Please select a valid branch and role!");
            return;
        }
    
        const formData = {
            username,
            password,
            role,
            name,
            branch_id: branch, // ใช้ branch_id
            salary: parseFloat(salary), // ตรวจสอบให้ salary เป็น float
        };
    
        onSubmit(formData, !!selectedEmployee);
        resetForm();
    };
    

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Username</label>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={selectedEmployee ? "Leave blank to keep current password" : ""}
                    required={!selectedEmployee}
                />
            </div>
            <div>
                <label>Role</label>
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                >
                    <option value="">Select Role</option>
                    {roles.map((role, index) => (
                        <option key={index} value={role}>
                            {role}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label>Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Branch</label>
                <select
    value={branch}
    onChange={(e) => setBranch(e.target.value)}
    required
>
    <option value="">Select Branch</option>
    {branches.length > 0 ? (
        branches.map((branch) => (
            <option key={branch.branch_id} value={branch.branch_id}>
                {branch.b_name} {/* แสดงเฉพาะชื่อสาขา */}
            </option>
        ))
    ) : (
        <option value="">No branches available</option>
    )}
</select>


            </div>
            <div>
                <label>Salary</label>
                <input
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    required
                />
            </div>
            <button type="submit">
                {selectedEmployee ? "Update Employee" : "Add Employee"}
            </button>
            {selectedEmployee && (
                <button type="button" onClick={() => setSelectedEmployee(null)}>
                    Cancel
                </button>
            )}
        </form>
    );
};

export default EmployeeForm;
