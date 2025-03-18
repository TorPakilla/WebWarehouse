import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import OrdersPage from './pages/OrdersPage';
import ProductsPage from './pages/ProductsPage';
import ShipmentsPage from './pages/ShipmentsPage';
import BranchesPage from './pages/BranchesPage';
import EmployeesPage from './pages/EmployeesPage';
import InventoryPage from './pages/InventoryPage';
import SuppliersPage from './pages/SuppliersPage';

import "./App.css";

const App = () => {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LoginPage />} />

                {/* Dashboard and Admin Routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/shipments" element={<ShipmentsPage />} />
                <Route path="/branches" element={<BranchesPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
            </Routes>
        </Router>
    );
};

export default App;
