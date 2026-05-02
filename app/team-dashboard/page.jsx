'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { teamsService, playersService, cricketTeamsService, cricketPlayersService } from '../../lib/firebaseService';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export default function TeamOwnerDashboard() {
  const { currentUser, userRole, userTeam, userTeamId, isTeamOwner, loading: authLoading } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamType, setTeamType] = useState('football');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingPlayer, setSavingPlayer] = useState(false);

  const FOOTBALL_POSITIONS = ['Goalkeeper (GK)', 'Goalkeeper', 'Defender', 'Midfielder', 'Striker', 'Forward'];
  const CRICKET_POSITIONS = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper', 'Wicket-Keeper Batsman'];
  const FOOTBALL_CATEGORIES = ['A', 'B'];
  const SEMESTER_OPTIONS = Array.from({ length: 12 }, (_, idx) => {
    const n = idx + 1;
    const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
    return `${n}${suffix}`;
  });
  const DEPARTMENT_OPTIONS = [
    'CSE',
    'EEE',
    'BBA',
    'Civil',
    'English',
    'Economics'
  ];

  const normalizeTeamName = (value) => (value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return;
    
    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (!isTeamOwner) {
      router.push('/');
      return;
    }

    loadTeamData();
  }, [currentUser, isTeamOwner, userTeam, userTeamId, authLoading, router]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      // Load teams and find the user's team
      const [teamsData, playersData, cricketTeamsData, cricketPlayersData] = await Promise.all([
        teamsService.getAll(),
        playersService.getAll(),
        cricketTeamsService.getAll(),
        cricketPlayersService.getAll()
      ]);

      const footballTeam = teamsData.find(t => t.id === userTeamId)
        || teamsData.find(t => t.ownerId === currentUser?.uid)
        || teamsData.find(t => (t.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase())
        || teamsData.find(t => normalizeTeamName(t.name) === normalizeTeamName(userTeam))
        || teamsData.find(t => normalizeTeamName(t.teamName) === normalizeTeamName(userTeam));

      if (footballTeam) {
        setTeamType('football');
        setTeam(footballTeam);
        const resolvedTeamName = footballTeam.name || footballTeam.teamName || userTeam;
        const teamPlayers = playersData.filter(player =>
          normalizeTeamName(player.team) === normalizeTeamName(resolvedTeamName)
        );
        setPlayers(teamPlayers);
        return;
      }

      const cricketTeam = cricketTeamsData.find(t => t.id === userTeamId)
        || cricketTeamsData.find(t => t.ownerId === currentUser?.uid)
        || cricketTeamsData.find(t => (t.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase())
        || cricketTeamsData.find(t => normalizeTeamName(t.name) === normalizeTeamName(userTeam))
        || cricketTeamsData.find(t => normalizeTeamName(t.teamName) === normalizeTeamName(userTeam));

      if (cricketTeam) {
        setTeamType('cricket');
        setTeam(cricketTeam);
        const resolvedTeamName = cricketTeam.name || cricketTeam.teamName || userTeam;
        const teamPlayers = cricketPlayersData.filter(player =>
          normalizeTeamName(player.team) === normalizeTeamName(resolvedTeamName)
        );
        setPlayers(teamPlayers);
        return;
      }

      setTeam(null);
      setPlayers([]);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setEditForm({
      name: player.name || '',
      uniId: player.uniId || '',
      position: player.position || '',
      category: player.category || '',
      age: player.age || '',
      semester: player.semester || '',
      department: player.department || '',
      phone: player.phone || '',
      email: player.email || '',
      jerseyNumber: player.jerseyNumber || '',
      basePrice: player.basePrice || '',
      battingStyle: player.battingStyle || '',
      bowlingStyle: player.bowlingStyle || ''
    });
  };

  const updateEditField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const savePlayerChanges = async () => {
    if (!editingPlayer || !editForm) return;

    try {
      setSavingPlayer(true);
      const updateData = teamType === 'cricket'
        ? {
            name: editForm.name,
            uniId: editForm.uniId,
            position: editForm.position,
            semester: editForm.semester || '',
            department: editForm.department || '',
            age: editForm.age ? Number(editForm.age) : null,
            phone: editForm.phone || '',
            email: editForm.email || '',
            jerseyNumber: editForm.jerseyNumber ? Number(editForm.jerseyNumber) : null,
            basePrice: editForm.basePrice ? Number(editForm.basePrice) : null,
            battingStyle: editForm.battingStyle || '',
            bowlingStyle: editForm.bowlingStyle || ''
          }
        : {
            name: editForm.name,
            uniId: editForm.uniId,
            position: editForm.position,
            category: editForm.category || '',
            semester: editForm.semester || '',
            department: editForm.department || '',
            age: editForm.age ? Number(editForm.age) : null,
            phone: editForm.phone || '',
            email: editForm.email || '',
            jerseyNumber: editForm.jerseyNumber ? Number(editForm.jerseyNumber) : null,
            basePrice: editForm.basePrice ? Number(editForm.basePrice) : null
          };

      if (teamType === 'cricket') {
        await cricketPlayersService.update(editingPlayer.id, updateData);
      } else {
        await playersService.update(editingPlayer.id, updateData);
      }

      setEditingPlayer(null);
      setEditForm(null);
      await loadTeamData();
    } catch (error) {
      console.error('Failed to update player:', error);
    } finally {
      setSavingPlayer(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0620D] mx-auto mb-4"></div>
          <p className="text-gray-600">{authLoading ? 'Authenticating...' : 'Loading your team dashboard...'}</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Team Not Found</h2>
          <p className="text-gray-600 mb-6">Unable to find your team data.</p>
          <Link href="/" className="bg-[#D0620D] text-white px-6 py-3 rounded-lg hover:bg-[#B8540B] transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Calculate position statistics
  const footballStats = {
    Goalkeeper: players.filter(p => p.position === 'Goalkeeper').length,
    Defender: players.filter(p => p.position === 'Defender').length,
    Midfielder: players.filter(p => p.position === 'Midfielder').length,
    Forward: players.filter(p => p.position === 'Forward').length
  };

  const cricketStats = {
    Batsman: players.filter(p => p.position === 'Batsman').length,
    Bowler: players.filter(p => p.position === 'Bowler').length,
    'All-Rounder': players.filter(p => p.position === 'All-Rounder').length,
    'Wicket-Keeper': players.filter(p => p.position === 'Wicket-Keeper' || p.position === 'Wicket-Keeper Batsman').length
  };

  const statCards = teamType === 'cricket'
    ? [
        { label: 'Batsmen', value: cricketStats['Batsman'], icon: '🏏' },
        { label: 'Bowlers', value: cricketStats['Bowler'], icon: '🎯' },
        { label: 'All-Rounders', value: cricketStats['All-Rounder'], icon: '⚡' },
        { label: 'Wicket-Keepers', value: cricketStats['Wicket-Keeper'], icon: '🧤' }
      ]
    : [
        { label: 'Goalkeepers', value: footballStats.Goalkeeper, icon: '🥅' },
        { label: 'Defenders', value: footballStats.Defender, icon: '🛡️' },
        { label: 'Midfielders', value: footballStats.Midfielder, icon: '⚽' },
        { label: 'Forwards', value: footballStats.Forward, icon: '🎯' }
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Team Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
            {team.logo ? (
              <img 
                src={team.logo} 
                alt={`${team.name} logo`}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: team.color }}
              >
                {team.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
              <p className="text-gray-600 mt-1">
                Captain: {team.captain ? (
                  <span className="font-medium text-gray-900">{team.captain}</span>
                ) : (
                  <span className="italic">Not assigned</span>
                )}
              </p>
              <p className="text-gray-600">
                Vice Captain: {team.viceCaptain ? (
                  <span className="font-medium text-gray-900">{team.viceCaptain}</span>
                ) : (
                  <span className="italic">Not assigned</span>
                )}
              </p>
              <p className="text-gray-600">
                Mentor: {team.mentor ? (
                  <span className="font-medium text-gray-900">{team.mentor}</span>
                ) : (
                  <span className="italic">Not set</span>
                )}
              </p>
              <p className="text-gray-600">
                Total Players: <span className="font-medium text-gray-900">{players.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="text-3xl mr-4">{stat.icon}</div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Players List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Team Squad</h2>
          </div>
          
          {players.length > 0 ? (
            <>
              {/* Mobile List */}
              <div className="md:hidden divide-y divide-gray-200">
                {players.map((player) => (
                  <div key={player.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border border-gray-300">
                        <img
                          src={`/api/student-avatar?std=${encodeURIComponent(player.uniId || '')}`}
                          alt={`${player.name} photo`}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{player.name}</div>
                        <div className="text-xs text-gray-500">{player.position} • {player.uniId}</div>
                      </div>
                      <div className="text-right">
                        {player.soldPrice && player.soldPrice > 0 ? (
                          <span className="text-green-600 font-semibold text-sm">৳{Number(player.soldPrice).toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      {player.name === team.captain ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#D0620D] text-white">Captain</span>
                      ) : player.name === team.viceCaptain ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-white">Vice Captain</span>
                      ) : (
                        <span className="text-xs text-gray-500">Player</span>
                      )}
                    </div>
                    <div className="mt-3">
                      <Button size="sm" variant="outline" onClick={() => handleEditPlayer(player)}>
                        Edit Player
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sold Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Semester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        University ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {players.map((player) => (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border border-gray-300">
                              <img
                                src={`/api/student-avatar?std=${encodeURIComponent(player.uniId || '')}`}
                                alt={`${player.name} photo`}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            </div>
                            <div className="text-sm font-medium text-gray-900">{player.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">
                              {player.position === 'Goalkeeper' ? '🥅' : 
                               player.position === 'Defender' ? '🛡️' : 
                               player.position === 'Midfielder' ? '⚽' : '🎯'}
                            </span>
                            <span className="text-sm text-gray-900">{player.position}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {player.soldPrice && player.soldPrice > 0 ? (
                            <span className="text-green-600 font-semibold">৳{Number(player.soldPrice).toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.semester}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.uniId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {player.name === team.captain ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#D0620D] text-white">
                              Captain
                            </span>
                          ) : player.name === team.viceCaptain ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-white">
                              Vice Captain
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">Player</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => handleEditPlayer(player)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">⚽</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Players Assigned</h3>
              <p className="text-gray-500">
                Your team doesn't have any players yet. Players will be assigned through the auction process.
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
          <Link 
            href="/teams" 
            className="w-full sm:w-auto text-center bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
          >
            View All Teams
          </Link>
          <Link 
            href={teamType === 'cricket' ? '/live-cricket-auction' : '/auction'}
            className="w-full sm:w-auto text-center bg-[#D0620D] text-white px-6 py-3 rounded-lg hover:bg-[#B8540B] transition-colors"
          >
            View Auction
          </Link>
        </div>
      </div>

      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Player Info</DialogTitle>
          </DialogHeader>
          {editingPlayer && editForm && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Player Name</Label>
                  <Input value={editForm.name} onChange={(e) => updateEditField('name', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Student ID</Label>
                  <Input value={editForm.uniId} onChange={(e) => updateEditField('uniId', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Semester</Label>
                  <select
                    value={editForm.semester}
                    onChange={(e) => updateEditField('semester', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">Select Semester</option>
                    {SEMESTER_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s} Semester</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <select
                    value={editForm.department}
                    onChange={(e) => updateEditField('department', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Age</Label>
                  <Input value={editForm.age} onChange={(e) => updateEditField('age', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Jersey Number</Label>
                  <Input value={editForm.jerseyNumber} onChange={(e) => updateEditField('jerseyNumber', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Position</Label>
                  <select
                    value={editForm.position}
                    onChange={(e) => updateEditField('position', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">Select Position</option>
                    {(teamType === 'cricket' ? CRICKET_POSITIONS : FOOTBALL_POSITIONS).map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                {teamType !== 'cricket' && (
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <select
                      value={editForm.category}
                      onChange={(e) => updateEditField('category', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {FOOTBALL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={(e) => updateEditField('phone', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={editForm.email} onChange={(e) => updateEditField('email', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Base Price (৳)</Label>
                  <Input value={editForm.basePrice} onChange={(e) => updateEditField('basePrice', e.target.value)} />
                </div>
                {teamType === 'cricket' && (
                  <>
                    <div className="space-y-1">
                      <Label>Jersey Number</Label>
                      <Input value={editForm.jerseyNumber} onChange={(e) => updateEditField('jerseyNumber', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Batting Style</Label>
                      <Input value={editForm.battingStyle} onChange={(e) => updateEditField('battingStyle', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Bowling Style</Label>
                      <Input value={editForm.bowlingStyle} onChange={(e) => updateEditField('bowlingStyle', e.target.value)} />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingPlayer(null)} disabled={savingPlayer}>Cancel</Button>
                <Button onClick={savePlayerChanges} disabled={savingPlayer}>
                  {savingPlayer ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}