import { RefreshCw } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, CheckCircle, Clock, Truck, Mail, Package, Phone, MapPin, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const OrderManagement = () => {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch orders from Supabase
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Try fetching all orders first (relies on RLS policy)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('RLS Error fetching orders:', error);
        // If RLS blocks, try fallback
        throw error;
      }

      console.log('Raw fetch result:', { data, error });

      // Parse items jsonb and flatten structure for display
      const processedOrders = (data || []).map(order => ({
        ...order,
        displayId: order.id.slice(-8), // Use last 8 chars of UUID for display
        createdAt: order.created_at,
        customerName: order.metadata?.customerName || 'Unknown',
        customerEmail: order.email,
        phone: order.metadata?.phone || '',
        deliveryAddress: order.metadata?.deliveryAddress || '',
        deliveryMethod: order.metadata?.deliveryMethod || 'pickup',
        paymentMethod: order.metadata?.paymentMethod || 'unknown',
        notes: order.metadata?.notes || '',
      }));

      console.log('Processed orders:', processedOrders);
      setOrders(processedOrders);
      setFilteredOrders(processedOrders);
    } catch (err) {
      console.error('Error fetching orders from Supabase:', err);
      console.log('Falling back to localStorage...');
      
      // Fallback: load from localStorage if Supabase fails
      try {
        const localOrders = JSON.parse(localStorage.getItem('simple-dough-orders') || '[]');
        const processedOrders = localOrders.map(order => ({
          ...order,
          displayId: (order.id || '').slice(-8),
          createdAt: order.createdAt || order.created_at,
        }));
        console.log('Loaded from localStorage:', processedOrders);
        setOrders(processedOrders);
        setFilteredOrders(processedOrders);
      } catch (localErr) {
        console.error('Also failed to load from localStorage:', localErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update filtered orders when search or filter changes
  useEffect(() => {
    let filtered = [...orders];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.phone.includes(searchTerm) ||
        order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Check if user is admin before attempting update
      if (!isAdmin) {
        alert('Only admins can update order status');
        return;
      }

      console.log('Admin updating order', orderId, 'to status', newStatus);
      
      // Optimistically update the UI first
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setFilteredOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select();

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Update error details:', error);
        throw error;
      }

      console.log('✅ Update successful:', data);
      alert('Order status updated successfully');
    } catch (err) {
      console.error('Error updating order status:', err.message || err);
      alert(`Failed to update order status: ${err.message || JSON.stringify(err)}`);
      // Revert optimistic update on error
      fetchOrders();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'preparing': return <Package className="w-4 h-4" />;
      case 'ready': return <CheckCircle className="w-4 h-4" />;
      case 'out_for_delivery': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-500" />
        <p className="text-gray-600">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h1>
          <p className="text-gray-600">Track and manage all customer orders</p>
        </div>
        <button
          onClick={fetchOrders}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order ID, Phone, or Email..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <select
              className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Orders</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Order Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      Order #{order.displayId}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {statusOptions.find(s => s.value === order.status)?.label || order.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {order.phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {order.deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      {order.items?.length || 0} items
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="text-lg font-bold text-amber-600">₱{order.total}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      via {(order.paymentMethod ? order.paymentMethod.toUpperCase() : 'N/A')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>

                  {/* Status Update Dropdown */}
                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={order.status === 'cancelled' || order.status === 'delivered'}
                  >
                    {statusOptions.map(option => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Orders will appear here once customers start placing them.'
              }
            </p>
            <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded inline-block">
              Check browser console (F12) for debug info
            </p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                Order #{selectedOrder.displayId}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Order Status */}
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusIcon(selectedOrder.status)}
                  {statusOptions.find(s => s.value === selectedOrder.status)?.label || selectedOrder.status}
                </span>
                <span className="text-sm text-gray-600">
                  Ordered on {new Date(selectedOrder.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>  
                  <div className="space-y-2 text-sm">
                      {selectedOrder.customerName && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">Name:</span>
                          <span>{selectedOrder.customerName}</span>
                        </div>
                      )}
                      {selectedOrder.customerEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span>{selectedOrder.customerEmail}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{selectedOrder.phone}</span>
                      </div>
                      {selectedOrder.deliveryMethod === 'delivery' && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                          <span>{selectedOrder.deliveryAddress}</span>
                        </div>
                      )}
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-gray-500" />
                    <span>{selectedOrder.deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup'}</span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      {item.product?.image && (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.product?.name}</h4>
                        {item.customizations?.flavors && item.customizations.flavors.length > 0 && (
                          <p className="text-sm text-gray-600">
                            Flavors: {item.customizations.flavors.join(', ')}
                          </p>
                        )}
                        {item.customizations?.toppings && (
                          <div className="text-sm text-gray-600">
                            {item.customizations.toppings.classic && (
                              <p>Classic: {item.customizations.toppings.classic}</p>
                            )}
                            {item.customizations.toppings.premium && (
                              <p>Premium: {item.customizations.toppings.premium}</p>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₱{item.totalPrice}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-amber-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₱{selectedOrder.total - (selectedOrder.deliveryMethod === 'delivery' ? 50 : 0)}</span>
                  </div>
                  {selectedOrder.deliveryMethod === 'delivery' && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>₱50</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="text-amber-600">₱{selectedOrder.total}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Payment Method:</span>
                    <span>{selectedOrder.paymentMethod ? selectedOrder.paymentMethod.toUpperCase() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Special Notes */}
              {selectedOrder.notes && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Special Instructions</h3>
                  <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;