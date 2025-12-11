'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { teamsService, playersService } from '../../lib/firebaseService';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

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
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg mx-4 lg:mx-8">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <Image
                  src="/assets/uiuvccuplogo.png"
                  alt="UIU VC Cup Logo"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <span className="text-xl font-bold text-black">
                  UIU VC Cup
                </span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium">HOME</Link>
                <Link href="/teams" className="text-[#D0620D] font-medium">TEAMS</Link>
                <Link href="/auction" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium">AUCTION</Link>
                <Link href="/about" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium">ABOUT</Link>
                <Link href="/blog" className="text-gray-700 hover:text-[#D0620D] transition-colors font-medium">BLOG</Link>
                <Link 
                  href="/login" 
                  className="bg-[#D0620D] px-6 py-2 rounded-full text-white font-medium hover:bg-[#B8540B] transition-all duration-300"
                >
                  LOGIN
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-24 sm:pt-32 pb-8 sm:pb-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 sm:mb-6">
              Tournament <span className="text-[#D0620D]">Teams</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto px-4">
              {loading 
                ? 'Loading tournament teams...' 
                : `Meet the ${teams.length} competing teams in the UIU VC Cup Football Tournament. Skilled players ready to battle for the championship.`
              }
            </p>
          </div>
        </div>
      </section>

      {/* Teams Grid */}
      <section className="py-8 sm:py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="rounded-xl p-4 sm:p-6 md:p-8 border border-gray-600 animate-pulse" style={{ backgroundColor: '#0A0D13' }}>
                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gray-600 mx-auto mb-3 sm:mb-4"></div>
                    <div className="bg-gray-600 h-4 sm:h-6 w-24 sm:w-32 mx-auto mb-2 rounded"></div>
                    <div className="bg-gray-600 h-3 sm:h-4 w-20 sm:w-24 mx-auto mb-3 sm:mb-4 rounded"></div>
                    <div className="bg-gray-600 h-3 sm:h-4 w-14 sm:w-16 mx-auto rounded"></div>
                  </div>
                </div>
              ))
            ) : teams.length > 0 ? (
              teams.map((team, index) => (
                <Link key={team.id} href={`/teams/${team.name.toLowerCase().replace(/\s+/g, '-')}`} className="block">
                  <div className="rounded-xl p-4 sm:p-6 md:p-8 border border-gray-600 hover:border-[#D0620D] transition-all duration-300 cursor-pointer hover:scale-105" style={{ backgroundColor: '#0A0D13' }}>
                    <div className="text-center">
                      {team.logo ? (
                        <img 
                          src={team.logo} 
                          alt={`${team.name} logo`}
                          className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full object-cover mx-auto mb-3 sm:mb-4"
                        />
                      ) : (
                        <div 
                          className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl md:text-2xl mx-auto mb-3 sm:mb-4"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase()}
                        </div>
                      )}
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-2">{team.name}</h3>
                      <p className="text-sm sm:text-base text-gray-300 mb-2 sm:mb-4">
                        Captain: {team.captain ? (
                          <span className="text-white font-medium">{team.captain}</span>
                        ) : (
                          <span className="text-gray-500 italic">Not assigned</span>
                        )}
                      </p>
                      <div className="text-center">
                        <span className="text-xs sm:text-sm text-gray-400">{team.players} Players</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              // No teams fallback
              <div className="col-span-2 md:col-span-3 lg:col-span-4 text-center py-8 sm:py-16">
                <div className="text-lg sm:text-xl text-gray-400">No teams available</div>
                <p className="text-sm sm:text-base text-gray-500 mt-2">Teams will appear here once they are added to the tournament.</p>
              </div>
            )}
          </div>
        </div>
      </section>


    </div>
  );
}
