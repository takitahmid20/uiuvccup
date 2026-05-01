'use client';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { teamsService, playersService } from '../../../lib/firebaseService';
import Navbar from '../../../components/Navbar';

export default function TeamDetail({ params }) {
  const resolvedParams = use(params);
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTeamData();
  }, [resolvedParams.teamname]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load teams and players
      const [teamsData, playersData] = await Promise.all([
        teamsService.getAll(),
        playersService.getAll()
      ]);
      
      // Find the team by converting the URL param back to team name
      const teamName = resolvedParams.teamname.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      const foundTeam = teamsData.find(t => 
        t.name.toLowerCase().replace(/\s+/g, '-') === resolvedParams.teamname ||
        t.name.toLowerCase() === teamName.toLowerCase()
      );
      
      if (!foundTeam) {
        setError('Team not found');
        return;
      }
      
      // Get players for this team
      const teamPlayers = playersData.filter(player => player.team === foundTeam.name);
      
      setTeam(foundTeam);
      setPlayers(teamPlayers);
    } catch (error) {
      console.error('Error loading team data:', error);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center" style={{ backgroundColor: '#0A0D13' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0620D] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading team details...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center" style={{ backgroundColor: '#0A0D13' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Team Not Found</h1>
          <p className="text-gray-300 mb-6">{error || 'The requested team could not be found.'}</p>
          <Link href="/teams" className="bg-[#D0620D] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#B8540B] transition-colors">
            Back to Teams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0A0D13' }}>
      <Navbar />

      {/* Team Header */}
      <section className="pt-32 pb-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-8">
            <Link href="/teams" className="text-gray-400 hover:text-white transition-colors mr-4">
              ← Back to Teams
            </Link>
          </div>
          
          <div className="text-center">
            {team.logo ? (
              <img 
                src={team.logo} 
                alt={`${team.name} logo`}
                className="w-32 h-32 rounded-full object-cover mx-auto mb-6"
              />
            ) : (
              <div 
                className="w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-4xl mx-auto mb-6"
                style={{ backgroundColor: team.color }}
              >
                {team.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase()}
              </div>
            )}
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{team.name}</h1>
            <p className="text-xl text-gray-300">
              Captain: {team.captain ? (
                <span className="text-white font-medium">{team.captain}</span>
              ) : (
                <span className="text-gray-500 italic">Not assigned</span>
              )}
            </p>
            <p className="text-lg text-gray-300">
              Vice Captain: {team.viceCaptain ? (
                <span className="text-white font-medium">{team.viceCaptain}</span>
              ) : (
                <span className="text-gray-500 italic">Not assigned</span>
              )}
            </p>
            <p className="text-lg text-gray-300">
              Mentor: {team.mentor ? (
                <span className="text-white font-medium">{team.mentor}</span>
              ) : (
                <span className="text-gray-500 italic">Not set</span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Team Stats */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mb-16">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-[#D0620D]">{players.length}</div>
              <div className="text-gray-300">Total Players</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-[#D0620D]">
                {players.filter(p => p.position === 'Forward').length}
              </div>
              <div className="text-gray-300">Forwards</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-[#D0620D]">
                {players.filter(p => p.position === 'Midfielder').length}
              </div>
              <div className="text-gray-300">Midfielders</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center mb-16">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-[#D0620D]">
                {players.filter(p => p.position === 'Defender').length}
              </div>
              <div className="text-gray-300">Defenders</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-[#D0620D]">
                {players.filter(p => p.position === 'Goalkeeper').length}
              </div>
              <div className="text-gray-300">Goalkeepers</div>
            </div>
          </div>
        </div>
      </section>

      {/* Squad */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">Squad</h2>
          
          {players.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.map((player, index) => (
                <div key={player.id || index} className="border border-gray-700 rounded-xl p-6" style={{ backgroundColor: '#0A0D13' }}>
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-full overflow-hidden flex items-center justify-center mr-4">
                      <img
                        src={`https://dsa.uiu.ac.bd/loan/api/photo/${encodeURIComponent(player.uniId || '')}`}
                        alt={`${player.name} photo`}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{player.name}</h3>
                      <p className="text-gray-300 text-sm">{player.position}</p>
                      {player.name === team.captain && (
                        <span className="inline-block bg-[#D0620D] text-white text-xs px-2 py-1 rounded-full mt-1">
                          Captain
                        </span>
                      )}
                      {player.name === team.viceCaptain && (
                        <span className="inline-block bg-gray-800 text-white text-xs px-2 py-1 rounded-full mt-1 ml-2">
                          Vice Captain
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">University ID:</span>
                      <span className="text-white">{player.uniId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Department:</span>
                      <span className="text-white">{player.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Age:</span>
                      <span className="text-white">{player.age}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Semester:</span>
                      <span className="text-white">{player.semester}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-gray-400 text-xl mb-4">No players assigned</div>
              <p className="text-gray-500">Players will appear here once they are assigned to this team.</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
