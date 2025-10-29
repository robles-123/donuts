// src/Admin/Dashboard.jsx
import React, { useState, useEffect } from "react";
import {
  BarChart3,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertTriangle,
  Package,
} from "lucide-react";
import { useInventory } from "../../context/InventoryContext";
import { PRODUCTS } from "../../data/products";
import InventoryManagement from "./InventoryManagement";
import OrderManagement from "./OrderManagement";
import Reports from "./Reports";
import { DashboardTabs } from "../../components/Layout/DashboardTabs";

const Dashboard = () => {
  const { inventory, getLowStockProducts } = useInventory();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    totalCustomers: 1,
    avgOrderValue: 0,
  });

  useEffect(() => {
    // Load orders from localStorage (demo purposes)
    const savedOrders = JSON.parse(
      localStorage.getItem("simple-dough-orders") || "[]"
    );
    setOrders(savedOrders);

    // Calculate stats
    const today = new Date().toDateString();
    const todayOrders = savedOrders.filter(
      (order) => new Date(order.createdAt).toDateString() === today
    );

    const todayRevenue = todayOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );
    const avgOrderValue =
      todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

    setStats({
      todayOrders: todayOrders.length,
      todayRevenue,
      totalCustomers: new Set(savedOrders.map((order) => order.customerId))
        .size,
      avgOrderValue,
    });
  }, []);

  const lowStockProducts = getLowStockProducts();

  // ✅ Fixed StatCard spacing and typography
  const StatCard = ({ title, value, icon: Icon, color, change }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
      <div className="flex items-center justify-between">
        {/* Force column layout + consistent vertical gaps */}
        <div className="flex flex-col justify-center space-y-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 leading-tight">{value}</p>
          {change !== undefined && (
            <p
              className={`text-sm ${
                change >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {change >= 0 ? "+" : ""}
              {change}% from yesterday
            </p>
          )}
        </div>
        <div
          className={`w-12 h-12 ${color} rounded-full flex items-center justify-center`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Tabs Navigation */}
      <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Dashboard Section */}
      {activeTab === "dashboard" && (
        <>
          {/* Header with added top margin */}
          <div className="mb-8 mt-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back! Here's what's happening with your donut business.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Today's Orders"
              value={stats.todayOrders}
              icon={ShoppingCart}
              color="bg-gradient-to-br from-blue-500 to-blue-600"
              change={12}
            />
            <StatCard
              title="Today's Revenue"
              value={`₱${stats.todayRevenue}`}
              icon={TrendingUp}
              color="bg-gradient-to-br from-green-500 to-green-600"
              change={8}
            />
            <StatCard
              title="Total Customers"
              value={stats.totalCustomers}
              icon={Users}
              color="bg-gradient-to-br from-purple-500 to-purple-600"
              change={5}
            />
            <StatCard
              title="Avg Order Value"
              value={`₱${stats.avgOrderValue.toFixed(0)}`}
              icon={BarChart3}
              color="bg-gradient-to-br from-amber-500 to-orange-500"
              change={-3}
            />
          </div>

          {/* Orders & Inventory Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Recent Orders
              </h3>
              <div className="space-y-4">
                {orders.length > 0 ? (
                  orders
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // newest first
                    .slice(0, 5)
                    .map((order) => {
                      const getStatusColor = (status) => {
                        switch (status) {
                          case "pending":
                            return "bg-yellow-100 text-yellow-800 border-yellow-200";
                          case "confirmed":
                            return "bg-blue-100 text-blue-800 border-blue-200";
                          case "preparing":
                            return "bg-purple-100 text-purple-800 border-purple-200";
                          case "ready":
                            return "bg-green-100 text-green-800 border-green-200";
                          case "out_for_delivery":
                            return "bg-orange-100 text-orange-800 border-orange-200";
                          case "delivered":
                            return "bg-emerald-100 text-emerald-800 border-emerald-200";
                          case "cancelled":
                            return "bg-red-100 text-red-800 border-red-200";
                          default:
                            return "bg-gray-100 text-gray-800 border-gray-200";
                        }
                      };

                      return (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">
                              Order #{order.id.slice(-6)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {order.items.length} items • {order.paymentMethod.toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">₱{order.total}</p>
                            <span
                              className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(order.status)}`}
                            >
                              {order.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No orders yet today
                  </div>
                )}
              </div>
            </div>

            {/* Inventory Alerts */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-xl font-bold text-gray-900">
                  Inventory Alerts
                </h3>
              </div>
              <div className="space-y-4">
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.map((productId) => {
                    const product = PRODUCTS.find((p) => p.id === productId);
                    const stock = inventory[productId];
                    return (
                      <div
                        key={productId}
                        className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-red-600" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {product?.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Low stock alert
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">
                            {stock?.currentStock} left
                          </p>
                          <p className="text-xs text-gray-500">
                            Limit: {stock?.dailyLimit}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-green-600">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    All products are well stocked!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab("inventory")}
                className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all transform hover:scale-105"
              >
                <Package className="w-6 h-6 mx-auto mb-2" />
                <span className="font-semibold">Manage Inventory</span>
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
              >
                <ShoppingCart className="w-6 h-6 mx-auto mb-2" />
                <span className="font-semibold">View All Orders</span>
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className="p-4 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105"
              >
                <BarChart3 className="w-6 h-6 mx-auto mb-2" />
                <span className="font-semibold">Generate Reports</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Inventory Management */}
      {activeTab === "inventory" && <InventoryManagement />}

      {/* Orders */}
      {activeTab === "orders" && <OrderManagement />}

      {/* Reports */}
      {activeTab === "reports" && <Reports />}
    </div>
  );
};

export default Dashboard;
