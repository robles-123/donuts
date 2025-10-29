import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';

const ProductModal = ({ product, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedToppings, setSelectedToppings] = useState({
    classic: '',
    premium: ''
  });

  const [flavorsAvailability, setFlavorsAvailability] = useState([]);
  const [toppingsAvailability, setToppingsAvailability] = useState({ classic: [], premium: [] });

  const { addToCart } = useCart();
  const { getProductStock, isProductAvailable } = useInventory();
  const { user } = useAuth();

  const stock = getProductStock(product.id);
  const maxQuantity = Math.min(10, stock);

  useEffect(() => {
    const savedFlavors = localStorage.getItem('flavors');
    const savedToppings = localStorage.getItem('toppings');

    if (savedFlavors) setFlavorsAvailability(JSON.parse(savedFlavors));
    if (savedToppings) setToppingsAvailability(JSON.parse(savedToppings));
  }, []);

  const handleFlavorToggle = (flavor) => {
    if (selectedFlavors.includes(flavor)) {
      setSelectedFlavors(selectedFlavors.filter(f => f !== flavor));
    } else if (selectedFlavors.length < product.maxFlavors) {
      setSelectedFlavors([...selectedFlavors, flavor]);
    }
  };

  const handleAddToCart = () => {
    if (!isProductAvailable(product.id, quantity)) {
      alert('Not enough stock available');
      return;
    }

    const customizations = {
      quantity,
      flavors: selectedFlavors,
      toppings: selectedToppings
    };

    // Validate customizations
    if (product.customizable) {
      if (product.flavors && selectedFlavors.length === 0) {
        alert('Please select at least one flavor');
        return;
      }
      if (product.toppings && (!selectedToppings.classic || !selectedToppings.premium)) {
        alert('Please select both classic and premium toppings');
        return;
      }
    }

    addToCart(product, customizations);
    onClose();
  };

  // Reviews: save locally to localStorage under 'simple-dough-reviews'
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState([]);

  // Load existing reviews when modal opens
  useEffect(() => {
    const allReviews = JSON.parse(localStorage.getItem('simple-dough-reviews') || '[]');
    const productReviews = allReviews.filter(r => r.productId === product.id.toString() || r.productId === product.id);
    setReviews(productReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }, [product.id]);

  const saveReview = () => {
    const reviews = JSON.parse(localStorage.getItem('simple-dough-reviews') || '[]');
    const newReview = {
      id: Date.now().toString(),
      productId: product.id,
      userId: user?.id || null,
      name: user?.name || 'Anonymous',
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };

    reviews.push(newReview);
    localStorage.setItem('simple-dough-reviews', JSON.stringify(reviews));
    
    // Reset form and update reviews list
    setRating(5);
    setComment('');
    setReviews(prev => [newReview, ...prev]); // Add new review to top of list
    alert('Thanks — your review was saved.');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Product Image */}
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-48 object-cover rounded-lg"
          />

          {/* Product Info */}
          <div>
            <p className="text-gray-600 mb-4">{product.description}</p>
            <div className="flex items-center justify-between text-lg">
              <span className="font-semibold">Price:</span>
              <span className="text-2xl font-bold text-amber-600">₱{product.price}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
              <span>Quantity per order:</span>
              <span>{product.quantity} pieces</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
              <span>Stock available:</span>
              <span className={stock > 5 ? 'text-green-600' : 'text-red-600'}>
                {stock} left
              </span>
            </div>
          </div>

          {/* Quantity Selection */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Quantity</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xl font-semibold px-4">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 ml-2">
                (Max: {maxQuantity})
              </span>
            </div>
          </div>

          {/* Flavor Selection */}
          {product.flavors && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Choose Flavors (Max {product.maxFlavors})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {product.flavors.map(flavor => {
                  const flavorObj = flavorsAvailability.find(f => f.name === flavor);
                  const isAvailable = flavorObj?.available ?? true;

                  return (
                    <button
                      key={flavor}
                      onClick={() => handleFlavorToggle(flavor)}
                      disabled={!isAvailable}
                      className={`p-3 text-sm rounded-lg border-2 transition-all relative ${
                        selectedFlavors.includes(flavor)
                          ? 'border-amber-500 bg-amber-50 text-amber-800'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${!isAvailable ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''}`}
                    >
                      {flavor}
                      {!isAvailable && (
                        <span className="absolute top-1 right-1 bg-white px-1 rounded text-xs text-red-600 font-bold z-10">
                          Out of Stock
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Selected: {selectedFlavors.length}/{product.maxFlavors}
              </p>
            </div>
          )}

          {/* Toppings Selection */}
          {product.toppings && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Classic Toppings (Choose 1)</h3>
                <div className="grid grid-cols-1 gap-2">
                  {product.toppings.classic.map(topping => {
                    const toppingObj = toppingsAvailability.classic.find(t => t.name === topping);
                    const isAvailable = toppingObj?.available ?? true;

                    return (
                      <button
                        key={topping}
                        onClick={() => setSelectedToppings({...selectedToppings, classic: topping})}
                        disabled={!isAvailable}
                        className={`p-3 text-sm rounded-lg border-2 transition-all text-left ${
                          selectedToppings.classic === topping
                            ? 'border-blue-500 bg-blue-50 text-blue-800'
                            : 'border-gray-300 hover:border-gray-400'
                        } ${!isAvailable ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''} relative`}
                      >
                        {topping}
                        {!isAvailable && (
                          <span className="absolute top-1 right-1 text-xs text-red-600 font-bold">Out of Stock</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Premium Toppings (Choose 1)</h3>
                <div className="grid grid-cols-1 gap-2">
                  {product.toppings.premium.map(topping => {
                    const toppingObj = toppingsAvailability.premium.find(t => t.name === topping);
                    const isAvailable = toppingObj?.available ?? true;

                    return (
                      <button
                        key={topping}
                        onClick={() => setSelectedToppings({...selectedToppings, premium: topping})}
                        disabled={!isAvailable}
                        className={`p-3 text-sm rounded-lg border-2 transition-all text-left ${
                          selectedToppings.premium === topping
                            ? 'border-purple-500 bg-purple-50 text-purple-800'
                            : 'border-gray-300 hover:border-gray-400'
                        } ${!isAvailable ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : ''} relative`}
                      >
                        {topping}
                        {!isAvailable && (
                          <span className="absolute top-1 right-1 text-xs text-red-600 font-bold">Out of Stock</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total:</span>
              <span className="text-amber-600">₱{product.price * quantity}</span>
            </div>
          </div>

          {/* Reviews (rating + comment) */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Leave a review</h3>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Rating</label>
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="px-3 py-2 border rounded-lg"
              >
                <option value={5}>5 - Excellent</option>
                <option value={4}>4 - Very good</option>
                <option value={3}>3 - Good</option>
                <option value={2}>2 - Fair</option>
                <option value={1}>1 - Poor</option>
              </select>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write an optional comment (max 500 chars)"
              maxLength={500}
              className="w-full p-3 border rounded-lg text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={saveReview}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Submit Review
              </button>
              <button
                onClick={() => { setRating(5); setComment(''); }}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!isProductAvailable(product.id, quantity)}
            className={`w-full py-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              isProductAvailable(product.id, quantity)
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            Add to Cart
          </button>

          {/* Reviews List */}
          {reviews.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="font-semibold text-gray-900">Customer Reviews ({reviews.length})</h3>
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.name}</span>
                        <span className="text-amber-500">{'★'.repeat(review.rating)}</span>
                        <span className="text-gray-400">{'☆'.repeat(5 - review.rating)}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-gray-600 text-sm">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
