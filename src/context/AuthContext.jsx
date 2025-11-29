import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderHistory, setOrderHistory] = useState([]); // ✅ Added order history state

  // Helper to check if user is admin in database
  const checkIsAdmin = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.warn('Error checking admin role:', error);
        return false;
      }
      return !!data;
    } catch (err) {
      console.warn('Error checking admin role:', err);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user ?? null;

        if (sessionUser && mounted) {
          const isAdmin = await checkIsAdmin(sessionUser.id);

          const profile = {
            id: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.user_metadata?.name || sessionUser.email,
            role: isAdmin ? 'admin' : (sessionUser.user_metadata?.role || 'customer'),
            phone: sessionUser.user_metadata?.phone || '',
            address: sessionUser.user_metadata?.address || '',
          };

          setUser(profile);

          // Load order history from localStorage (keeps existing behavior)
          const allOrders = JSON.parse(localStorage.getItem('simple-dough-orders')) || [];
          const userOrders = allOrders.filter((order) => order.userId === profile.id);
          setOrderHistory(userOrders);
        }
      } catch (err) {
        console.warn('Failed to get supabase session', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;

      if (!sessionUser) {
        setUser(null);
        setOrderHistory([]);
      } else {
        (async () => {
          const isAdmin = await checkIsAdmin(sessionUser.id);
          const profile = {
            id: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.user_metadata?.name || sessionUser.email,
            role: isAdmin ? 'admin' : (sessionUser.user_metadata?.role || 'customer'),
            phone: sessionUser.user_metadata?.phone || '',
            address: sessionUser.user_metadata?.address || '',
          };
          if (mounted) setUser(profile);
          const allOrders = JSON.parse(localStorage.getItem('simple-dough-orders')) || [];
          const userOrders = allOrders.filter((order) => order.userId === profile.id);
          if (mounted) setOrderHistory(userOrders);
        })();
      }
    });

    return () => {
      mounted = false;
      try {
        listener?.subscription?.unsubscribe?.();
      } catch (err) {
        // ignore
      }
    };
  }, []);

  // ✅ Register a new user
  const register = async (userData) => {
    const { name, email, phone, address, password } = userData;

    // Build user metadata to store in Supabase
    const userMeta = {
      name,
      phone,
      address,
      role: 'customer',
    };

    // Use the v2 signUp payload shape: pass all params in a single object
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: userMeta },
    });

    if (error) throw error;

    const sessionUser = data?.user ?? null;
    if (sessionUser) {
      const profile = {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || name || sessionUser.email,
        role: sessionUser.user_metadata?.role || 'customer',
        phone: sessionUser.user_metadata?.phone || phone || '',
        address: sessionUser.user_metadata?.address || address || '',
      };
      setUser(profile);
      return profile;
    }

    return null;
  };

  // ✅ Login existing user
  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const sessionUser = data?.user ?? null;
    if (sessionUser) {
      const profile = {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || sessionUser.email,
        role: sessionUser.user_metadata?.role || 'customer',
        phone: sessionUser.user_metadata?.phone || '',
        address: sessionUser.user_metadata?.address || '',
      };
      setUser(profile);

      const allOrders = JSON.parse(localStorage.getItem('simple-dough-orders')) || [];
      const userOrders = allOrders.filter((order) => order.userId === profile.id);
      setOrderHistory(userOrders);
      return profile;
    }

    throw new Error('Login failed');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrderHistory([]);
    localStorage.removeItem('simple-dough-cart');
  };

  // ✅ Save new order for this user — persist to Supabase `orders` table with fallback to localStorage
  const addOrder = async (orderData) => {
    if (!user) throw new Error('You must be logged in to place an order.');

    const timestamp = new Date().toISOString();

    // Prepare record for Supabase. Column names should match your `orders` table.
    const orderRecord = {
      user_id: user.id,
      email: user.email,
      items: orderData.items || orderData.cart || [],
      total: orderData.total ?? orderData.amount ?? 0,
      status: orderData.status || 'pending',
      metadata: orderData.metadata || {},
      created_at: timestamp,
    };

    try {
      const { data, error } = await supabase.from('orders').insert([orderRecord]).select();
      if (error) throw error;

      const inserted = data?.[0];

      // Normalize newOrder for local state (use inserted.id if available)
      const newOrder = {
        id: inserted?.id || Date.now().toString(),
        userId: user.id,
        email: user.email,
        customerEmail: user.email,
        items: orderRecord.items,
        total: orderRecord.total,
        status: orderRecord.status,
        metadata: orderRecord.metadata,
        // compatibility for CheckoutSuccess / OrderHistory
        phone: orderRecord.metadata?.phone || user.phone || '',
        deliveryAddress: orderRecord.metadata?.deliveryAddress || orderRecord.metadata?.delivery_address || '',
        paymentMethod: orderRecord.metadata?.paymentMethod || orderRecord.metadata?.payment_method || '',
        deliveryMethod: orderRecord.metadata?.deliveryMethod || orderRecord.metadata?.delivery_method || '',
        notes: orderRecord.metadata?.notes || '',
        createdAt: inserted?.created_at || timestamp,
      };

      // Update local state
      setOrderHistory((prev) => [...prev, newOrder]);

      // Optionally keep a local cache for offline use (global)
      const allOrders = JSON.parse(localStorage.getItem('simple-dough-orders')) || [];
      allOrders.push(newOrder);
      localStorage.setItem('simple-dough-orders', JSON.stringify(allOrders));

      // Also write a user-specific key so OrderHistory/CheckoutSuccess can read it immediately
      try {
        const userKey = `simple-dough-orders-${user.email}`;
        const existingUserOrders = JSON.parse(localStorage.getItem(userKey) || '[]');
        existingUserOrders.push(newOrder);
        localStorage.setItem(userKey, JSON.stringify(existingUserOrders));
      } catch (e) {
        console.warn('Failed to write user-specific order cache', e);
      }

      // Debug log for developer visibility
      console.debug('Saved order locally', { newOrder, globalCount: allOrders.length });

      return newOrder;
    } catch (err) {
      console.warn('Failed to persist order to Supabase, falling back to localStorage', err);

      // Fallback: save to localStorage like original behavior
      const allOrders = JSON.parse(localStorage.getItem('simple-dough-orders')) || [];
      const newOrder = {
        ...orderData,
        id: Date.now().toString(),
        userId: user.id,
        email: user.email,
        customerEmail: user.email,
        phone: orderData.metadata?.phone || user.phone || '',
        deliveryAddress: orderData.metadata?.deliveryAddress || orderData.metadata?.delivery_address || '',
        paymentMethod: orderData.metadata?.paymentMethod || orderData.metadata?.payment_method || '',
        deliveryMethod: orderData.metadata?.deliveryMethod || orderData.metadata?.delivery_method || '',
        notes: orderData.metadata?.notes || '',
        createdAt: timestamp,
      };

      allOrders.push(newOrder);
      localStorage.setItem('simple-dough-orders', JSON.stringify(allOrders));
      // Also write a user-specific key
      try {
        const userKey = `simple-dough-orders-${user.email}`;
        const existingUserOrders = JSON.parse(localStorage.getItem(userKey) || '[]');
        existingUserOrders.push(newOrder);
        localStorage.setItem(userKey, JSON.stringify(existingUserOrders));
      } catch (e) {
        console.warn('Failed to write user-specific order cache (fallback)', e);
      }
      setOrderHistory((prev) => [...prev, newOrder]);

      console.debug('Saved order to local fallback', { newOrder, globalCount: allOrders.length });

      return newOrder;
    }
  };

  // ✅ Update the currently logged in user's profile
  const updateProfile = async (updates) => {
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase.auth.updateUser({ data: updates });
    if (error) throw error;

    const sessionUser = data?.user ?? null;
    if (sessionUser) {
      const profile = {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || sessionUser.email,
        role: sessionUser.user_metadata?.role || 'customer',
        phone: sessionUser.user_metadata?.phone || '',
        address: sessionUser.user_metadata?.address || '',
      };
      setUser(profile);
      return profile;
    }

    return null;
  };

  // ✅ Verify current password before allowing email/password changes
  const verifyCurrentPassword = async (currentPassword) => {
    if (!user) throw new Error('No user logged in');

    // Re-authenticate by attempting sign in. If it succeeds, password is valid.
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (error) throw error;
      return !!data?.user;
    } catch (err) {
      return false;
    }
  };

  const value = {
    user,
    login,
    logout,
    register,
    updateProfile,
    loading,
    orderHistory, // ✅ expose order history
    addOrder, // ✅ expose function to add order
    isAdmin: user?.role === 'admin',
    isCustomer: user?.role === 'customer',
    verifyCurrentPassword, // ✅ added for current password verification
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
