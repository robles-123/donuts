import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../context/InventoryContext';
import CheckoutModal from './CheckoutModal';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, getTotalItems } = useCart();
  const { inventory, getProductStock } = useInventory();
  const { user } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const navigate = useNavigate();

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <div className="text-8xl mb-6">🛒</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">
            Looks like you haven't added any delicious donuts to your cart yet.
          </p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-all"
          >
            <ShoppingBag className="w-5 h-5" />
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  const handleIncrement = (item) => {
    const availableStock = getProductStock(item.product.id);
    if (item.quantity < availableStock) {
      updateQuantity(item.id, item.quantity + 1);
    } else {
      alert(`Cannot exceed available stock (${availableStock}) for ${item.product.name}`);
    }
  };

  const handleDecrement = (item) => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/menu')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-600">{getTotalItems()} items in your cart</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map(item => {
            const customizations = item.customizations || {};
            const quantity = item.quantity || 1;
            const unitPrice = item.product?.price || 0;
            const totalPrice = item.totalPrice ?? unitPrice * quantity;

            return (
              <div key={item.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Product Image */}
                  <img
                    src={item.product?.image}
                    alt={item.product?.name}
                    className="w-full sm:w-24 h-24 object-cover rounded-lg"
                  />

                  {/* Product Details */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {item.product?.name}
                    </h3>

                    {/* Customizations */}
                    {customizations.flavors && customizations.flavors.length > 0 && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Flavors:</span> {customizations.flavors.join(', ')}
                      </p>
                    )}
                    {customizations.toppings && (
                      <div className="text-sm text-gray-600 mb-1">
                        {customizations.toppings.classic && (
                          <p><span className="font-medium">Classic:</span> {customizations.toppings.classic}</p>
                        )}
                        {customizations.toppings.premium && (
                          <p><span className="font-medium">Premium:</span> {customizations.toppings.premium}</p>
                        )}
                      </div>
                    )}

                    <p className="text-amber-600 font-semibold text-lg">
                      ₱{unitPrice} × {quantity} = ₱{totalPrice}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleDecrement(item)}
                        className="p-2 hover:bg-gray-100 rounded-l-lg"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-3 py-2 font-semibold">{quantity}</span>
                      <button
                        onClick={() => handleIncrement(item)}
                        className="p-2 hover:bg-gray-100 rounded-r-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Subtotal ({getTotalItems()} items)</span>
                <span>₱{getTotalPrice()}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>₱50</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-amber-600">₱{getTotalPrice() + 50}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-all transform hover:scale-105"
            >
              Proceed to Checkout
            </button>

            <Link
              to="/menu"
              className="block w-full text-center text-amber-600 py-3 mt-3 border border-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal onClose={() => setShowCheckout(false)} />
      )}
    </div>
  );
};

export default Cart;
