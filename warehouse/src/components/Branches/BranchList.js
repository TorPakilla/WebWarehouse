import React from "react";

const EmployeeList = ({ employees, onEdit, onDelete }) => {
    if (!employees || employees.length === 0) {
        return <p>No employees available</p>;
    }

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
                    <tr key={employee.id || employee.username}>
                        <td>{employee.username}</td>
                        <td>{employee.role}</td>
                        <td>{employee.name}</td>
                        <td>{employee.branchName || "N/A"}</td>
                        <td>{employee.salary}</td>
                        <td>
                            <button onClick={() => onEdit(employee)}>Edit</button>
                            <button onClick={() => onDelete(employee.id)}>Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default EmployeeList;
