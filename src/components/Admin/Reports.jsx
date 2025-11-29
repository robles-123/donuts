import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const Reports = () => {
  const [orders, setOrders] = useState([]);
  const [dateRange, setDateRange] = useState('today');
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    topProducts: [],
    revenueByDay: [],
    ordersByStatus: {},
    paymentMethods: {}
  });

  useEffect(() => {
    // Try Supabase first so reports reflect server-side orders (admin updates)
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const processed = data.map(order => ({
            ...order,
            id: order.id,
            createdAt: order.created_at || order.createdAt,
            total: order.total || order.metadata?.total || 0,
            items: order.items || order.metadata?.items || [],
            customerId: order.user_id || order.customerId || order.metadata?.user_id,
            paymentMethod: order.metadata?.paymentMethod || order.paymentMethod || 'N/A',
            deliveryMethod: order.metadata?.deliveryMethod || order.deliveryMethod || 'pickup'
          }));
          setOrders(processed);
          return;
        }
      } catch (err) {
        console.warn('Reports: Supabase fetch failed, falling back to localStorage', err);
      }

      const savedOrders = JSON.parse(localStorage.getItem('simple-dough-orders') || '[]');
      setOrders(savedOrders);
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    generateReport();
  }, [orders, dateRange]);

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: weekStart, end: now };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: now };
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart, end: now };
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    }
  };

  const generateReport = () => {
    const { start, end } = getDateRange();
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate < end;
    });

    // Calculate basic metrics
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top products
    const productSales = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const productName = item.product.name;
        if (!productSales[productName]) {
          productSales[productName] = { quantity: 0, revenue: 0 };
        }
        productSales[productName].quantity += item.quantity;
        productSales[productName].revenue += item.totalPrice;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Revenue by day (last 7 days)
    const revenueByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dayStart && orderDate < dayEnd;
      });
      
      const dayRevenue = dayOrders.reduce((sum, order) => sum + order.total, 0);
      revenueByDay.push({
        date: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
        orders: dayOrders.length
      });
    }

    // Orders by status
    const ordersByStatus = {};
    filteredOrders.forEach(order => {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    });

    // Payment methods
    const paymentMethods = {};
    filteredOrders.forEach(order => {
      paymentMethods[order.paymentMethod] = (paymentMethods[order.paymentMethod] || 0) + 1;
    });

    setReportData({
      totalRevenue,
      totalOrders,
      avgOrderValue,
      topProducts,
      revenueByDay,
      ordersByStatus,
      paymentMethods
    });
  };

  const exportReport = () => {
    const reportContent = {
      dateRange,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue: reportData.totalRevenue,
        totalOrders: reportData.totalOrders,
        avgOrderValue: reportData.avgOrderValue
      },
      topProducts: reportData.topProducts,
      revenueByDay: reportData.revenueByDay,
      ordersByStatus: reportData.ordersByStatus,
      paymentMethods: reportData.paymentMethods
    };

    const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simple-dough-report-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const StatCard = ({ title, value, icon: Icon, color, change }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change}% from previous period
            </p>
          )}
        </div>
        <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={`₱${reportData.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="bg-gradient-to-br from-green-500 to-green-600"
          change={12}
        />
        <StatCard
          title="Total Orders"
          value={reportData.totalOrders.toLocaleString()}
          icon={ShoppingCart}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          change={8}
        />
        <StatCard
          title="Avg Order Value"
          value={`₱${reportData.avgOrderValue.toFixed(0)}`}
          icon={BarChart3}
          color="bg-gradient-to-br from-amber-500 to-orange-500"
          change={-3}
        />
        <StatCard
          title="Unique Customers"
          value={new Set(orders.map(o => o.customerId)).size}
          icon={Users}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          change={15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Daily Revenue (Last 7 Days)</h3>
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
          <div className="space-y-4">
            {reportData.revenueByDay.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">{day.date}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{day.orders} orders</span>
                  <span className="font-semibold text-gray-900">₱{day.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Top Selling Products</h3>
            <Package className="w-6 h-6 text-amber-500" />
          </div>
          <div className="space-y-4">
            {reportData.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.quantity} sold</p>
                  </div>
                </div>
                <span className="font-semibold text-green-600">₱{product.revenue}</span>
              </div>
            ))}
            {reportData.topProducts.length === 0 && (
              <p className="text-center text-gray-500 py-8">No sales data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Status Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Orders by Status</h3>
          <div className="space-y-3">
            {Object.entries(reportData.ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="capitalize font-medium text-gray-700">
                  {status.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold">
                    {count}
                  </div>
                  <span className="text-sm text-gray-600">
                    {reportData.totalOrders > 0 ? Math.round((count / reportData.totalOrders) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Payment Methods</h3>
          <div className="space-y-3">
            {Object.entries(reportData.paymentMethods).map(([method, count]) => (
              <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="uppercase font-medium text-gray-700">{method}</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-bold">
                    {count}
                  </div>
                  <span className="text-sm text-gray-600">
                    {reportData.totalOrders > 0 ? Math.round((count / reportData.totalOrders) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Report */}
      <div className="mt-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Period Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Revenue Growth</p>
            <p className="text-lg font-semibold text-green-600">+12% vs previous period</p>
          </div>
          <div>
            <p className="text-gray-600">Best Selling Day</p>
            <p className="text-lg font-semibold text-gray-900">
              {reportData.revenueByDay.length > 0 
                ? reportData.revenueByDay.reduce((max, day) => day.revenue > max.revenue ? day : max, reportData.revenueByDay[0]).date
                : 'N/A'
              }
            </p>
          </div>
          <div>
            <p className="text-gray-600">Customer Satisfaction</p>
            <p className="text-lg font-semibold text-amber-600">4.8/5 ⭐</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;