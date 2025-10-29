import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { InventoryProvider } from './context/InventoryContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Components
import Home from './components/Customer/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Menu from './components/Customer/Menu';
import Cart from './components/Customer/Cart';
import Dashboard from './components/Admin/Dashboard';
import OrderHistory from './components/Customer/OrderHistory';
import Profile from './components/Auth/Profile';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <InventoryProvider>
          <Router>
            <Layout>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Customer Routes */}
                <Route 
                  path="/menu" 
                  element={
                    <ProtectedRoute customerOnly>
                      <Menu />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/cart" 
                  element={
                    <ProtectedRoute customerOnly>
                      <Cart />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/orders" 
                  element={
                    <ProtectedRoute customerOnly>
                      <OrderHistory />
                    </ProtectedRoute>
                  } 
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute customerOnly>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute adminOnly>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </Layout>
          </Router>
        </InventoryProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;