'use client';
import { useState, useEffect } from 'react';
import { cricketTeamsService, cricketPlayersService, userService } from '../../../../lib/firebaseService';
import { uploadToCloudinary } from '../../../../lib/cloudinary';
import { useToast } from '../../../../lib/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Separator } from '../../../../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { Users, Plus, Upload, Trophy, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

export default function CricketTeamManagement() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsData, playersData] = await Promise.all([
        cricketTeamsService.getAll(),
        cricketPlayersService.getAll()
      ]);
      setTeams(teamsData);
      setPlayers(playersData);
    } catch (error) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (file) => {
    if (!file) return null;
    try {
      const result = await uploadToCloudinary(file);
      return result.url;
    } catch (error) {
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
        showToast(`Team created! Owner: ${ownerCredentials.email} | Password: ${ownerCredentials.password}`, 'success', 8000);
      } catch (error) {
        showToast('Failed to create team owner account. Email may already be in use.', 'error');
        return;
      }

      // Create team data
      const teamData = {
        name: newTeamData.name,
        captain: '',
        viceCaptain: '',
        email: newTeamData.email,
        ownerId: ownerCredentials.uid,
        generatedPassword: ownerCredentials.password,
        logo: logoUrl,
        color: '#D0620D',
        mentor: newTeamData.mentor || ''
      };

      const teamId = await cricketTeamsService.create(teamData);

      if (ownerCredentials?.uid) {
        try {
          await userService.update(ownerCredentials.uid, { teamId, teamName: teamData.name });
        } catch (err) {
          showToast('Failed to link owner to team.', 'error');
        }
      }
      setTeams([...teams, { id: teamId, ...teamData }]);
      setShowAddModal(false);
    } catch (error) {
      showToast('Failed to add team. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      await cricketTeamsService.delete(teamId);
      showToast('Team deleted successfully', 'success');
      loadData();
    } catch (error) {
      showToast('Failed to delete team', 'error');
    }
  };

  const togglePasswordVisibility = (teamId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const handleCaptainChange = async (teamId, captainName) => {
    try {
      await cricketTeamsService.update(teamId, { captain: captainName });
      setTeams(teams.map(team => 
        team.id === teamId ? { ...team, captain: captainName } : team
      ));
      const team = teams.find(t => t.id === teamId);
      if (captainName) {
        showToast(`${captainName} set as captain of ${team?.name}!`, 'success');
      } else {
        showToast(`Captain removed from ${team?.name}!`, 'success');
      }
    } catch (error) {
      showToast('Failed to update captain', 'error');
    }
  };

  const handleViceCaptainChange = async (teamId, viceCaptainName) => {
    try {
      await cricketTeamsService.update(teamId, { viceCaptain: viceCaptainName });
      setTeams(teams.map(team => 
        team.id === teamId ? { ...team, viceCaptain: viceCaptainName } : team
      ));
      const team = teams.find(t => t.id === teamId);
      if (viceCaptainName) {
        showToast(`${viceCaptainName} set as vice captain of ${team?.name}!`, 'success');
      } else {
        showToast(`Vice captain removed from ${team?.name}!`, 'success');
      }
    } catch (error) {
      showToast('Failed to update vice captain', 'error');
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const nextName = formData.get('name');
      await cricketTeamsService.update(editingTeam.id, {
        name: nextName,
        mentor: formData.get('mentor') || '',
        color: formData.get('color') || editingTeam.color,
        logo: formData.get('logoUrl') || editingTeam.logo
      });
      if (editingTeam.ownerId) {
        try {
          await userService.update(editingTeam.ownerId, { teamId: editingTeam.id, teamName: nextName });
        } catch (err) {
          showToast('Failed to sync owner team info.', 'error');
        }
      }
      showToast('Team updated successfully', 'success');
      setEditingTeam(null);
      loadData();
    } catch (error) {
      showToast('Failed to update team', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Cricket Team Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage cricket teams for the tournament</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add Team
        </Button>
      </div>

      <Separator />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Teams', value: teams.length, icon: Users, color: 'text-blue-500' },
          { label: 'Players Assigned', value: players.filter(p => p.team).length, icon: Trophy, color: 'text-green-500' },
          { label: 'Category A', value: players.filter(p => p.category === 'A').length, icon: Trophy, color: 'text-orange-500' },
          { label: 'Category B', value: players.filter(p => p.category === 'B').length, icon: Trophy, color: 'text-purple-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Teams table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teams</CardTitle>
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    Loading teams...
                  </TableCell>
                </TableRow>
              ) : teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <span className="text-5xl">🏏</span>
                      <p className="font-medium">No cricket teams yet</p>
                      <p className="text-sm">Click &quot;Add Team&quot; to create the first team</p>
                      <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
                        <Plus className="w-4 h-4" />
                        Add First Team
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => {
                  const teamPlayers = players.filter(p => p.team === team.name);
                  return (
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
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">Captain</Label>
                            <select value={team.captain || ''} onChange={(e) => handleCaptainChange(team.id, e.target.value)} style={{ height: '30px' }} className="mt-1 w-full px-2 py-1 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                              <option value="">Select Captain</option>
                              {teamPlayers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Vice Captain</Label>
                            <select value={team.viceCaptain || ''} onChange={(e) => handleViceCaptainChange(team.id, e.target.value)} style={{ height: '30px' }} className="mt-1 w-full px-2 py-1 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                              <option value="">Select Vice Captain</option>
                              {teamPlayers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{team.mentor || '—'}</TableCell>
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
                        <Badge variant="secondary">
                          {teamPlayers.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => handleEditTeam(team)} title="Edit Team">
                            <Edit className="w-4 h-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteTeam(team.id)} title="Delete Team">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Team Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Cricket Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); const lf = f.get('logo'); handleAddTeam({ name: f.get('name'), email: f.get('email'), mentor: f.get('mentor') }, lf && lf.size > 0 ? lf : null); }}>
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

      {/* Edit Team Dialog */}
      <Dialog open={!!editingTeam} onOpenChange={(o) => !o && setEditingTeam(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          {editingTeam && (
            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div className="space-y-1">
                <Label>Team Name</Label>
                <Input name="name" defaultValue={editingTeam.name} required />
              </div>
              <div className="space-y-1">
                <Label>Mentor Name</Label>
                <Input name="mentor" defaultValue={editingTeam.mentor || ''} placeholder="e.g. Dr. Rahman" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Team Color</Label>
                  <Input name="color" type="color" defaultValue={editingTeam.color || '#D0620D'} />
                </div>
                <div className="space-y-1">
                  <Label>Current Logo</Label>
                  <div className="mb-2">
                    {editingTeam.logo ? <img src={editingTeam.logo} alt="logo" className="w-16 h-16 rounded-full object-cover border" /> : <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">{editingTeam.name.substring(0,2).toUpperCase()}</div>}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Team Logo URL</Label>
                <Input name="logoUrl" type="url" defaultValue={editingTeam.logo || ''} placeholder="https://..." />
              </div>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <strong>Current Players:</strong> {players.filter(p => p.team === editingTeam.name).length}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingTeam(null)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
