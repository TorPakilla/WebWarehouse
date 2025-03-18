import React, { useState, useEffect } from "react";

const InventoryForm = ({
    onSubmit,
    productUnits,
    branches,
    selectedInventory,
    setSelectedInventory,
}) => {
    const [formData, setFormData] = useState({
        productunitid: "",
        brancheid: "",
        quantity: "",
        price: "",
    });

    useEffect(() => {
        if (selectedInventory) {
            setFormData({
                productunitid: selectedInventory.productunitid,
                brancheid: selectedInventory.brancheid,
                quantity: selectedInventory.quantity,
                price: selectedInventory.price,
            });
        } else {
            setFormData({
                productunitid: "",
                brancheid: "",
                quantity: "",
                price: "",
            });
        }
    }, [selectedInventory]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label>
                Product Unit:
                <select
                    name="productunitid"
                    value={formData.productunitid}
                    onChange={handleChange}
                    required
                >
                    <option value="">Select Product Unit</option>
                    {productUnits.map((unit) => (
                        <option key={unit.product_unit_id} value={unit.product_unit_id}>
                            {unit.type}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                Branch:
                <select
                    name="brancheid"
                    value={formData.brancheid}
                    onChange={handleChange}
                    required
                >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                        <option key={branch.branch_id} value={branch.branch_id}>
                            {branch.branch_name}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                Quantity:
                <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                />
            </label>
            <label>
                Price:
                <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                />
            </label>
            <button type="submit">{selectedInventory ? "Update" : "Add"}</button>
            {selectedInventory && (
                <button type="button" onClick={() => setSelectedInventory(null)}>
                    Cancel
                </button>
            )}
        </form>
    );
};

export default InventoryForm;
