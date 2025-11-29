import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext'; // 👈 make sure this import matches your structure
import { supabase } from '../lib/supabaseClient';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth(); // ✅ Get the logged-in user
  const [cartItems, setCartItems] = useState([]);

  // Helper: get key based on user
  const getStorageKey = () => {
    return user?.email
      ? `simple-dough-cart-${user.email}`
      : 'simple-dough-cart-guest';
  };

  // Load cart for current user
  useEffect(() => {
    const savedCart = localStorage.getItem(getStorageKey());
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    } else {
      setCartItems([]); // reset if no saved cart
    }
  }, [user]); // 👈 when user changes (login/logout), reload their cart

  // Save cart for that user
  useEffect(() => {
    localStorage.setItem(getStorageKey(), JSON.stringify(cartItems));
  }, [cartItems, user]);

  // Sync cart to Supabase for authenticated users
  useEffect(() => {
    if (!user) {
      console.log('[CartContext] No user logged in, skipping sync');
      return;
    }

    console.log('[CartContext] Syncing for user:', user.id, user.email);

    let mounted = true;

    const syncCart = async () => {
      try {
        // First, verify session is valid
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('[CartContext] Current session:', sessionData?.session?.user?.id);

        if (!sessionData?.session) {
          console.warn('[CartContext] No active session, cannot sync');
          return;
        }

        // Remove existing cart items for this user, then insert current ones
        console.log('[CartContext] Deleting old cart_items for user:', user.id);
        const { error: delError, count } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        console.log('[CartContext] Delete result:', { error: delError, count });

        if (delError) {
          console.warn('[CartContext] Failed to delete old cart_items:', delError.message || delError);
        }

        if (!cartItems || cartItems.length === 0) {
          console.log('[CartContext] Cart is empty, nothing to insert');
          return;
        }

        const rows = cartItems.map(item => ({
          user_id: user.id,
          product_id: item.productId || item.product?.id,
          quantity: item.quantity || 1,
          customizations: item.customizations || {}
        }));

        console.log('[CartContext] Inserting rows:', rows);

        const { error: insertError, data: insertedData } = await supabase
          .from('cart_items')
          .insert(rows);

        if (insertError) {
          console.error('[CartContext] Failed to insert cart_items to Supabase:', insertError.message || insertError);
        } else {
          console.log('[CartContext] ✅ Synced cart to Supabase', rows.length, 'rows', insertedData);
        }
      } catch (e) {
        console.error('[CartContext] Unexpected error syncing cart to Supabase', e);
      }
    };

    syncCart();

    return () => { mounted = false; };
  }, [cartItems, user]);

  const addToCart = (product, customizations = {}) => {
    const cartItem = {
      id: Date.now().toString(),
      productId: product.id,
      product,
      quantity: customizations.quantity || 1,
      customizations,
      totalPrice: product.price * (customizations.quantity || 1)
    };

    setCartItems(prev => [...prev, cartItem]);
  };

  const removeFromCart = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, quantity, totalPrice: item.product.price * quantity }
        : item
    ));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      const unit = item.product?.price || 0;
      const qty = item.quantity || 1;
      const itemTotal = item.totalPrice ?? unit * qty;
      return total + itemTotal;
    }, 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + (item.quantity || 1), 0);
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
