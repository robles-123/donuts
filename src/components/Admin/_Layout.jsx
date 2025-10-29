// src/Dashboard/_Layout.jsx
import React from "react";
import Header from "../components/Layout/Header";

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6">
        {children} {/* THIS is crucial */}
      </main>
    </div>
  );
};

export default DashboardLayout;
