import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderHistory, setOrderHistory] = useState([]); // ✅ Added order history state

  useEffect(() => {
    const savedUser = localStorage.getItem('simple-dough-user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);

      // ✅ Load this user's order history
      const allOrders = JSON.parse(localStorage.getItem('simple-dough-orders')) || [];
      const userOrders = allOrders.filter((order) => order.userId === parsedUser.id);
      setOrderHistory(userOrders);
    }
    setLoading(false);
  }, []);

  // ✅ Register a new user
  const register = (userData) => {
    const users = JSON.parse(localStorage.getItem('simple-dough-users')) || [];

    // Check if email already exists
    if (users.some((u) => u.email === userData.email)) {
      throw new Error('Email already registered');
    }

    const newUser = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('simple-dough-users', JSON.stringify(users));
    localStorage.setItem('simple-dough-user', JSON.stringify(newUser));
    setUser(newUser);

    return newUser;
  };

  // ✅ Login existing user
  const login = ({ email, password }) => {
    const users = JSON.parse(localStorage.getItem('simple-dough-users')) || [];
    const foundUser = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!foundUser) {
      throw new Error('Invalid email or password');
    }

    setUser(foundUser);
    localStorage.setItem('simple-dough-user', JSON.stringify(foundUser));

    // ✅ Load order history for this user
    const allOrders = JSON.parse(localStorage.getItem('simple-dough-orders')) || [];
    const userOrders = allOrders.filter((order) => order.userId === foundUser.id);
    setOrderHistory(userOrders);
  };

  const logout = () => {
    setUser(null);
    setOrderHistory([]); // ✅ Clear order history when logging out
    localStorage.removeItem('simple-dough-user');
    localStorage.removeItem('simple-dough-cart');
  };

  // ✅ Save new order for this user
  const addOrder = (orderData) => {
    if (!user) throw new Error('You must be logged in to place an order.');

    const allOrders = JSON.parse(localStorage.getItem('simple-dough-orders')) || [];
    const newOrder = {
      ...orderData,
      id: Date.now().toString(),
      userId: user.id,
      email: user.email,
      createdAt: new Date().toISOString(),
    };

    allOrders.push(newOrder);
    localStorage.setItem('simple-dough-orders', JSON.stringify(allOrders));

    // Update local state
    setOrderHistory((prev) => [...prev, newOrder]);
  };

  const value = {
    user,
    login,
    logout,
    register,
    loading,
    orderHistory, // ✅ expose order history
    addOrder, // ✅ expose function to add order
    isAdmin: user?.role === 'admin',
    isCustomer: user?.role === 'customer',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
