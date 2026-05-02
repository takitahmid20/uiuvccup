'use client';

import { useEffect, useState } from 'react';
import { cricketPlayersService, cricketTeamsService } from '../../lib/firebaseService';
import Navbar from '../../components/Navbar';

export default function PublicPlayersPage() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [assignment, setAssignment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const normalizeTeamName = (value) => (value || '').trim().toLowerCase();
  const isPriorityPlayer = (player) => Boolean(player?.is_24 ?? player?.is24 ?? player?.is24Player);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [playersData, teamsData] = await Promise.all([
          cricketPlayersService.getAll(),
          cricketTeamsService.getAll(),
        ]);
        setPlayers(playersData);
        setTeams(teamsData);
      } catch (e) {
        console.error('Failed to load players/teams', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = players.filter((p) => {
    const teamOk = selectedTeam === 'all' || (selectedTeam === 'unassigned'
      ? !p.team
      : normalizeTeamName(p.team) === normalizeTeamName(selectedTeam));
    const posOk = selectedPosition === 'all' || (p.position || '').toLowerCase() === selectedPosition.toLowerCase();
    const assignmentOk = assignment === 'all' ||
      (assignment === 'assigned' && !!p.team) ||
      (assignment === 'unassigned' && !p.team);
    const q = searchTerm.toLowerCase();
    const searchOk = (p.name || '').toLowerCase().includes(q)
      || (p.uniId || '').toLowerCase().includes(q)
      || (p.department || '').toLowerCase().includes(q)
      || (p.position || '').toLowerCase().includes(q)
      || (p.email || '').toLowerCase().includes(q)
      || (p.team || '').toLowerCase().includes(q)
      || (p.battingStyle || '').toLowerCase().includes(q)
      || (p.bowlingStyle || '').toLowerCase().includes(q);

    return teamOk && posOk && assignmentOk && searchOk;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0D13' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <h1 className="text-3xl font-bold text-white mb-4">All Cricket Players</h1>
        <p className="text-gray-400 mb-6">Browse and filter all registered cricket players.</p>

        {/* Filters */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-[#D0620D]"
              >
                <option value="all">All</option>
                <option value="unassigned">Unassigned</option>
                {teams.map(t => {
                  const teamName = t.name || t.teamName;
                  if (!teamName) return null;
                  return (
                    <option key={t.id} value={teamName}>{teamName}</option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Position</label>
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-[#D0620D]"
              >
                <option value="all">All</option>
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="Wicket-Keeper">Wicket-Keeper</option>
                <option value="Wicket-Keeper Batsman">Wicket-Keeper Batsman</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Assignment</label>
              <select
                value={assignment}
                onChange={(e) => setAssignment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-[#D0620D]"
              >
                <option value="all">All</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID, department, position, email, team, or style"
                className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white border border-gray-700 placeholder-gray-500 focus:border-[#D0620D]"
              />
            </div>
          </div>
        </div>

        {/* Players table */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading players...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No players match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-400 bg-white/5">
                    <th className="px-6 py-3">Player</th>
                    <th className="px-6 py-3">Position</th>
                    <th className="px-6 py-3">Team</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Semester</th>
                    <th className="px-6 py-3">Base Price</th>
                    <th className="px-6 py-3">Sold Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                            <img
                              src={`/api/student-avatar?std=${encodeURIComponent(p.uniId || '')}`}
                              alt={`${p.name} photo`}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                          <div className="text-white text-sm font-medium">{p.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-200 text-sm">{p.position || '-'}</td>
                      <td className="px-6 py-3 text-gray-200 text-sm">{p.team || <span className="text-gray-500">Unassigned</span>}</td>
                      <td className="px-6 py-3 text-gray-200 text-sm">{p.department || '-'}</td>
                      <td className="px-6 py-3 text-gray-200 text-sm">{p.semester || '-'}</td>
                      <td className="px-6 py-3 text-sm">
                        {p.basePrice ? (
                          <span className="text-gray-200">৳{Number(p.basePrice).toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm">{p.soldPrice ? <span className="text-green-400 font-semibold">৳{Number(p.soldPrice).toLocaleString()}</span> : <span className="text-gray-500">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
