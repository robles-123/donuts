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

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user ?? null;

        if (sessionUser && mounted) {
          const profile = {
            id: sessionUser.id,
            email: sessionUser.email,
            name: sessionUser.user_metadata?.name || sessionUser.email,
            role: sessionUser.user_metadata?.role || 'customer',
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

    const options = {
      data: {
        name,
        phone,
        address,
        role: 'customer',
      },
    };

    const { data, error } = await supabase.auth.signUp({ email, password }, options);
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

  // ✅ Save new order for this user
  const addOrder = (orderData) => {
    if (!user) throw new Error('You must be logged in to place an order.');

    const allOrders = JSON.parse(localStorage.getItem('simple-dough-orders')) || [];
    const newOrder = {
      ...orderData,
      id: Date.now().toString(),
      userId: user.id,
      email: user.email,
      createdAt: new Date().toISOString(),
    };

    allOrders.push(newOrder);
    localStorage.setItem('simple-dough-orders', JSON.stringify(allOrders));

    // Update local state
    setOrderHistory((prev) => [...prev, newOrder]);
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
