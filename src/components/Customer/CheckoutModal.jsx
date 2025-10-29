import React, { useState } from 'react';
import { X, CreditCard, Smartphone, MapPin, Clock } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import CheckoutSuccess from './CheckoutSuccess';

const CheckoutModal = ({ onClose }) => {
  const { cartItems, getTotalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const { recordSale, getProductStock } = useInventory();
  
  const [orderData, setOrderData] = useState({
    paymentMethod: 'gcash',
    deliveryMethod: 'delivery',
    deliveryAddress: user?.address || '',
    phone: user?.phone || '',
    notes: ''
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const deliveryFee = orderData.deliveryMethod === 'delivery' ? 50 : 0;
  const total = getTotalPrice() + deliveryFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // 1️⃣ Aggregate same product quantities
      const aggregated = cartItems.reduce((acc, item) => {
        const id = item.product.id;
        if (!acc[id]) acc[id] = { ...item, quantity: 0 };
        acc[id].quantity += item.quantity;
        return acc;
      }, {});

      // 2️⃣ Validate stock levels across all aggregated items
      const overStockItem = Object.values(aggregated).find(item => {
        const stock = getProductStock(item.product.id);
        return stock === undefined || item.quantity > stock;
      });

      if (overStockItem) {
        alert(
          `Cannot place order. Item "${overStockItem.product.name}" exceeds available stock (${getProductStock(overStockItem.product.id) || 0} left).`
        );
        setIsProcessing(false);
        return; // ✅ Stop everything, nothing happens
      }

      // 3️⃣ Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4️⃣ Record sales (safe now, we know stock is sufficient)
      Object.values(aggregated).forEach(item => {
        recordSale(item.product.id, item.quantity);
      });

      // 5️⃣ Create order object
      const order = {
        id: Date.now().toString(),
        items: cartItems,
        total,
        ...orderData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        customerId: user.id,
        customerEmail: user.email,
        customerName: user.name || user.displayName || ''
      };

      // 6️⃣ Save order globally
      const existingGlobalOrders = JSON.parse(localStorage.getItem('simple-dough-orders') || '[]');
      existingGlobalOrders.push(order);
      localStorage.setItem('simple-dough-orders', JSON.stringify(existingGlobalOrders));

      // 7️⃣ Save order per user
      const userKey = `simple-dough-orders-${user.email}`;
      const existingUserOrders = JSON.parse(localStorage.getItem(userKey) || '[]');
      existingUserOrders.push(order);
      localStorage.setItem(userKey, JSON.stringify(existingUserOrders));

      // 8️⃣ Clear cart
      clearCart();

      // 9️⃣ Show success modal
      setOrderSuccess(order);
    } catch (error) {
      alert('Failed to process order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (orderSuccess) {
    return <CheckoutSuccess order={orderSuccess} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Payment Method */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderData({...orderData, paymentMethod: 'gcash'})}
                className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                  orderData.paymentMethod === 'gcash'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Smartphone className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">GCash</div>
                  <div className="text-sm text-gray-600">Pay with GCash</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setOrderData({...orderData, paymentMethod: 'cod'})}
                className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                  orderData.paymentMethod === 'cod'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <CreditCard className="w-6 h-6 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Cash on Delivery</div>
                  <div className="text-sm text-gray-600">Pay when delivered</div>
                </div>
              </button>
            </div>
          </div>

          {/* Delivery Method */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Delivery Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderData({...orderData, deliveryMethod: 'delivery'})}
                className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                  orderData.deliveryMethod === 'delivery'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <MapPin className="w-6 h-6 text-amber-600" />
                <div className="text-left">
                  <div className="font-medium">Delivery</div>
                  <div className="text-sm text-gray-600">₱50 delivery fee</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setOrderData({...orderData, deliveryMethod: 'pickup'})}
                className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                  orderData.deliveryMethod === 'pickup'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Clock className="w-6 h-6 text-purple-600" />
                <div className="text-left">
                  <div className="font-medium">Pickup</div>
                  <div className="text-sm text-gray-600">Free pickup</div>
                </div>
              </button>
            </div>
          </div>

          {/* Delivery Address */}
          {orderData.deliveryMethod === 'delivery' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address
              </label>
              <textarea
                required
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter your full delivery address..."
                value={orderData.deliveryAddress}
                onChange={(e) => setOrderData({...orderData, deliveryAddress: e.target.value})}
              />
            </div>
          )}

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Number
            </label>
            <input
              type="tel"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Enter your phone number"
              value={orderData.phone}
              onChange={(e) => setOrderData({...orderData, phone: e.target.value})}
            />
          </div>

          {/* Special Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions (Optional)
            </label>
            <textarea
              rows="2"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Any special instructions for your order..."
              value={orderData.notes}
              onChange={(e) => setOrderData({...orderData, notes: e.target.value})}
            />
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₱{getTotalPrice()}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>₱{deliveryFee}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-amber-600">₱{total}</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing Order...' : `Place Order - ₱${total}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CheckoutModal;
