'use client';
import Link from 'next/link';
import { useState, useEffect, use } from 'react';
import { cricketTeamsService, cricketPlayersService } from '../../../lib/firebaseService';
import Navbar from '../../../components/Navbar';

export default function TeamDetail({ params }) {
  const resolvedParams = use(params);
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const normalizeTeamName = (value) => (value || '').trim().toLowerCase();
  const toSlug = (value) => normalizeTeamName(value).replace(/\s+/g, '-');

  useEffect(() => {
    loadTeamData();
  }, [resolvedParams.teamname]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load teams and players
      const [teamsData, playersData] = await Promise.all([
        cricketTeamsService.getAll(),
        cricketPlayersService.getAll()
      ]);
      
      // Find the team by converting the URL param back to team name
      const slug = resolvedParams.teamname.toLowerCase();
      const foundTeam = teamsData.find(t => toSlug(t.name || t.teamName) === slug);
      
      if (!foundTeam) {
        setError('Team not found');
        return;
      }
      
      // Get players for this team
      const teamName = foundTeam.name || foundTeam.teamName || '';
      const teamPlayers = playersData.filter(player =>
        normalizeTeamName(player.team) === normalizeTeamName(teamName)
      );
      
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
          {(() => {
            const wicketKeeperPositions = ['Wicket-Keeper', 'Wicket-Keeper Batsman'];
            const stats = [
              { label: 'Total Players', value: players.length },
              { label: 'Batsmen', value: players.filter(p => p.position === 'Batsman').length },
              { label: 'Bowlers', value: players.filter(p => p.position === 'Bowler').length },
              { label: 'All-Rounders', value: players.filter(p => p.position === 'All-Rounder').length },
              { label: 'Wicket-Keepers', value: players.filter(p => wicketKeeperPositions.includes(p.position)).length }
            ];

            return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 text-center mb-16">
                {stats.map((stat) => (
                  <div key={stat.label} className="space-y-2">
                    <div className="text-4xl font-bold text-[#D0620D]">{stat.value}</div>
                    <div className="text-gray-300">{stat.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}
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
                    {player.battingStyle ? (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Batting Style:</span>
                        <span className="text-white">{player.battingStyle}</span>
                      </div>
                    ) : null}
                    {player.bowlingStyle ? (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Bowling Style:</span>
                        <span className="text-white">{player.bowlingStyle}</span>
                      </div>
                    ) : null}
                    {player.jerseyNumber ? (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Jersey:</span>
                        <span className="text-white">{player.jerseyNumber}</span>
                      </div>
                    ) : null}
                    {player.basePrice ? (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base Price:</span>
                        <span className="text-white">৳{Number(player.basePrice).toLocaleString()}</span>
                      </div>
                    ) : null}
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
