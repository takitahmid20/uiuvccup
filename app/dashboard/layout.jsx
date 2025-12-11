'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useState } from 'react';

export default function DashboardLayout({ children }) {
  const { logout, currentUser } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D13]">
      {/* Navigation */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Image
                  src="/assets/uiuvccuplogo.png"
                  alt="UIU VC Cup Logo"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              </div>
              <div className="hidden md:block ml-3">
                <span className="text-lg font-bold text-black">
                  UIU VC Cup - Admin
                </span>
              </div>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:ml-6 md:flex md:items-center space-x-4">
              <span className="text-gray-600 text-sm">
                {currentUser?.email}
              </span>
              <Link 
                href="/" 
                className="text-gray-700 hover:text-[#D0620D] font-medium text-sm transition-colors"
              >
                Back to Site
              </Link>
              <button
                onClick={handleLogout}
                className="bg-[#D0620D] px-4 py-2 rounded-lg text-white text-sm font-medium hover:bg-[#B8540B] transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-[#D0620D] focus:outline-none"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg
                  className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <svg
                  className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
              <div className="px-3 py-2 text-sm text-gray-700">
                {currentUser?.email}
              </div>
              <Link
                href="/dashboard/team"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-[#D0620D] hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Team Management
              </Link>
              <Link
                href="/dashboard/player"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-[#D0620D] hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Player Management
              </Link>
              <Link
                href="/auction"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-[#D0620D] hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Auction
              </Link>
              <div className="border-t border-gray-200 my-2"></div>
              <Link
                href="/"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-[#D0620D] hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Back to Site
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-base font-medium text-[#D0620D] hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Tab Navigation */}
      <div className="bg-gray-100 border-b overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-2 md:space-x-8 min-w-max">
            <Link
              href="/dashboard/team"
              className="py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap border-transparent text-gray-500 hover:text-gray-700 hover:border-[#D0620D]"
            >
              Team Management
            </Link>
            <Link
              href="/dashboard/player"
              className="py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap border-transparent text-gray-500 hover:text-gray-700 hover:border-[#D0620D]"
            >
              Player Management
            </Link>
            <Link
              href="/auction"
              className="py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap border-transparent text-gray-500 hover:text-gray-700 hover:border-[#D0620D]"
            >
              Auction
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-8">
        <ProtectedRoute>
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            {children}
          </div>
        </ProtectedRoute>
      </div>
    </div>
  );
}