import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Calendar, XCircle } from "lucide-react";
import { supabase } from '../../lib/supabaseClient';

const OrderHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  const { revertStock } = useInventory();

  const getUserCancelKey = () => {
    return user?.email ? `simple-dough-orders-${user.email}` : "simple-dough-orders-guest";
  };

  const fetchOrders = async () => {
    if (!user) return;

    // Try fetching from Supabase first so customer view reflects admin updates
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const processed = data.map(order => ({
          ...order,
          id: order.id,
          createdAt: order.created_at || order.createdAt,
          total: order.total || order.metadata?.total || 0,
          items: order.items || order.metadata?.items || [],
          customerEmail: order.email || order.customerEmail,
        }));

        // Mark cancelled-by-admin if status is cancelled
        processed.forEach(o => { if (o.status === 'cancelled') o.cancelledBy = 'admin'; });

        // Separate active vs completed/admin-cancelled orders
        const activeOrders = processed.filter(o => o.status !== 'delivered' && o.cancelledBy !== 'admin');
        const completedOrders = processed.filter(o => o.status === 'delivered' || o.cancelledBy === 'admin');

        const sortedActive = activeOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const sortedCompleted = completedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setOrders([...sortedActive, ...sortedCompleted]);
        return;
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to localStorage', err);
    }

    // Fallback to localStorage (offline/dev mode)
    const globalOrders = JSON.parse(localStorage.getItem('simple-dough-orders') || '[]');
    const cancelledByUser = JSON.parse(localStorage.getItem(getUserCancelKey()) || '[]');

    // Filter by current user and exclude cancelled orders
    const userOrders = globalOrders.filter(
      (o) => (o.customerEmail === user.email || o.email === user.email) && !cancelledByUser.includes(o.id)
    );

    // Tag orders cancelled by admin
    userOrders.forEach(o => {
      if (o.status === 'cancelled' && !cancelledByUser.includes(o.id)) {
        o.cancelledBy = 'admin';
      }
    });

    // Separate active vs completed/admin-cancelled orders
    const activeOrders = userOrders.filter(o => o.status !== 'delivered' && o.cancelledBy !== 'admin');
    const completedOrders = userOrders.filter(
      o => o.status === 'delivered' || o.cancelledBy === 'admin'
    );

    // Sort each section by newest first
    const sortedActive = activeOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const sortedCompleted = completedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Combine lists (active first, then completed)
    setOrders([...sortedActive, ...sortedCompleted]);
  };

  useEffect(() => {
    fetchOrders();

    const handleStorageChange = (e) => {
      if (e.key === "simple-dough-orders" || e.key === getUserCancelKey()) {
        fetchOrders();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user]);

  const cancelOrder = (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    const cancelledByUser = JSON.parse(localStorage.getItem(getUserCancelKey()) || "[]");
    cancelledByUser.push(orderId);
    localStorage.setItem(getUserCancelKey(), JSON.stringify(cancelledByUser));

    const globalOrders = JSON.parse(localStorage.getItem("simple-dough-orders") || "[]");
    const index = globalOrders.findIndex((o) => o.id === orderId);
    if (index !== -1) {
      globalOrders[index].status = "cancelled";
      localStorage.setItem("simple-dough-orders", JSON.stringify(globalOrders));
      
      const order = globalOrders[index];
      order.items.forEach(item => revertStock(item.product.id, item.quantity));
    }

    fetchOrders();
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Please log in to view your orders
        </h2>
        <button
          onClick={() => navigate("/login")}
          className="bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-600 transition-all"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="text-8xl mb-4">📦</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">No Orders Yet</h2>
        <p className="text-gray-600 mb-8">
          Once you place an order, it will appear here.
        </p>
        <button
          onClick={() => navigate("/menu")}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-all"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  // Find where the first completed order starts
  const firstCompletedIndex = orders.findIndex(
  o => o.status === "delivered" || o.cancelledBy === "admin"
);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600">{orders.length} orders found</p>
        </div>
      </div>

      <div className="space-y-6">
        {orders.map((order, index) => (
          <React.Fragment key={order.id}>
            {firstCompletedIndex !== -1 && index === firstCompletedIndex && (
              <div className="border-t border-gray-300 my-4"></div>
            )}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Order #{order.id.slice(-8)}
                  </h2>
                </div>
                <div className="text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(order.createdAt).toLocaleDateString()}{" "}
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {item.product.image && (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {item.product.name}
                        </p>

                        {item.customizations?.flavors?.length > 0 && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Flavors:</span>{" "}
                            {item.customizations.flavors.join(", ")}
                          </p>
                        )}

                        {item.customizations?.toppings && (
                          <>
                            {item.customizations.toppings.classic && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Classic:</span>{" "}
                                {item.customizations.toppings.classic}
                              </p>
                            )}
                            {item.customizations.toppings.premium && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Premium:</span>{" "}
                                {item.customizations.toppings.premium}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">
                        ₱{item.totalPrice}
                      </p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t mt-4 pt-3 flex justify-between items-center">
                <span className="text-lg font-semibold text-amber-600">Total: ₱{order.total}</span>
                <div className="flex items-center gap-2">
                  {(() => {
                    const st = order.status;
                    const cancelledByAdmin = order.cancelledBy === 'admin';
                    let badgeClass = 'bg-gray-100 text-gray-700';
                    let badgeText = (st || '').replace(/_/g, ' ').toUpperCase();

                    if (cancelledByAdmin) {
                      badgeClass = 'bg-red-100 text-red-800';
                      badgeText = 'CANCELLED BY SIMPLEDOUGH';
                    } else {
                      switch (st) {
                        case 'pending':
                          badgeClass = 'bg-yellow-100 text-yellow-800';
                          badgeText = 'PENDING';
                          break;
                        case 'confirmed':
                          badgeClass = 'bg-amber-100 text-amber-800';
                          badgeText = 'CONFIRMED';
                          break;
                        case 'preparing':
                          badgeClass = 'bg-blue-100 text-blue-800';
                          badgeText = 'PREPARING';
                          break;
                        case 'out_for_delivery':
                          badgeClass = 'bg-orange-100 text-orange-800';
                          badgeText = 'OUT FOR DELIVERY';
                          break;
                        case 'ready':
                          badgeClass = 'bg-green-100 text-green-800';
                          badgeText = 'READY';
                          break;
                        case 'delivered':
                          badgeClass = 'bg-green-200 text-green-800';
                          badgeText = 'DELIVERED';
                          break;
                        case 'cancelled':
                          badgeClass = 'bg-red-100 text-red-800';
                          badgeText = 'CANCELLED';
                          break;
                        default:
                          badgeClass = 'bg-gray-100 text-gray-700';
                          badgeText = badgeText || 'UNKNOWN';
                      }
                    }

                    return (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeClass}`}>
                        {badgeText}
                      </span>
                    );
                  })()}

                  {order.status === 'pending' && (
                    <button
                      onClick={() => cancelOrder(order.id)}
                      className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-red-200 transition-all"
                    >
                      <XCircle className="w-4 h-4" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default OrderHistory;
