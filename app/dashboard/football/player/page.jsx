'use client';
import { useState, useEffect } from 'react';
import { playersService, teamsService } from '../../../../lib/firebaseService';
import { logger } from '../../../../lib/logger';
import { useToast } from '../../../../lib/useToast';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Badge } from '../../../../components/ui/badge';
import { Skeleton } from '../../../../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Separator } from '../../../../components/ui/separator';
import { Eye, Edit, Trash2 } from 'lucide-react';

export default function PlayerManagement() {
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('all');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showRandomAssignModal, setShowRandomAssignModal] = useState(false);
  const [selectedCategoryForAssign, setSelectedCategoryForAssign] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const { showToast } = useToast();

  // Load players and teams from Firebase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [playersData, teamsData] = await Promise.all([
        playersService.getAll(),
        teamsService.getAll()
      ]);
      setPlayers(playersData);
      setTeams(teamsData);
    } catch (error) {
      logger.error('Error loading data:', error);
      showToast('Failed to load data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlayer = async (playerId, teamName) => {
    try {
      await playersService.assignToTeam(playerId, teamName || null);
      // If unassigned, reset soldPrice to 0 (unsold)
      if (!teamName) {
        await playersService.update(playerId, { soldPrice: 0 });
      }
      setPlayers(players.map(player => 
        player.id === playerId 
          ? { ...player, team: teamName || null, ...(teamName ? {} : { soldPrice: 0 }) } 
          : player
      ));
      
      // Find player name for toast message
      const player = players.find(p => p.id === playerId);
      const playerName = player ? player.name : 'Player';
      
      if (teamName) {
        showToast(`${playerName} successfully assigned to ${teamName}!`, 'success');
      } else {
        showToast(`${playerName} successfully unassigned from team!`, 'success');
      }
    } catch (error) {
      logger.error('Error assigning player:', error);
      showToast('Failed to assign player. Please try again.', 'error');
    }
  };

  const handleAddPlayer = async (playerData) => {
    try {
      const playerId = await playersService.create(playerData);
      setPlayers([...players, { id: playerId, ...playerData }]);
      setShowAddModal(false);
      showToast('Player added successfully!', 'success');
    } catch (error) {
      logger.error('Error adding player:', error);
      showToast('Failed to add player. Please try again.', 'error');
    }
  };

  const handleEditPlayer = async (updatedPlayerData) => {
    try {
      await playersService.update(editingPlayer.id, updatedPlayerData);
      setPlayers(players.map(player => 
        player.id === editingPlayer.id ? { ...editingPlayer, ...updatedPlayerData } : player
      ));
      setEditingPlayer(null);
      showToast('Player updated successfully!', 'success');
    } catch (error) {
      logger.error('Error updating player:', error);
      showToast('Failed to update player. Please try again.', 'error');
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (confirm('Are you sure you want to delete this player?')) {
      try {
        await playersService.delete(playerId);
        setPlayers(players.filter(player => player.id !== playerId));
        showToast('Player deleted successfully!', 'success');
      } catch (error) {
        logger.error('Error deleting player:', error);
        showToast('Failed to delete player. Please try again.', 'error');
      }
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesTeam = selectedTeamFilter === 'all' || 
      (selectedTeamFilter === 'unassigned' && !player.team) ||
      player.team === selectedTeamFilter;

    const matchesCategory = selectedCategoryFilter === 'all' || (player.category || '').toUpperCase() === selectedCategoryFilter.toUpperCase();

    const normalizePos = (p) => (p || '').toLowerCase();
    const matchesPosition = selectedPositionFilter === 'all' || normalizePos(player.position) === normalizePos(selectedPositionFilter);

    const matchesAssignment = assignmentStatusFilter === 'all' ||
      (assignmentStatusFilter === 'assigned' && !!player.team) ||
      (assignmentStatusFilter === 'unassigned' && !player.team);

    // Role filter based on team's captain/viceCaptain names
    const teamObj = teams.find(t => t.name === player.team);
    const matchesRole = roleFilter === 'all' || (
      roleFilter === 'captain' ? (teamObj && player.name === teamObj.captain) :
      roleFilter === 'vice_captain' ? (teamObj && player.name === teamObj.viceCaptain) : true
    );

    const q = searchTerm.toLowerCase();
    const matchesSearch = player.name?.toLowerCase().includes(q) ||
      player.uniId?.toLowerCase().includes(q) ||
      player.department?.toLowerCase().includes(q) ||
      player.position?.toLowerCase().includes(q) ||
      player.email?.toLowerCase().includes(q);

    return matchesTeam && matchesCategory && matchesPosition && matchesAssignment && matchesRole && matchesSearch;
  });

  const getPositionColor = (position) => {
    const colors = {
      'Goalkeeper (GK)': 'bg-yellow-100 text-yellow-800',
      'Midfielder': 'bg-blue-100 text-blue-800',
      'Defender': 'bg-green-100 text-green-800',
      'Striker': 'bg-red-100 text-red-800',
      // Legacy/simple names fallback
      'Goalkeeper': 'bg-yellow-100 text-yellow-800'
    };
    return colors[position] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'A': 'bg-purple-100 text-purple-800',
      'B': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // CSV file processing function for players
  const processCsvFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          // Expected headers: name, uniId, position (optional: semester, department, age, phone, email, team, category, jerseyNumber, basePrice)
          const requiredHeaders = ['name', 'uniid', 'position'];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          
          if (missingHeaders.length > 0) {
            reject(new Error(`Missing required columns: ${missingHeaders.join(', ')}`));
            return;
          }
          
          const players = [];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            const values = line.split(',').map(v => v.trim());
            const playerData = {};
            
            headers.forEach((header, index) => {
              playerData[header] = values[index] || '';
            });
            
            // Validate required fields (others optional)
            if (!playerData.name || !playerData.uniid || !playerData.position) {
              continue; // Skip invalid rows
            }
            
            players.push({
              name: playerData.name,
              uniId: playerData.uniid,
              semester: playerData.semester || '',
              department: playerData.department || '',
              age: playerData.age ? parseInt(playerData.age) : null,
              position: playerData.position,
              category: playerData.category || '', // Optional category from CSV
              jerseyNumber: playerData.jerseynumber ? parseInt(playerData.jerseynumber) : null, // Optional jersey number
              basePrice: playerData.baseprice ? parseInt(playerData.baseprice) : null, // Optional base price
              phone: playerData.phone || '',
              email: playerData.email || '',
              team: playerData.team || null
            });
          }
          
          resolve(players);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Handle CSV upload and bulk player creation
  const handleCsvUpload = async (file) => {
    try {
      setCsvUploading(true);
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        showToast('Please upload a CSV file (.csv)', 'warning');
        return;
      }
      
      // Process CSV file
      const playersData = await processCsvFile(file);
      
      if (playersData.length === 0) {
        showToast('No valid players found in the CSV file.', 'warning');
        return;
      }
      
      // Create players in Firebase
      const createdPlayers = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (const playerData of playersData) {
        try {
          const playerId = await playersService.create(playerData);
          createdPlayers.push({ id: playerId, ...playerData });
          successCount++;
        } catch (error) {
          console.error(`Error creating player ${playerData.name}:`, error);
          errorCount++;
        }
      }
      
      // Update local state
      setPlayers(prevPlayers => [...prevPlayers, ...createdPlayers]);
      setShowCsvModal(false);
      
      // Show results (no ugly alert, just console log)
      console.log(`CSV Upload Complete! Successfully created: ${successCount} players. Failed: ${errorCount} players.`);
      
    } catch (error) {
      logger.error('Error processing CSV:', error);
      showToast(`Error processing CSV file: ${error.message}`, 'error');
    } finally {
      setCsvUploading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!csvUploading) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    if (csvUploading) return;
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFile) {
      handleCsvUpload(csvFile);
    } else {
      showToast('Please drop a CSV file (.csv)', 'warning');
    }
  };

  // Random assignment function
  const handleRandomAssignment = async () => {
    if (!selectedCategoryForAssign) {
      showToast('Please select a category first.', 'warning');
      return;
    }

    try {
      setAssignmentLoading(true);

      // Get unassigned players from selected category
      const unassignedPlayers = players.filter(player => 
        !player.team && player.category === selectedCategoryForAssign
      );

      if (unassignedPlayers.length === 0) {
        showToast(`No unassigned players found in Category ${selectedCategoryForAssign}.`, 'info');
        return;
      }

      // Get all available team names
      const teamNames = teams.map(team => team.name);
      
      if (teamNames.length === 0) {
        showToast('No teams available for assignment.', 'warning');
        return;
      }

      // Shuffle the unassigned players randomly
      const shuffledPlayers = [...unassignedPlayers].sort(() => Math.random() - 0.5);
      
      // Policy: Maximum 6 players per team from each category
      // Calculate max players we can assign (6 per team × number of teams)
      const maxPlayersToAssign = teamNames.length * 6;
      const playersToAssign = shuffledPlayers.slice(0, maxPlayersToAssign);

      // Assign exactly 6 players per team (policy enforcement)
      const assignments = [];
      for (let i = 0; i < playersToAssign.length; i++) {
        const teamIndex = Math.floor(i / 6); // 6 players per team
        const player = playersToAssign[i];
        const teamName = teamNames[teamIndex];
        
        assignments.push({
          playerId: player.id,
          teamName: teamName,
          playerName: player.name
        });
      }

      // Execute assignments
      let successCount = 0;
      let errorCount = 0;

      for (const assignment of assignments) {
        try {
          await playersService.assignToTeam(assignment.playerId, assignment.teamName);
          successCount++;
        } catch (error) {
          console.error(`Error assigning ${assignment.playerName} to ${assignment.teamName}:`, error);
          errorCount++;
        }
      }

      // Update local state
      setPlayers(prevPlayers => 
        prevPlayers.map(player => {
          const assignment = assignments.find(a => a.playerId === player.id);
          return assignment ? { ...player, team: assignment.teamName } : player;
        })
      );

      // Close modal and show results
      setShowRandomAssignModal(false);
      setSelectedCategoryForAssign('');
      
      const totalUnassigned = unassignedPlayers.length;
      const remainingUnassigned = totalUnassigned - successCount;
      
      showToast(`Random assignment completed! ${successCount} players assigned, ${errorCount} errors, ${remainingUnassigned} remaining`, 'success');

    } catch (error) {
      logger.error('Error during random assignment:', error);
      showToast('Failed to complete random assignment. Please try again.', 'error');
    } finally {
      setAssignmentLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Player Management</h1>
          <p className="text-gray-300">Manage players and assign them to teams</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowRandomAssignModal(true)} disabled={assignmentLoading}>
            🎲 Random Assign
          </Button>
          <Button variant="outline" onClick={() => setShowCsvModal(true)} disabled={csvUploading}>
            📄 Upload CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)} disabled={csvUploading}>
            Add New Player
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <Label>Team</Label>
              <select value={selectedTeamFilter} onChange={(e) => setSelectedTeamFilter(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="all">All ({players.length})</option>
                <option value="unassigned">Unassigned ({players.filter(p => !p.team).length})</option>
                {teams.map(t => <option key={t.id} value={t.name}>{t.name} ({players.filter(p => p.team === t.name).length})</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <select value={selectedCategoryFilter} onChange={(e) => setSelectedCategoryFilter(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="all">All</option>
                <option value="A">Category A</option>
                <option value="B">Category B</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Position</Label>
              <select value={selectedPositionFilter} onChange={(e) => setSelectedPositionFilter(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="all">All</option>
                <option value="Goalkeeper (GK)">Goalkeeper (GK)</option>
                <option value="Defender">Defender</option>
                <option value="Midfielder">Midfielder</option>
                <option value="Striker">Striker</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Assignment</Label>
              <select value={assignmentStatusFilter} onChange={(e) => setAssignmentStatusFilter(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="all">All</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="all">All</option>
                <option value="captain">Captain</option>
                <option value="vice_captain">Vice Captain</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Search</Label>
              <Input type="text" placeholder="Name, ID, dept..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Showing {filteredPlayers.length} of {players.length} players</p>
        </CardContent>
      </Card>

      {/* Players Table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Assign</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No players found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted border flex items-center justify-center shrink-0">
                          <img src={`https://dsa.uiu.ac.bd/loan/api/photo/${encodeURIComponent(player.uniId || '')}`} alt={player.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{player.name}</div>
                          <div className="text-xs text-muted-foreground">{player.uniId} · {player.semester}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPositionColor(player.position)} variant="outline">{player.position}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(player.category)} variant="outline">Cat {player.category || '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="text-muted-foreground">{player.department} · Age {player.age}</div>
                      <div className="text-xs text-muted-foreground">{player.phone}</div>
                    </TableCell>
                    <TableCell>
                      {player.team ? (
                        <Badge className="bg-green-100 text-green-800">{player.team}</Badge>
                      ) : (
                        <Badge variant="secondary">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <select value={player.team || ''} onChange={(e) => handleAssignPlayer(player.id, e.target.value)} className="px-2 py-1 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                          <option value="">Unassigned</option>
                          {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                        {player.soldPrice ? <span className="text-xs text-green-600">৳{Number(player.soldPrice).toLocaleString()}</span> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewingPlayer(player)} title="View">
                          <Eye className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditingPlayer(player)} title="Edit">
                          <Edit className="w-4 h-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDeletePlayer(player.id)} title="Delete">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Player Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Player</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); handleAddPlayer({ name: f.get('name'), uniId: f.get('uniId'), semester: f.get('semester') || '', department: f.get('department') || '', age: f.get('age') ? parseInt(f.get('age')) : null, position: f.get('position'), category: f.get('category') || '', jerseyNumber: f.get('jerseyNumber') ? parseInt(f.get('jerseyNumber')) : null, basePrice: f.get('basePrice') ? parseInt(f.get('basePrice')) : null, phone: f.get('phone') || '', email: f.get('email') || '', team: f.get('team') || null }); }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Full Name</Label><Input name="name" required /></div>
              <div className="space-y-1"><Label>University ID</Label><Input name="uniId" required /></div>
              <div className="space-y-1"><Label>Semester</Label>
                <select name="semester" className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Select Semester</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => <option key={s} value={`${s}${s===1?'st':s===2?'nd':s===3?'rd':'th'}`}>{s}{s===1?'st':s===2?'nd':s===3?'rd':'th'} Semester</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Department</Label>
                <select name="department" className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Select Department</option>
                  <option value="CSE">Computer Science &amp; Engineering</option>
                  <option value="EEE">Electrical &amp; Electronic Engineering</option>
                  <option value="BBA">Business Administration</option>
                  <option value="Civil">Civil Engineering</option>
                  <option value="English">English</option>
                  <option value="Economics">Economics</option>
                </select>
              </div>
              <div className="space-y-1"><Label>Age</Label><Input type="number" name="age" min="18" max="30" /></div>
              <div className="space-y-1"><Label>Jersey Number</Label><Input type="number" name="jerseyNumber" min="1" max="99" /></div>
              <div className="space-y-1"><Label>Position</Label>
                <select name="position" required className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Select Position</option>
                  <option value="Goalkeeper (GK)">Goalkeeper (GK)</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Defender">Defender</option>
                  <option value="Striker">Striker</option>
                </select>
              </div>
              <div className="space-y-1"><Label>Category</Label>
                <select name="category" className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Select Category</option>
                  <option value="A">Category A</option>
                  <option value="B">Category B</option>
                </select>
              </div>
              <div className="space-y-1"><Label>Base Price (৳)</Label><Input type="number" name="basePrice" min="0" placeholder="e.g., 5000" /></div>
              <div className="space-y-1"><Label>Phone</Label><Input type="tel" name="phone" /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" name="email" /></div>
              <div className="col-span-2 space-y-1"><Label>Assign to Team (Optional)</Label>
                <select name="team" className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Unassigned</option>
                  {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit">Add Player</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Player Modal */}
      <Dialog open={!!editingPlayer} onOpenChange={(o) => !o && setEditingPlayer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Player</DialogTitle></DialogHeader>
          {editingPlayer && (
            <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); handleEditPlayer({ name: f.get('name'), uniId: f.get('uniId'), semester: f.get('semester') || '', department: f.get('department') || '', age: f.get('age') ? parseInt(f.get('age')) : null, position: f.get('position'), category: f.get('category') || '', jerseyNumber: f.get('jerseyNumber') ? parseInt(f.get('jerseyNumber')) : null, basePrice: f.get('basePrice') ? parseInt(f.get('basePrice')) : null, soldPrice: f.get('soldPrice') ? parseInt(f.get('soldPrice')) : null, phone: f.get('phone') || '', email: f.get('email') || '', team: f.get('team') || null }); }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Full Name</Label><Input name="name" defaultValue={editingPlayer.name} required /></div>
                <div className="space-y-1"><Label>University ID</Label><Input name="uniId" defaultValue={editingPlayer.uniId} required /></div>
                <div className="space-y-1"><Label>Semester</Label>
                  <select name="semester" defaultValue={editingPlayer.semester} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">Select Semester</option>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => <option key={s} value={`${s}${s===1?'st':s===2?'nd':s===3?'rd':'th'}`}>{s}{s===1?'st':s===2?'nd':s===3?'rd':'th'} Semester</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Department</Label>
                  <select name="department" defaultValue={editingPlayer.department} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">Select Department</option>
                    <option value="CSE">Computer Science &amp; Engineering</option>
                    <option value="EEE">Electrical &amp; Electronic Engineering</option>
                    <option value="BBA">Business Administration</option>
                    <option value="Civil">Civil Engineering</option>
                    <option value="English">English</option>
                    <option value="Economics">Economics</option>
                  </select>
                </div>
                <div className="space-y-1"><Label>Age</Label><Input type="number" name="age" defaultValue={editingPlayer.age} min="18" max="30" /></div>
                <div className="space-y-1"><Label>Jersey Number</Label><Input type="number" name="jerseyNumber" defaultValue={editingPlayer.jerseyNumber || ''} min="1" max="99" /></div>
                <div className="space-y-1"><Label>Position</Label>
                  <select name="position" defaultValue={editingPlayer.position} required className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">Select Position</option>
                    <option value="Goalkeeper (GK)">Goalkeeper (GK)</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Defender">Defender</option>
                    <option value="Striker">Striker</option>
                  </select>
                </div>
                <div className="space-y-1"><Label>Category</Label>
                  <select name="category" defaultValue={editingPlayer.category || ''} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">Select Category</option>
                    <option value="A">Category A</option>
                    <option value="B">Category B</option>
                  </select>
                </div>
                <div className="space-y-1"><Label>Base Price (৳)</Label><Input type="number" name="basePrice" defaultValue={editingPlayer.basePrice || ''} min="0" placeholder="e.g., 5000" /></div>
                <div className="space-y-1">
                  <Label>Sold Price (৳)</Label>
                  <Input type="number" name="soldPrice" defaultValue={editingPlayer.soldPrice || ''} min="0" placeholder="Auction sale price" />
                  <p className="text-xs text-muted-foreground">Price paid in auction (if sold)</p>
                </div>
                <div className="space-y-1"><Label>Phone</Label><Input type="tel" name="phone" defaultValue={editingPlayer.phone} /></div>
                <div className="space-y-1"><Label>Email</Label><Input type="email" name="email" defaultValue={editingPlayer.email} /></div>
                <div className="col-span-2 space-y-1"><Label>Assign to Team</Label>
                  <select name="team" defaultValue={editingPlayer.team || ''} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">Unassigned</option>
                    {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingPlayer(null)}>Cancel</Button>
                <Button type="submit">Update Player</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Player Modal */}
      <Dialog open={!!viewingPlayer} onOpenChange={(o) => !o && setViewingPlayer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Player Details</DialogTitle></DialogHeader>
          {viewingPlayer && (
            <div className="space-y-2 text-sm">
              {[['Name', viewingPlayer.name], ['University ID', viewingPlayer.uniId], ['Semester', viewingPlayer.semester], ['Department', viewingPlayer.department], ['Age', viewingPlayer.age], ['Jersey', viewingPlayer.jerseyNumber || '—'], ['Position', viewingPlayer.position], ['Category', viewingPlayer.category || '—'], ['Base Price', viewingPlayer.basePrice ? `৳${Number(viewingPlayer.basePrice).toLocaleString()}` : '—'], ['Sold Price', viewingPlayer.soldPrice ? `৳${Number(viewingPlayer.soldPrice).toLocaleString()}` : '—'], ['Phone', viewingPlayer.phone], ['Email', viewingPlayer.email], ['Team', viewingPlayer.team || 'Unassigned']].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-border last:border-0">
                  <span className="font-medium text-muted-foreground">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setViewingPlayer(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Modal */}
      <Dialog open={showCsvModal} onOpenChange={setShowCsvModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Upload Players via CSV</DialogTitle></DialogHeader>
          <div>
            
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">📋 CSV Format Requirements:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Required columns:</strong> name, uniId, semester, department, age, position, phone, email</p>
                  <p><strong>Optional columns:</strong> team</p>
                  <p><strong>Example:</strong></p>
                  <div className="bg-white border rounded p-2 mt-2 font-mono text-xs">
                    name,uniId,semester,department,age,position,phone,email,team<br/>
                    John Doe,UIU-2021-001,5th,CSE,22,Forward,01712345678,john@example.com,UIU Tigers<br/>
                    Jane Smith,UIU-2021-002,6th,EEE,23,Midfielder,01798765432,jane@example.com,<br/>
                    Mike Johnson,UIU-2021-003,7th,BBA,24,Defender,01687654321,mike@example.com,UIU Eagles
                  </div>
                </div>
              </div>

              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                  dragOver 
                    ? 'border-[#D0620D] bg-orange-50' 
                    : 'border-gray-300 hover:border-gray-400'
                } ${csvUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleCsvUpload(file);
                    }
                  }}
                  className="hidden"
                  id="csv-upload"
                  disabled={csvUploading}
                />
                <label 
                  htmlFor="csv-upload" 
                  className={`cursor-pointer block ${csvUploading ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="space-y-2">
                    <div className={`text-4xl transition-transform duration-200 ${dragOver ? 'scale-110' : ''}`}>
                      {dragOver ? '📥' : '📄'}
                    </div>
                    <div className="text-lg font-medium text-gray-900">
                      {csvUploading 
                        ? 'Processing CSV...' 
                        : dragOver 
                          ? 'Drop CSV file here' 
                          : 'Click to upload or drag & drop CSV file'
                      }
                    </div>
                    <div className="text-sm text-gray-500">
                      {csvUploading 
                        ? 'Please wait while we create your players' 
                        : dragOver 
                          ? 'Release to upload the file'
                          : 'Select a CSV file with player data or drag it here'
                      }
                    </div>
                  </div>
                </label>
              </div>

              {csvUploading && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D0620D] mr-2"></div>
                  <span className="text-gray-600">Creating players in Firebase...</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowCsvModal(false)} disabled={csvUploading}>
                {csvUploading ? 'Processing...' : 'Cancel'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => { const c = "name,uniId,semester,department,age,position,category,jerseyNumber,basePrice,phone,email,team\nJohn Doe,UIU-2021-001,5th,CSE,22,Striker,A,10,5000,01712345678,john@example.com,UIU Tigers"; const b = new Blob([c], { type: 'text/csv' }); const u = window.URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'players_sample.csv'; a.click(); window.URL.revokeObjectURL(u); }}>
                📥 Download Sample
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Random Assignment Modal */}
      <Dialog open={showRandomAssignModal} onOpenChange={setShowRandomAssignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Random Player Assignment</DialogTitle></DialogHeader>
          <div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                This will randomly assign <strong>maximum 6 players per team</strong> from the selected category across all available teams.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Policy:</strong> Each team gets exactly 6 players from each category. If more players are available, they remain unassigned for future use.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Warning:</strong> This action cannot be undone. Players will be distributed evenly across available teams.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Select Category to Assign</Label>
                <select value={selectedCategoryForAssign} onChange={(e) => setSelectedCategoryForAssign(e.target.value)} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Choose a category...</option>
                  <option value="A">Category A</option>
                  <option value="B">Category B</option>
                </select>
              </div>

              {selectedCategoryForAssign && (
                <div className="mt-3 text-sm text-gray-600">
                  {(() => {
                    const unassignedCount = players.filter(p => !p.team && p.category === selectedCategoryForAssign).length;
                    const maxAssignable = teams.length * 6;
                    const willAssign = Math.min(unassignedCount, maxAssignable);
                    const willRemain = unassignedCount - willAssign;
                    
                    return (
                      <>
                        <p>
                          <strong>Unassigned players in Category {selectedCategoryForAssign}:</strong> {unassignedCount}
                        </p>
                        <p>
                          <strong>Available teams:</strong> {teams.length}
                        </p>
                        <p>
                          <strong>Will assign:</strong> {willAssign} players (6 per team)
                        </p>
                        {willRemain > 0 && (
                          <p className="text-orange-600">
                            <strong>Will remain unassigned:</strong> {willRemain} players
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => { setShowRandomAssignModal(false); setSelectedCategoryForAssign(''); }} disabled={assignmentLoading}>Cancel</Button>
              <Button type="button" onClick={handleRandomAssignment} disabled={assignmentLoading || !selectedCategoryForAssign}>
                {assignmentLoading ? 'Assigning...' : '🎲 Start Random Assignment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}
