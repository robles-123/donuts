// src/components/Layout/DashboardTabs.jsx
import React from "react";
import { BarChart3, Package, ShoppingCart, TrendingUp } from "lucide-react";

export const DashboardTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "dashboard", name: "Dashboard", icon: BarChart3 },
    { id: "inventory", name: "Manage Inventory", icon: Package },
    { id: "orders", name: "View All Orders", icon: ShoppingCart },
    { id: "reports", name: "Generate Reports", icon: TrendingUp },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <nav className="border-b border-gray-200">
        <div className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-[13.5px] ${
                  activeTab === tab.id
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
