'use client';
import { useState, useEffect } from 'react';
import { teamsService, playersService, userService } from '../../../../lib/firebaseService';
import { uploadToCloudinary } from '../../../../lib/cloudinary';
import { useAuth } from '../../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { logger } from '../../../../lib/logger';
import { useToast } from '../../../../lib/useToast';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Badge } from '../../../../components/ui/badge';
import { Skeleton } from '../../../../components/ui/skeleton';
import { Avatar } from '../../../../components/ui/avatar';
import { Select } from '../../../../components/ui/select';
import { Separator } from '../../../../components/ui/separator';
import { Trash2, Edit, Eye, EyeOff, Upload, Plus } from 'lucide-react';

export default function TeamManagement() {
  const { currentUser, isAdmin, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [editingTeam, setEditingTeam] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const { showToast } = useToast();

  const handleViceCaptainChange = async (teamId, viceCaptainName) => {
    try {
      await teamsService.update(teamId, { viceCaptain: viceCaptainName });
      setTeams(teams.map(team => 
        team.id === teamId ? { ...team, viceCaptain: viceCaptainName } : team
      ));

      const team = teams.find(t => t.id === teamId);
      const teamName = team ? team.name : 'Team';
      if (viceCaptainName) {
        showToast(`${viceCaptainName} set as vice captain of ${teamName}!`, 'success');
      } else {
        showToast(`Vice captain removed from ${teamName}!`, 'success');
      }
    } catch (error) {
      logger.error('Error updating vice captain:', error);
      showToast('Failed to update vice captain. Please try again.', 'error');
    }
  };

  // Check authentication and load teams
  useEffect(() => {
    logger.log('🛡️ TeamManagement: Auth check', {
      authLoading,
      hasUser: !!currentUser,
      userEmail: currentUser?.email,
      userRole,
      isAdmin,
      timestamp: new Date().toISOString()
    });
    
    // Don't redirect while auth is still loading OR if userRole is not set yet
    if (authLoading || (currentUser && userRole === null)) {
      logger.log('⏳ TeamManagement: Still loading auth or role, waiting...', {
        authLoading,
        hasUser: !!currentUser,
        userRole
      });
      return;
    }
    
    if (!currentUser) {
      logger.log('🚫 TeamManagement: No user, redirecting to login');
      router.push('/login');
      return;
    }

    if (!isAdmin) {
      logger.log('🚫 TeamManagement: Not admin, redirecting to team dashboard', {
        userRole,
        isAdmin,
        userEmail: currentUser?.email
      });
      router.push('/team-dashboard'); // Redirect team owners to their dashboard
      return;
    }

    logger.log('✅ TeamManagement: Admin access confirmed, loading teams');
    loadTeamsWithPlayerCounts();
  }, [currentUser, isAdmin, authLoading, router, userRole]);

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
      setPlayers(playersData);
    } catch (error) {
      logger.error('Error loading teams:', error);
      showToast('Failed to load teams. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeam = (team) => {
    setDeleteConfirm(null);
    setEditingTeam(team);
  };

  // ===== Teams CSV Upload Helpers =====
  const processTeamsCsvFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n').filter(Boolean);
          if (lines.length === 0) return resolve([]);
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

          // Required headers: name. Optional: email, captain, mentor, logo
          const requiredHeaders = ['name'];
          const missing = requiredHeaders.filter(h => !headers.includes(h));
          if (missing.length > 0) {
            reject(new Error(`Missing required columns: ${missing.join(', ')}`));
            return;
          }

          const out = [];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const values = line.split(',').map(v => v.trim());
            const row = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
            if (!row.name) continue;
            out.push({
              name: row.name,
              email: row.email || '',
              captain: row.captain || '',
              mentor: row.mentor || '',
              logo: row.logo || ''
            });
          }
          resolve(out);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleCsvUpload = async (file) => {
    try {
      setCsvUploading(true);
      const teamRows = await processTeamsCsvFile(file);
      if (teamRows.length === 0) {
        showToast('No valid rows found in CSV.', 'error');
        return;
      }
      const created = [];
      for (const row of teamRows) {
        // Upload logo if provided as URL? If it's a URL, we just save it. No file upload in CSV path.
        let ownerId = null;
        let generatedPassword = null;
        if (row.email) {
          try {
            const creds = await userService.createTeamOwner(row.email, row.name);
            ownerId = creds.uid;
            generatedPassword = creds.password;
          } catch (e) {
            logger.error('Failed to create owner from CSV row:', row.name, e);
          }
        }
        const teamData = {
          name: row.name,
          captain: row.captain || '',
          mentor: row.mentor || '',
          email: row.email || '',
          ownerId,
          generatedPassword,
          logo: row.logo || null,
          color: '#D0620D'
        };
        const id = await teamsService.create(teamData);
        created.push({ id, ...teamData, players: 0 });
      }
      setTeams([...teams, ...created]);
      setShowCsvModal(false);
      showToast(`Imported ${created.length} team(s) successfully.`, 'success');
    } catch (error) {
      logger.error('CSV import failed:', error);
      showToast(`CSV import failed: ${error.message}`, 'error');
    } finally {
      setCsvUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleCsvUpload(file);
  };

  // Toggle password visibility
  const togglePasswordVisibility = (teamId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const handleCaptainChange = async (teamId, captainName) => {
    try {
      // Update team captain in Firebase
      await teamsService.update(teamId, { captain: captainName });
      
      // Update local state
      setTeams(teams.map(team => 
        team.id === teamId ? { ...team, captain: captainName } : team
      ));
      
      // Find team name for toast message
      const team = teams.find(t => t.id === teamId);
      const teamName = team ? team.name : 'Team';
      
      if (captainName) {
        showToast(`${captainName} successfully set as captain of ${teamName}!`, 'success');
      } else {
        showToast(`Captain removed from ${teamName}!`, 'success');
      }
    } catch (error) {
      logger.error('Error updating captain:', error);
      showToast('Failed to update captain. Please try again.', 'error');
    }
  };

  const handleSaveTeam = async (updatedTeamData, logoFile) => {
    try {
      setUploading(true);
      
      // Upload new logo if provided
      let logoUrl = editingTeam.logo; // Keep existing logo by default
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }
      
      // Determine email changes and create credentials if needed
      const newEmail = (updatedTeamData.email || '').trim();
      let ownerId = editingTeam.ownerId || null;
      let generatedPassword = editingTeam.generatedPassword || null;
      if (newEmail && newEmail !== (editingTeam.email || '')) {
        try {
          const creds = await userService.createTeamOwner(newEmail, updatedTeamData.name || editingTeam.name);
          ownerId = creds.uid;
          generatedPassword = creds.password;
          showToast(`Owner account created. Email: ${creds.email} Password: ${creds.password}`, 'success');
        } catch (err) {
          logger.error('Error creating owner for updated email:', err);
          showToast('Failed to create owner account for the provided email.', 'error');
        }
      }

      // Create updated team data
      const updatedTeam = {
        ...editingTeam,
        name: updatedTeamData.name,
        logo: logoUrl,
        mentor: updatedTeamData.mentor || '',
        email: newEmail || editingTeam.email || '',
        ownerId,
        generatedPassword
      };
      
      // Update in Firebase
      await teamsService.update(editingTeam.id, updatedTeam);
      
      // Update local state
      setTeams(teams.map(team => 
        team.id === editingTeam.id ? updatedTeam : team
      ));
      
      setEditingTeam(null);
      showToast('Team updated successfully!', 'success');
    } catch (error) {
      logger.error('Error updating team:', error);
      showToast('Failed to update team. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const uploadLogo = async (file) => {
    if (!file) return null;
    
    try {
      logger.log('Starting Cloudinary upload...', file.name);
      
      const result = await uploadToCloudinary(file);
      
      logger.log('Cloudinary upload successful:', result);
      return result.url;
    } catch (error) {
      logger.error('Cloudinary upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  };

  const handleAddTeam = async (newTeamData, logoFile) => {
    try {
      setUploading(true);
      
      // Upload logo if provided
      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }
      
      // Create team owner account
      let ownerCredentials = null;
      try {
        ownerCredentials = await userService.createTeamOwner(newTeamData.email, newTeamData.name);
        
        // Show success message with credentials
        showToast(`Team created! Owner: ${ownerCredentials.email} | Password: ${ownerCredentials.password}`, 'success', 8000);
        
      } catch (error) {
        logger.error('Error creating team owner account:', error);
        showToast('Failed to create team owner account. Please check if email is already in use.', 'error');
        return;
      }
      
      // Create team data (without players count - will be calculated)
      const teamData = {
        name: newTeamData.name,
        captain: '', // Will be set later when captain is selected
        email: newTeamData.email,
        ownerId: ownerCredentials.uid,
        generatedPassword: ownerCredentials.password,
        logo: logoUrl,
        color: '#D0620D',
        mentor: newTeamData.mentor || ''
      };
      
      // Save to Firebase
      const teamId = await teamsService.create(teamData);
      
      // Add to local state with 0 players initially
      setTeams([...teams, { id: teamId, ...teamData, players: 0 }]);
      setShowAddModal(false);
      
    } catch (error) {
      logger.error('Error adding team:', error);
      showToast('Failed to add team. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTeam = (teamId) => {
    const teamToDelete = teams.find(team => team.id === teamId);
    if (!teamToDelete) return;

    // Show custom delete confirmation modal
    setDeleteConfirm({
      teamId,
      teamName: teamToDelete.name
    });
  };

  const confirmDeleteTeam = async () => {
    if (!deleteConfirm) return;

    try {
      const { teamId, teamName } = deleteConfirm;
      
      // First, get all players assigned to this team
      const allPlayers = await playersService.getAll();
      const playersInTeam = allPlayers.filter(player => player.team === teamName);
      
      // Unassign all players from this team
      const unassignPromises = playersInTeam.map(player => 
        playersService.assignToTeam(player.id, null)
      );
      
      // Wait for all players to be unassigned
      await Promise.all(unassignPromises);
      
      // Then delete the team
      await teamsService.delete(teamId);
      
      // Update local state
      setTeams(teams.filter(team => team.id !== teamId));
      
      // Close modal (no success message needed)
      setDeleteConfirm(null);
    } catch (error) {
      logger.error('Error deleting team:', error);
      showToast('Failed to delete team. Please try again.', 'error');
      setDeleteConfirm(null);
    }
  };

  // Function to refresh player counts (can be called when players are assigned/unassigned)
  const refreshPlayerCounts = async () => {
    try {
      const playersData = await playersService.getAll();
      setTeams(prevTeams => 
        prevTeams.map(team => ({
          ...team,
          players: playersData.filter(player => player.team === team.name).length
        }))
      );
    } catch (error) {
      logger.error('Error refreshing player counts:', error);
    }
  };

  /* Removed legacy CSV helpers and duplicate drag handlers */

  // Show loading screen while auth is being determined or role is being loaded
  if (authLoading || (currentUser && userRole === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0D13' }}>
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-40 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
        <p className="text-gray-300">Manage tournament teams and their details</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle>All Teams ({teams.length})</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCsvModal(true)}
                disabled={uploading || csvUploading}
              >
                <Upload className="w-4 h-4 mr-1" /> Upload CSV
              </Button>
              <Button
                onClick={() => setShowAddModal(true)}
                disabled={uploading || csvUploading}
              >
                <Plus className="w-4 h-4 mr-1" /> {uploading ? 'Adding...' : 'Add New Team'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
        
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Captain / Vice Captain</TableHead>
              <TableHead>Mentor</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Players</TableHead>
              <TableHead className="text-center w-24">Actions</TableHead>
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
            ) : teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No teams found. Add your first team to get started.
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {team.logo ? (
                      <img src={team.logo} alt={`${team.name} logo`} className="w-10 h-10 rounded-full object-cover object-center" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground font-bold text-sm">
                        {team.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium">{team.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground leading-4">
                        <div>Spent: <span className="font-semibold text-foreground">৳{(() => {
                          const s = (team.spent ?? players.filter(p => p.team === team.name).reduce((a, p) => a + (Number(p.soldPrice) || 0), 0));
                          return Number(s + (team.raiseSpent ?? 0)).toLocaleString();
                        })()}</span></div>
                        <div>Left: <span className="font-semibold text-primary">৳{(() => {
                          const total = team.totalBalance ?? 500000;
                          const s = (team.spent ?? players.filter(p => p.team === team.name).reduce((a, p) => a + (Number(p.soldPrice) || 0), 0));
                          return Math.max(total - (s + (team.raiseSpent ?? 0)), 0).toLocaleString();
                        })()}</span></div>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {(() => {
                    const teamPlayers = players.filter(p => p.team === team.name);
                    if (teamPlayers.length === 0) return <span className="text-muted-foreground italic text-xs">No players assigned</span>;
                    return (
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs">Captain</Label>
                          <select value={team.captain || ''} onChange={(e) => handleCaptainChange(team.id, e.target.value)} className="mt-1 w-full px-2 py-1 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                            <option value="">Select Captain</option>
                            {teamPlayers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">Vice Captain</Label>
                          <select value={team.viceCaptain || ''} onChange={(e) => handleViceCaptainChange(team.id, e.target.value)} className="mt-1 w-full px-2 py-1 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                            <option value="">Select Vice Captain</option>
                            {teamPlayers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-sm">{team.mentor || <span className="text-muted-foreground italic">—</span>}</TableCell>
                <TableCell className="text-sm">{team.email || <span className="text-muted-foreground italic">—</span>}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{visiblePasswords[team.id] ? (team.generatedPassword || '—') : '••••••••'}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => togglePasswordVisibility(team.id)} title={visiblePasswords[team.id] ? 'Hide' : 'Show'}>
                      {visiblePasswords[team.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{team.players}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleEditTeam(team)} title="Edit Team">
                      <Edit className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteTeam(team.id)} title="Delete Team">
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

      <Dialog open={!!editingTeam} onOpenChange={(o) => !o && setEditingTeam(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Team</DialogTitle></DialogHeader>
          {editingTeam && (
            <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); const lf = f.get('logo'); handleSaveTeam({ name: f.get('name'), mentor: f.get('mentor'), email: f.get('email') }, lf && lf.size > 0 ? lf : null); }}>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-name">Team Name</Label>
                  <Input id="edit-name" name="name" defaultValue={editingTeam.name} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-mentor">Mentor Name</Label>
                  <Input id="edit-mentor" name="mentor" defaultValue={editingTeam.mentor || ''} placeholder="e.g., Dr. Rahman" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-email">Team Owner Email</Label>
                  <Input id="edit-email" type="email" name="email" defaultValue={editingTeam.email || ''} placeholder="e.g., owner@example.com" />
                  <p className="text-xs text-muted-foreground">If new email is provided, an owner account will be created.</p>
                </div>
                <div className="space-y-2">
                  <Label>Current Logo</Label>
                  <div className="mb-2">
                    {editingTeam.logo ? <img src={editingTeam.logo} alt="logo" className="w-16 h-16 rounded-full object-cover border" /> : <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">{editingTeam.name.substring(0,2).toUpperCase()}</div>}
                  </div>
                  <Label htmlFor="edit-logo">Update Logo</Label>
                  <Input id="edit-logo" type="file" name="logo" accept="image/*" className="file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:text-xs file:px-2 file:py-1" />
                </div>
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <strong>Current Players:</strong> {editingTeam.players}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingTeam(null)} disabled={uploading}>Cancel</Button>
                <Button type="submit" disabled={uploading}>{uploading ? 'Updating...' : 'Save Changes'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Team</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); const lf = f.get('logo'); handleAddTeam({ name: f.get('name'), captain: f.get('captain'), email: f.get('email'), mentor: f.get('mentor') }, lf && lf.size > 0 ? lf : null); }}>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="add-name">Team Name</Label>
                <Input id="add-name" name="name" required placeholder="e.g., UIU Thunders" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-mentor">Mentor Name</Label>
                <Input id="add-mentor" name="mentor" placeholder="e.g., Dr. Rahman" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-logo">Team Logo</Label>
                <Input id="add-logo" type="file" name="logo" accept="image/*" className="file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:text-xs file:px-2 file:py-1" />
                <p className="text-xs text-muted-foreground">Optional: JPG, PNG, etc.</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-email">Team Owner Email</Label>
                <Input id="add-email" type="email" name="email" required placeholder="e.g., owner@example.com" />
                <p className="text-xs text-muted-foreground">A login account will be created for the team owner</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" disabled={uploading}>{uploading ? 'Adding...' : 'Add Team'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCsvModal} onOpenChange={setShowCsvModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Upload Teams via CSV</DialogTitle></DialogHeader>
          <div>
            
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">📋 CSV Format Requirements:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Required columns:</strong> name</p>
                  <p><strong>Optional columns:</strong> email, captain, mentor, logo</p>
                  <p><strong>Example:</strong></p>
                  <div className="bg-white border rounded p-2 mt-2 font-mono text-xs">
                    name,email,captain,mentor,logo<br/>
                    UIU Tigers,owner1@example.com,Rafiqul Islam,Dr. Rahman,<br/>
                    UIU Eagles,owner2@example.com,Aminul Haque,,<br/>
                    UIU Lions,,Shahidul Rahman,Prof. Karim,
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
                        : 'Drop CSV file here or click to browse'
                      }
                    </div>
                  </div>
                </label>
              </div>

              {csvUploading && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D0620D] mr-2"></div>
                  <span className="text-gray-600">Creating teams in Firebase...</span>
                </div>
              )}
            </div>

          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete Team</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>&ldquo;{deleteConfirm?.teamName}&rdquo;</strong>?</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <strong>Warning:</strong> This will also unassign all players from this team.
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteTeam}>Delete Team</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
