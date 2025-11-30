import React, { createContext, useContext, useState, useEffect } from 'react';
import { PRODUCTS } from '../data/products';

const InventoryContext = createContext();

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

export const InventoryProvider = ({ children }) => {
  const [inventory, setInventory] = useState({});

  useEffect(() => {
    const savedInventory = localStorage.getItem('simple-dough-inventory');
    if (savedInventory && savedInventory !== "{}") {
      setInventory(JSON.parse(savedInventory));
    } else if (Object.keys(inventory).length === 0) {
      const initialInventory = {};
      PRODUCTS.forEach(product => {
        const isPartySet = product.name.toLowerCase().includes('party');
        const defaultLimit = isPartySet ? 10 : 20;
        initialInventory[product.id] = {
          dailyLimit: defaultLimit,
          currentStock: defaultLimit,
          soldToday: 0
        };
      });
      setInventory(initialInventory);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(inventory).length > 0) {
      localStorage.setItem('simple-dough-inventory', JSON.stringify(inventory));
    }
  }, [inventory]);

  // Listen for storage changes from other tabs/windows or admin updates
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'simple-dough-inventory' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          setInventory(updated);
        } catch (err) {
          console.error('Failed to parse inventory update', err);
        }
      }
    };

    // Add storage listener for cross-tab updates
    window.addEventListener('storage', handleStorageChange);

    // Also poll localStorage periodically to catch same-tab updates (admin and customer on same tab)
    const pollInterval = setInterval(() => {
      const savedInventory = localStorage.getItem('simple-dough-inventory');
      if (savedInventory && savedInventory !== "{}") {
        try {
          const parsed = JSON.parse(savedInventory);
          // Only update if different from current state
          if (JSON.stringify(parsed) !== JSON.stringify(inventory)) {
            setInventory(parsed);
          }
        } catch (err) {
          console.error('Failed to parse inventory from localStorage', err);
        }
      }
    }, 500); // Poll every 500ms for real-time updates

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [inventory]);

  const updateDailyLimit = (productId, limit) => {
    setInventory(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        dailyLimit: limit,
        currentStock: Math.max(0, limit - (prev[productId]?.soldToday || 0))
      }
    }));
  };

  // Adjust current stock by a delta (positive to add, negative to deduct)
  const adjustStock = (productId, delta) => {
    setInventory(prev => {
      const item = prev[productId] || { dailyLimit: 0, currentStock: 0, soldToday: 0 };
      const newStock = Math.max(0, Math.min(item.dailyLimit, (item.currentStock || 0) + delta));
      return {
        ...prev,
        [productId]: {
          ...item,
          currentStock: newStock
        }
      };
    });
  };

  const recordSale = (productId, quantity) => {
    setInventory(prev => {
      const prevStock = prev[productId]?.currentStock || 0;
      const prevSold = prev[productId]?.soldToday || 0;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          currentStock: Math.max(0, prevStock - quantity),
          soldToday: prevSold + quantity
        }
      };
    });
  };

  const revertStock = (productId, quantity) => {
  setInventory(prev => {
    const prevStock = prev[productId]?.currentStock || 0;
    const prevSold = prev[productId]?.soldToday || 0;
    return {
      ...prev,
      [productId]: {
        ...prev[productId],
        currentStock: prevStock + quantity,
        soldToday: Math.max(0, prevSold - quantity)
      }
    };
  });
};

  // resetDailyInventory removed — resets handled locally via updateDailyLimit/recordSale/revertStock

  const getProductStock = (productId) => {
    return inventory[productId]?.currentStock || 0;
  };

  const isProductAvailable = (productId, requestedQuantity = 1) => {
    const stock = getProductStock(productId);
    return stock >= requestedQuantity;
  };

  const getLowStockProducts = () => {
    return Object.entries(inventory)
      .filter(([_, data]) => (data.currentStock / data.dailyLimit) <= 0.2)
      .map(([productId]) => productId);
  };

  const value = {
    inventory,
    updateDailyLimit,
    adjustStock,
    recordSale,
    revertStock, 
    // resetDailyInventory removed
    getProductStock,
    isProductAvailable,
    getLowStockProducts
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
