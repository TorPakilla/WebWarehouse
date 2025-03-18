import React from "react";

const InventoryList = ({ inventories, onEdit, onDelete }) => {
    return (
        <table>
            <thead>
                <tr>
                    <th>Product Unit</th>
                    <th>Branch</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {inventories.map((inventory) => (
                    <tr key={inventory.inventoryid}>
                        <td>{inventory.productunitid}</td>
                        <td>{inventory.brancheid}</td>
                        <td>{inventory.quantity}</td>
                        <td>{inventory.price}</td>
                        <td>
                            <button onClick={() => onEdit(inventory)}>Edit</button>
                            <button onClick={() => onDelete(inventory.inventoryid)}>Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default InventoryList;
