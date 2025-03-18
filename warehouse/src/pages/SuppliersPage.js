import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SupplierForm from '../components/Suppliers/SupplierForm';
import SupplierList from '../components/Suppliers/SupplierList';
import {
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    fetchProducts,
} from '../api/suppliers';
import "../components/Suppliers/Suppliers.css";

const SuppliersPage = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const navigate = useNavigate();

    const loadSuppliers = async () => {
        try {
            const data = await fetchSuppliers();
            console.log('Fetched suppliers:', data);
            setSuppliers(data);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            alert('Failed to fetch suppliers.');
        }
    };

    const loadProducts = async () => {
        try {
            const data = await fetchProducts();
            console.log('Fetched products:', data);
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
            alert('Failed to fetch products.');
        }
    };

    useEffect(() => {
        loadSuppliers();
        loadProducts(); 
    }, []);

    const handleCreateOrUpdate = async (supplier, isEdit) => {
        try {
            console.log('Supplier data being sent:', supplier); 
            if (isEdit) {
                await updateSupplier(selectedSupplier.supplier_id, supplier);
            } else {
                await createSupplier(supplier);
            }
            setSelectedSupplier(null);
            loadSuppliers();
        } catch (error) {
            console.error('Error creating/updating supplier:', error.response?.data || error.message);
            alert('Failed to create/update supplier.');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteSupplier(id);
            loadSuppliers();
        } catch (error) {
            console.error('Error deleting supplier:', error);
            alert('Failed to delete supplier.');
        }
    };

    return (
        <div className="suppliers-page-container">
            <header className="suppliers-header">
                <h1>Manage Suppliers</h1>
                <button className="back-btn" onClick={() => navigate('/dashboard')}>
                    Back to Dashboard
                </button>
            </header>

            <div className="suppliers-content">
                <div className="supplier-form-wrapper">
                    <SupplierForm
                        onSubmit={handleCreateOrUpdate}
                        selectedSupplier={selectedSupplier}
                        setSelectedSupplier={setSelectedSupplier}
                    />
                </div>
                <div className="supplier-list-wrapper">
                    <SupplierList
                        suppliers={suppliers}
                        products={products}
                        onEdit={setSelectedSupplier}
                        onDelete={handleDelete}
                    />
                </div>
            </div>
        </div>
    );
};

export default SuppliersPage;
