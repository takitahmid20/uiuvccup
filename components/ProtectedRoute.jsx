'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if not loading AND no user
    if (!loading && !currentUser) {
      console.log('🚫 ProtectedRoute: Redirecting to login - no user and not loading');
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  if (loading || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D0620D]"></div>
        <p className="text-sm text-muted-foreground">
          {loading ? 'Checking authentication...' : 'Redirecting to login...'}
        </p>
      </div>
    );
  }

  return children;
}
