import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const Header = () => {
  const { user, logout, isAdmin } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-lg border-b-4 border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">🍩</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Simple Dough</h1>
              <p className="text-xs text-gray-500">Fresh Daily Donuts</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-amber-600 font-medium transition-colors">
              Home
            </Link>
            {user && !isAdmin && (
              <>
                <Link to="/menu" className="text-gray-700 hover:text-amber-600 font-medium transition-colors">
                  Menu
                </Link>
                <Link to="/orders" className="text-gray-700 hover:text-amber-600 font-medium transition-colors">
                  My Orders
                </Link>
              </>
            )}
            {isAdmin && (
              <Link to="/admin" className="text-gray-700 hover:text-amber-600 font-medium transition-colors">
                Admin Dashboard
              </Link>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {user && !isAdmin && (
              <Link 
                to="/cart" 
                className="relative p-2 text-gray-600 hover:text-amber-600 transition-colors"
              >
                <ShoppingCart className="w-6 h-6" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="w-4 h-4" />
                  <Link to="/profile" className="hidden sm:inline text-gray-700 hover:text-amber-600">{user.name}</Link>
                  {isAdmin && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;