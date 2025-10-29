import React, { useState } from 'react';
import { Plus, Heart, Info } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useInventory } from '../../context/InventoryContext';
import ProductModal from './ProductModal';
import { useEffect } from 'react';

const ProductCard = ({ product }) => {
  const [showModal, setShowModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const { addToCart } = useCart();
  const { getProductStock, isProductAvailable } = useInventory();

  // Reviews: compute average rating and count
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const reviews = JSON.parse(localStorage.getItem('simple-dough-reviews') || '[]');
    const productReviews = reviews.filter(r => r.productId === product.id.toString() || r.productId === product.id);
    const count = productReviews.length;
    const avg = count > 0 ? (productReviews.reduce((s, r) => s + (r.rating || 0), 0) / count) : 0;
    setAvgRating(Number(avg.toFixed(1)));
    setReviewCount(count);
  }, [product.id]);

  const stock = getProductStock(product.id);
  const available = isProductAvailable(product.id);

  const handleQuickAdd = () => {
    if (product.customizable) {
      setShowModal(true);
    } else {
      addToCart(product, { quantity: 1 });
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'party': return 'bg-purple-100 text-purple-800';
      case 'messy': return 'bg-pink-100 text-pink-800';
      case 'mini': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'party': return '🎉';
      case 'messy': return '🤤';
      case 'mini': return '✨';
      default: return '🍩';
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        {/* Image */}
        <div className="relative">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-48 object-cover"
          />
          
          {/* Stock indicator */}
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {available ? `${stock} left` : 'Out of stock'}
            </span>
          </div>

          {/* Category badge */}
          <div className="absolute top-3 right-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(product.category)}`}>
              {getCategoryEmoji(product.category)} {product.category}
            </span>
          </div>

          {/* Like button */}
          <button
            onClick={() => setLiked(!liked)}
            className="absolute bottom-3 right-3 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Heart 
              className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-sm text-amber-600 font-semibold">{avgRating > 0 ? `${avgRating} ★` : 'No rating'}</div>
            <div className="text-xs text-gray-500">{reviewCount} reviews</div>
          </div>
          <p className="text-gray-600 text-sm mb-4">{product.description}</p>
          
          {/* Price */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl font-bold text-amber-600">
              ₱{product.price}
            </div>
            <div className="text-sm text-gray-500">
              {product.quantity} pieces
            </div>
          </div>

          {/* Customization info */}
          {product.customizable && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-800 font-medium mb-1">Customizable:</p>
              {product.flavors && (
                <p className="text-xs text-amber-700">
                  {product.maxFlavors} flavors max
                </p>
              )}
              {product.toppings && (
                <p className="text-xs text-amber-700">
                  Classic & Premium toppings available
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleQuickAdd}
              disabled={!available}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                available
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-5 h-5" />
              {product.customizable ? 'Customize' : 'Add to Cart'}
            </button>
            
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <ProductModal 
          product={product} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
};

export default ProductCard;