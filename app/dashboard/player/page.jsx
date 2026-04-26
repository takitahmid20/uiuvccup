'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlayerRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/football/player');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
