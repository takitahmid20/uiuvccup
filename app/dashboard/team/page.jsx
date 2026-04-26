'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/football/team');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
