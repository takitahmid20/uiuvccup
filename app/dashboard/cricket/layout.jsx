'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, UserCheck, Gavel, ArrowLeft } from 'lucide-react';
import { cn } from '../../../lib/utils';

const tabs = [
  { label: 'Team Management', href: '/dashboard/cricket/team', icon: Users },
  { label: 'Player Management', href: '/dashboard/cricket/player', icon: UserCheck },
  { label: 'Auction', href: '/live-cricket-auction', icon: Gavel },
];

export default function CricketLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="space-y-0">
      {/* Sport header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Sports Hub
        </Link>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-2">
          <span className="text-xl">🏏</span>
          <span className="font-semibold text-sm">Cricket — UIU VC Cup 2025</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              target={href === '/live-cricket-auction' ? '_blank' : undefined}
              rel={href === '/live-cricket-auction' ? 'noopener noreferrer' : undefined}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
