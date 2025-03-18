import React, { useState, useEffect } from 'react';
import { fetchProducts } from '../../api/suppliers';

const SupplierForm = ({ onSubmit, selectedSupplier, setSelectedSupplier }) => {
    const [name, setName] = useState('');
    const [pricePallet, setPricePallet] = useState('');
    const [productId, setProductId] = useState('');
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await fetchProducts();
                console.log('Fetched products:', data); // Debugging
                setProducts(data || []);
            } catch (error) {
                console.error('Error fetching products:', error);
                setProducts([]);
            }
        };
        loadProducts();
    }, []);

    useEffect(() => {
        if (selectedSupplier) {
            setName(selectedSupplier.name);
            setPricePallet(selectedSupplier.price_pallet);
            setProductId(selectedSupplier.product_id);
        }
    }, [selectedSupplier]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !pricePallet || !productId) {
            alert('Please fill all fields.');
            return;
        }
        onSubmit(
            {
                name, 
                pricepallet: parseFloat(pricePallet), // Ensure float
                productid: productId, // Match backend key
            },
            !!selectedSupplier
        );
        setName('');
        setPricePallet('');
        setProductId('');
        setSelectedSupplier(null);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Name:</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Price per Pallet:</label>
                <input
                    type="number"
                    value={pricePallet}
                    onChange={(e) => setPricePallet(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Product:</label>
                <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    required
                >
                    <option value="">Select a product</option>
                    {products.length > 0 ? (
                        products.map((product) => (
                            <option key={product.product_id} value={product.product_id}>
                                {product.product_name}
                            </option>
                        ))
                    ) : (
                        <option value="" disabled>
                            No products available
                        </option>
                    )}
                </select>
            </div>
            <button type="submit">{selectedSupplier ? 'Update' : 'Create'}</button>
        </form>
    );
};

export default SupplierForm;
