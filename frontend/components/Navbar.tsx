'use client';

/**
 * Navbar component: main navigation bar.
 * 
 * Provides:
 * - Links to main pages
 * - User info
 * - Logout functionality
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const router = useRouter();

  const handleLogout = () => {
    // Open access mode - just clear token if present
    localStorage.removeItem('access_token');
    // Refresh page to use default user
    window.location.reload();
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-lg group-hover:shadow-glow transition-shadow">
                  <span className="text-white font-bold text-lg">$</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  FinanceTrack
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
              >
                📊 Dashboard
              </Link>
              <Link
                href="/transactions"
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
              >
                💳 Transactions
              </Link>
              <Link
                href="/insights"
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
              >
                📈 Insights
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

