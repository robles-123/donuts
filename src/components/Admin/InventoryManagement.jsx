import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, Edit3, Save, X, Plus, Minus } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { PRODUCTS } from '../../data/products';

const InventoryManagement = () => {
  const { inventory, updateDailyLimit, getLowStockProducts, revertStock  } = useInventory();

  // Helper to revert multiple items at once
const revertMultipleItems = (items) => {
  items.forEach(item => revertStock(item.product.id, item.quantity));
};

  const [editingProduct, setEditingProduct] = useState(null);
  const [newLimit, setNewLimit] = useState('');
  const [flavors, setFlavors] = useState([]);
  const [toppings, setToppings] = useState({ classic: [], premium: [] });

  useEffect(() => {
    const savedFlavors = localStorage.getItem('flavors');
    const savedToppings = localStorage.getItem('toppings');

    if (savedFlavors) {
      setFlavors(JSON.parse(savedFlavors));
    } else {
      const defaults = ['Chocolate', 'Strawberry', 'Matcha', 'Glaze', 'White Chocolate'].map((name, i) => ({
        id: i + 1,
        name,
        available: true,
      }));
      setFlavors(defaults);
      localStorage.setItem('flavors', JSON.stringify(defaults));
    }

    if (savedToppings) {
      setToppings(JSON.parse(savedToppings));
    } else {
      const defaultToppings = {
        classic: ['Sprinkles', 'Mallows', 'Crushed Oreo'].map((name, i) => ({
          id: `c${i + 1}`,
          name,
          available: true,
        })),
        premium: ['Almonds', 'Choco Sprinkles', 'Choco Chips', 'Bear Biscuits', 'Mini Oreo', 'White Choco Chips'].map(
          (name, i) => ({
            id: `p${i + 1}`,
            name,
            available: true,
          })
        ),
      };
      setToppings(defaultToppings);
      localStorage.setItem('toppings', JSON.stringify(defaultToppings));
    }
  }, []);

  const toggleFlavorAvailability = (id) => {
    const updated = flavors.map((f) => (f.id === id ? { ...f, available: !f.available } : f));
    setFlavors(updated);
    localStorage.setItem('flavors', JSON.stringify(updated));
  };

  const toggleToppingAvailability = (type, id) => {
    const updated = {
      ...toppings,
      [type]: toppings[type].map((t) => (t.id === id ? { ...t, available: !t.available } : t)),
    };
    setToppings(updated);
    localStorage.setItem('toppings', JSON.stringify(updated));
  };

  const handleEditLimit = (productId, currentLimit) => {
    setEditingProduct(productId);
    setNewLimit(currentLimit.toString());
  };

  const handleSaveLimit = (productId) => {
    const limit = parseInt(newLimit);
    if (limit > 0) {
      updateDailyLimit(productId, limit);
    }
    setEditingProduct(null);
    setNewLimit('');
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setNewLimit('');
  };

  const lowStockProducts = getLowStockProducts();

  const getStockStatus = (productId) => {
    const stock = inventory[productId];
    if (!stock) return 'unknown';
    if (stock.currentStock <= 0) return 'out'; 
    const percentage = (stock.currentStock / stock.dailyLimit) * 100;
    if (percentage <= 20) return 'critical';
    if (percentage <= 50) return 'low';
    return 'good';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Management</h1>
          <p className="text-gray-600">Manage daily stock limits and monitor inventory levels</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          {/* Reset Daily Stock button removed by request */}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Low Stock Alerts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockProducts.map((productId) => {
              const product = PRODUCTS.find((p) => p.id === productId);
              const stock = inventory[productId];
              return (
                <div key={productId} className="bg-white rounded-lg p-4 border border-red-200">
                  <h3 className="font-semibold text-gray-900">{product?.name}</h3>
                  <p className="text-red-600 font-bold">{stock?.currentStock} remaining</p>
                  <p className="text-sm text-gray-600">Daily limit: {stock?.dailyLimit}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inventory Grid + Flavors/Toppings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {PRODUCTS.map((product) => {
          const stock = inventory[product.id];
          const status = getStockStatus(product.id);
          const isEditing = editingProduct === product.id;

          return (
            <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
              <div className="relative h-48">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    status === 'critical'
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : status === 'low'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      : status === 'good'
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-gray-100 text-gray-800 border-gray-200'
                  }`}>
                    {status === 'critical'
                      ? 'Critical'
                      : status === 'low'
                      ? 'Low Stock'
                      : status === 'good'
                      ? 'In Stock'
                      : 'Out of Stock'}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{product.description}</p>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Current Stock:</span>
                    <span className="text-lg font-bold text-gray-900">{stock?.currentStock || 0}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Sold Today:</span>
                    <span className="text-sm text-gray-600">{stock?.soldToday || 0}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Daily Limit:</span>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={newLimit}
                          onChange={(e) => setNewLimit(e.target.value)}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                        <button onClick={() => handleSaveLimit(product.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={handleCancelEdit} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{stock?.dailyLimit || 0}</span>
                        <button
                          onClick={() => handleEditLimit(product.id, stock?.dailyLimit || 0)}
                          className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Stock Level</span>
                    <span>{Math.round(((stock?.currentStock || 0) / (stock?.dailyLimit || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        status === 'critical' ? 'bg-red-500' : status === 'low' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(100, ((stock?.currentStock || 0) / (stock?.dailyLimit || 1)) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => updateDailyLimit(product.id, (stock?.dailyLimit || 0) + 10)}
                    className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    +10
                  </button>
                  <button
                    onClick={() => updateDailyLimit(product.id, Math.max(0, (stock?.dailyLimit || 0) - 10))}
                    className="flex-1 bg-red-100 text-red-700 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    <Minus className="w-4 h-4 inline mr-1" />
                    -10
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Flavors & Toppings Panel */}
        <div className="bg-white rounded-xl shadow-lg p-6 xl:col-span-2 flex gap-6">
          {/* Toppings Column */}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Toppings</h3>

            <p className="text-sm font-semibold text-gray-700 mt-2 mb-1">Classic</p>
            <div className="space-y-2">
              {toppings.classic.map((topping) => (
                <div key={topping.id} className="flex justify-between items-center border-b pb-1 last:border-none">
                  <span className="text-gray-700">{topping.name}</span>
                  <button
                    onClick={() => toggleToppingAvailability('classic', topping.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      topping.available
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {topping.available ? 'Available' : 'Unavailable'}
                  </button>
                </div>
              ))}
            </div>

            <p className="text-sm font-semibold text-gray-700 mt-4 mb-1">Premium</p>
            <div className="space-y-2">
              {toppings.premium.map((topping) => (
                <div key={topping.id} className="flex justify-between items-center border-b pb-1 last:border-none">
                  <span className="text-gray-700">{topping.name}</span>
                  <button
                    onClick={() => toggleToppingAvailability('premium', topping.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      topping.available
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {topping.available ? 'Available' : 'Unavailable'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Flavors Column */}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Flavors</h3>
            <div className="space-y-2">
              {flavors.map((flavor) => (
                <div key={flavor.id} className="flex justify-between items-center border-b pb-1 last:border-none">
                  <span className="text-gray-700">{flavor.name}</span>
                  <button
                    onClick={() => toggleFlavorAvailability(flavor.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      flavor.available
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {flavor.available ? 'Available' : 'Unavailable'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Products</p>
              <p className="text-3xl font-bold">{PRODUCTS.length}</p>
            </div>
            <Package className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">In Stock</p>
              <p className="text-3xl font-bold">
              {PRODUCTS.filter((p) => {
                const stock = inventory[p.id];
                return stock && stock.currentStock > 0;
              }).length}
            </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100">Low Stock</p>
              <p className="text-3xl font-bold">{lowStockProducts.length}</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;
