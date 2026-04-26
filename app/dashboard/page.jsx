'use client';
import Link from 'next/link';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import {
  Trophy,
  Users,
  UserCheck,
  Gavel,
  ChevronRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const sports = [
  {
    id: 'football',
    name: 'Football',
    emoji: '⚽',
    edition: 'UIU VC Cup 2024',
    status: 'ended',
    statusLabel: 'Tournament Ended',
    description:
      'The inaugural UIU VC Cup football tournament has concluded. All team formations, player auctions, and match results are archived.',
    color: 'from-green-700 to-green-900',
    accentColor: 'border-green-500',
    links: [
      { label: 'Team Management', href: '/dashboard/football/team', icon: Users },
      { label: 'Player Management', href: '/dashboard/football/player', icon: UserCheck },
      { label: 'Auction', href: '/auction', icon: Gavel },
    ],
    stats: [
      { label: 'Status', value: 'Completed' },
      { label: 'Teams', value: '8' },
      { label: 'Players', value: '100+' },
    ],
  },
  {
    id: 'cricket',
    name: 'Cricket',
    emoji: '🏏',
    edition: 'UIU VC Cup 2025',
    status: 'active',
    statusLabel: 'Coming Soon',
    description:
      'The upcoming UIU VC Cup cricket edition. Set up teams, register players, run the auction, and manage the full tournament.',
    color: 'from-sky-700 to-sky-900',
    accentColor: 'border-sky-400',
    links: [
      { label: 'Team Management', href: '/dashboard/cricket/team', icon: Users },
      { label: 'Player Management', href: '/dashboard/cricket/player', icon: UserCheck },
      { label: 'Auction', href: '/cricket-auction', icon: Gavel },
    ],
    stats: [
      { label: 'Status', value: 'Setup Phase' },
      { label: 'Teams', value: '—' },
      { label: 'Players', value: '—' },
    ],
  },
];

export default function DashboardHome() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Trophy className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sports Hub</h1>
          <p className="text-sm text-muted-foreground">Select a sport to manage teams, players and auctions</p>
        </div>
      </div>

      <Separator />

      {/* Sport Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sports.map((sport) => (
          <div
            key={sport.id}
            className={`relative rounded-2xl overflow-hidden border-2 ${sport.accentColor} bg-gradient-to-br ${sport.color} text-white shadow-xl`}
          >
            {/* Background emoji watermark */}
            <div className="absolute top-4 right-4 text-8xl opacity-10 select-none pointer-events-none">
              {sport.emoji}
            </div>

            <div className="p-6 space-y-4 relative z-10">
              {/* Title row */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl">{sport.emoji}</span>
                    <h2 className="text-2xl font-bold">{sport.name}</h2>
                  </div>
                  <p className="text-sm text-white/70">{sport.edition}</p>
                </div>
                {sport.status === 'ended' ? (
                  <Badge className="bg-white/20 text-white border-white/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {sport.statusLabel}
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-400/90 text-yellow-900 border-transparent flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {sport.statusLabel}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-white/80 leading-relaxed">{sport.description}</p>

              {/* Stats row */}
              <div className="flex gap-4 py-3 border-y border-white/20">
                {sport.stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-lg font-bold">{s.value}</div>
                    <div className="text-xs text-white/60">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Action links */}
              <div className="space-y-2">
                {sport.links.map(({ label, href, icon: Icon }) => (
                  <Link key={href} href={href}>
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-white/80" />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>

              {/* Primary CTA */}
              {sport.status === 'active' && (
                <Link href={sport.links[0].href}>
                  <Button className="w-full bg-white text-sky-900 hover:bg-white/90 font-semibold mt-1">
                    Get Started →
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
