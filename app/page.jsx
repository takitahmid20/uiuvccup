'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { teamsService, playersService } from '../lib/firebaseService';

export default function Home() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load teams and calculate player counts
  useEffect(() => {
    loadTeamsWithPlayerCounts();
  }, []);

  const loadTeamsWithPlayerCounts = async () => {
    try {
      setLoading(true);
      
      // Load teams and players in parallel
      const [teamsData, playersData] = await Promise.all([
        teamsService.getAll(),
        playersService.getAll()
      ]);
      
      // Calculate player count for each team
      const teamsWithPlayerCounts = teamsData.map(team => {
        const playerCount = playersData.filter(player => player.team === team.name).length;
        return {
          ...team,
          players: playerCount
        };
      });
      
      setTeams(teamsWithPlayerCounts);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0A0D13' }}>
      {/* Developer Credit Box - Fixed Top Right */}
      <div className="fixed top-[30%] right-0 z-40 bg-white rounded-l-xl shadow-lg border border-gray-200 p-3 sm:p-4 max-w-[200px] sm:max-w-xs">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full overflow-hidden">
            <Image
              src="/assets/udhlogo.jpg"
              alt="UDH Logo"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-black font-bold text-xs sm:text-sm">Developed by</div>
            <div className="text-[#D0620D] font-semibold text-xs sm:text-sm">UDH</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg mx-4 lg:mx-8">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <Image
                  src="/assets/uiuvccuplogo.png"
                  alt="UIU VC Cup Logo"
                  width={60}
                  height={60}
                  className="rounded-full"
                />
                {/* <span className="text-xl font-bold text-black">
                  UIU VC Cup
                </span> */}
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium">HOME</Link>
                <Link href="/teams" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium">TEAMS</Link>
                <Link href="/players" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium">PLAYERS</Link>
                <Link href="/auction" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium">AUCTION</Link>
                <Link href="/about" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium">ABOUT</Link>
                <Link 
                  href="/login" 
                  className="bg-[#D0620D] px-6 py-2 rounded-full text-white font-medium hover:bg-[#B8540B] transition-all duration-300"
                >
                  LOGIN
                </Link>
              </div>
              
              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  aria-label="Toggle menu"
                  onClick={() => setMobileOpen((v) => !v)}
                  className="text-gray-700 hover:text-[#D0620D] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          {/* Mobile dropdown */}
          {mobileOpen && (
            <div className="md:hidden border-t border-gray-200 px-6 py-4">
              <div className="flex flex-col space-y-3">
                <Link href="/" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium" onClick={() => setMobileOpen(false)}>HOME</Link>
                <Link href="/teams" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium" onClick={() => setMobileOpen(false)}>TEAMS</Link>
                <Link href="/players" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium" onClick={() => setMobileOpen(false)}>PLAYERS</Link>
                <Link href="/auction" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium" onClick={() => setMobileOpen(false)}>AUCTION</Link>
                <Link href="/about" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium" onClick={() => setMobileOpen(false)}>ABOUT</Link>
                <Link href="/login" className="bg-[#D0620D] px-6 py-2 rounded-full text-white font-medium text-center hover:bg-[#B8540B] transition-all duration-300" onClick={() => setMobileOpen(false)}>LOGIN</Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src="/assets/herobg.png" 
            alt="Football Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full pt-16 sm:pt-20">
          <div className="flex items-center min-h-screen px-4 sm:px-8 lg:pl-16">
            <div className="space-y-4 sm:space-y-6 max-w-3xl">
              {/* Top Event Badge */}
              <div className="inline-flex items-center space-x-2 border border-gray-600 rounded-full px-3 py-1 sm:px-4 sm:py-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white text-xs sm:text-sm font-medium uppercase tracking-wider">All Teams</span>
              </div>

              {/* Main Heading */}
              <div className="space-y-1 sm:space-y-2">
                <h1 className="hero-title text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black leading-tight">
                  <span className="block text-white">YOUR GAME</span>
                  <span className="block text-[#D0620D]">YOUR PASSION</span>
                  <span className="block text-white">YOUR KICK.</span>
                </h1>
              </div>

              {/* Description */}
              <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl leading-relaxed">
                Stay ahead with the latest football tournament action, live scores, and in-depth match analysis — all in one place with{' '}
                <span className="text-[#D0620D] font-semibold">UIU VC Cup</span>.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <Link href="/teams" className="group bg-white text-black px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg hover:bg-gray-100 transition-all duration-300 flex items-center justify-center space-x-2">
                  <span>Explore Teams</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Teams Bar */}
        <div className="absolute bottom-0 left-0 w-full">
          <div className="backdrop-blur-sm border-t border-gray-800" style={{ backgroundColor: '#0A0D13' }}>
            <div className="flex items-center h-16 sm:h-20">
              {/* Tournament Label */}
              <div className="flex-shrink-0 bg-[#D0620D] px-4 sm:px-6 py-2 sm:py-4 h-full flex flex-col justify-center min-w-[100px] sm:min-w-[120px]">
                <div className="text-white font-bold text-sm sm:text-lg leading-tight">TOURNAMENT</div>
                <div className="text-orange-200 text-xs sm:text-sm font-medium">TEAMS</div>
              </div>

              {/* Teams Grid - Scrollable on Mobile */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex h-full min-w-max">
                  {/* ... rest of the teams grid code remains same ... */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Teams Overview */}
      <section className="py-8 sm:py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">Tournament Teams</h2>
            <p className="text-lg sm:text-xl text-gray-300">
              {loading ? 'Loading teams...' : `${teams.length} teams competing for the championship`}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="rounded-xl p-6 shadow-sm border border-gray-600 animate-pulse" style={{ backgroundColor: '#0A0D13' }}>
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-600"></div>
                    <div className="ml-3">
                      <div className="bg-gray-600 h-4 w-24 mb-2 rounded"></div>
                      <div className="bg-gray-600 h-3 w-16 rounded"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : teams.length > 0 ? (
              teams.map((team, index) => (
                <Link key={team.id} href={`/teams/${team.name.toLowerCase().replace(/\s+/g, '-')}`} className="block">
                  <div className="rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-600 hover:border-[#D0620D] cursor-pointer" style={{ backgroundColor: '#0A0D13' }}>
                    <div className="flex items-center">
                      {team.logo ? (
                        <img 
                          src={team.logo} 
                          alt={`${team.name} logo`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase()}
                        </div>
                      )}
                      <div className="ml-3">
                        <h3 className="font-bold text-white">{team.name}</h3>
                        <p className="text-sm text-gray-300">{team.players} Players</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              // No teams fallback
              <div className="col-span-4 text-center py-12">
                <div className="text-gray-400">No teams available</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Player Categories */}
      {/* <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Player Categories</h2>
            <p className="text-xl text-gray-300">Different player types and their base prices</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { category: 'Goalkeeper', count: 16, basePrice: '৳1,500', icon: '🥅' },
              { category: 'Defender', count: 40, basePrice: '৳1,200', icon: '🛡️' },
              { category: 'Midfielder', count: 48, basePrice: '৳1,800', icon: '⚽' },
              { category: 'Forward', count: 32, basePrice: '৳2,000', icon: '🎯' }
            ].map((category, index) => (
              <Link key={index} href={`/players/${category.category.toLowerCase()}`} className="block">
                <div className="rounded-xl p-6 text-center border border-gray-700 hover:border-[#D0620D] transition-all duration-300 cursor-pointer hover:scale-105" style={{ backgroundColor: '#0A0D13' }}>
                  <div className="text-4xl mb-4">{category.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{category.category}</h3>
                  <p className="text-gray-300">{category.count} Available</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section> */}

    </div>
  );
}
