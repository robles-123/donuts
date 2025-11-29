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
