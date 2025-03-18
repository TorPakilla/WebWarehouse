import React from "react";

const EmployeeList = ({ employees, onEdit, onDelete }) => {
    return (
        <table>
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Name</th>
                    <th>Branch</th>
                    <th>Salary</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {employees.map((employee) => (
                    <tr key={employee.employees_id}>
                        <td>{employee.username}</td>
                        <td>{employee.role}</td>
                        <td>{employee.name}</td>
                        <td>{employee.branch?.b_name || "N/A"}</td> {/* แสดงชื่อ Branch */}
                        <td>{employee.salary}</td>
                        <td>
                            <button onClick={() => onEdit(employee)}>Edit</button>
                            <button onClick={() => onDelete(employee.employees_id)}>Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default EmployeeList;
