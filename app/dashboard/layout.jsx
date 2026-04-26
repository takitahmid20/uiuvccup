'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useState } from 'react';
import { cn } from '../../lib/utils';

const topTabs = [
  { label: '🏠 Dashboard', href: '/dashboard', match: (p) => p === '/dashboard' },
];

export default function DashboardLayout({ children }) {
  const { logout, currentUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo + title */}
            <div className="flex items-center gap-3">
              <Image
                src="/assets/uiuvccuplogo.png"
                alt="UIU VC Cup Logo"
                width={36}
                height={36}
                className="rounded-full"
              />
              <span className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                UIU VC Cup
                <span className="block text-[10px] font-normal text-gray-400 leading-none">Admin Panel</span>
              </span>
            </div>

            {/* Desktop right-side actions */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-gray-500 text-xs truncate max-w-[180px]">{currentUser?.email}</span>
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-[#D0620D] font-medium transition-colors"
              >
                ← Back to Site
              </Link>
              <button
                onClick={handleLogout}
                className="bg-[#D0620D] px-3 py-1.5 rounded-lg text-white text-sm font-medium hover:bg-[#B8540B] transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-[#D0620D] hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              <p className="text-xs text-gray-400 pb-1">{currentUser?.email}</p>
              {[
                { label: '🏠 Dashboard Home', href: '/dashboard' },
                { label: '⚽ Football – Teams', href: '/dashboard/football/team' },
                { label: '⚽ Football – Players', href: '/dashboard/football/player' },
                { label: '⚽ Football – Auction', href: '/auction' },
                { label: '🏏 Cricket – Teams', href: '/dashboard/cricket/team' },
                { label: '🏏 Cricket – Players', href: '/dashboard/cricket/player' },
                { label: '🏏 Cricket – Auction', href: '/cricket-auction' },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:text-[#D0620D] hover:bg-orange-50 transition-colors"
                >
                  {label}
                </Link>
              ))}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-gray-600 hover:text-[#D0620D] rounded-lg hover:bg-orange-50">
                  ← Back to Site
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-[#D0620D] hover:bg-orange-50 rounded-lg"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Sport tab switcher - only show on sub-pages, not on /dashboard */}
      {pathname !== '/dashboard' && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex overflow-x-auto scrollbar-hide">
              {topTabs.map(({ label, href, match }) => {
                const active = match(pathname);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex-shrink-0 py-3 px-4 sm:px-6 border-b-2 text-sm font-medium whitespace-nowrap transition-colors',
                      active
                        ? 'border-[#D0620D] text-[#D0620D]'
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ProtectedRoute>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-7">
            {children}
          </div>
        </ProtectedRoute>
      </div>
    </div>
  );
}