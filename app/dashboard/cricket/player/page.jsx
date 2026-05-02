'use client';
import { useState, useEffect } from 'react';
import { cricketTeamsService, cricketPlayersService } from '../../../../lib/firebaseService';
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
import { UserCheck, Plus, Search, Trash2, Edit, Eye } from 'lucide-react';

const CRICKET_POSITIONS = [
  'Batsman',
  'Bowler',
  'All-Rounder',
  'Wicket-Keeper',
  'Wicket-Keeper Batsman',
];

const DEFAULT_BASE_PRICE = 5000;

export default function CricketPlayerManagement() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [viewingPlayer, setViewingPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadErrors, setUploadErrors] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPlayers();
  }, [players, searchTerm, positionFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [playersData, teamsData] = await Promise.all([
        cricketPlayersService.getAll(),
        cricketTeamsService.getAll()
      ]);
      setPlayers(playersData);
      setTeams(teamsData);
    } catch (error) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    let filtered = players;
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.uniId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (positionFilter !== 'all') {
      filtered = filtered.filter(p => p.position === positionFilter);
    }
    setFilteredPlayers(filtered);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const basePriceValue = f.get('basePrice');
      const basePrice = basePriceValue ? parseInt(basePriceValue) : DEFAULT_BASE_PRICE;
      await cricketPlayersService.create({
        name: f.get('name'),
        uniId: f.get('uniId'),
        semester: f.get('semester') || '',
        department: f.get('department') || '',
        age: f.get('age') ? parseInt(f.get('age')) : null,
        position: f.get('position'),
        jerseyNumber: f.get('jerseyNumber') ? parseInt(f.get('jerseyNumber')) : null,
        basePrice,
        is_24: f.get('is24') === 'on',
        phone: f.get('phone') || '',
        email: f.get('email') || '',
        battingStyle: f.get('battingStyle') || '',
        bowlingStyle: f.get('bowlingStyle') || '',
        team: null
      });
      showToast('Player added successfully', 'success');
      setShowAddModal(false);
      loadData();
    } catch (error) {
      showToast('Failed to add player', 'error');
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) return;
    try {
      await cricketPlayersService.delete(playerId);
      showToast('Player deleted successfully', 'success');
      loadData();
    } catch (error) {
      showToast('Failed to delete player', 'error');
    }
  };

  const handleDeleteAllPlayers = async () => {
    if (players.length === 0) {
      showToast('No players to delete.', 'warning');
      return;
    }
    const confirmed = confirm('Delete ALL cricket players? This cannot be undone.');
    if (!confirmed) return;

    try {
      setDeletingAll(true);
      await Promise.all(players.map((player) => cricketPlayersService.delete(player.id)));
      setPlayers([]);
      setFilteredPlayers([]);
      showToast('All players deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete all players', 'error');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleAssignPlayer = async (playerId, teamName) => {
    try {
      await cricketPlayersService.assignToTeam(playerId, teamName || null);
      showToast('Player assigned successfully', 'success');
      loadData();
    } catch (error) {
      showToast('Failed to assign player', 'error');
    }
  };

  // CSV file processing function for players
  const processCsvFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split(/\r?\n/).filter(Boolean);
          if (lines.length === 0) return resolve([]);

          const delimiter = lines[0].includes('\t') ? '\t' : ',';

          const normalizeHeader = (value) => value
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');

          const headerMap = {
            sl: 'sl',
            studentid: 'studentid',
            studentname: 'studentname',
            phone: 'phone',
            lastenrolledtrimester: 'lastenrolledtrimester',
            playingrole: 'playingrole',
            baseprice: 'baseprice',
            is24: 'is24',
            top24: 'is24',
            priority24: 'is24'
          };

          const headers = lines[0]
            .split(delimiter)
            .map((h) => headerMap[normalizeHeader(h)] || normalizeHeader(h));

          const requiredHeaders = ['studentid', 'studentname', 'playingrole'];
          const missing = requiredHeaders.filter((h) => !headers.includes(h));
          if (missing.length > 0) {
            throw new Error(`Missing required columns: ${missing.join(', ')}`);
          }

          const normalizeRole = (value) => {
            const raw = (value || '').trim().toLowerCase();
            if (!raw) return 'Batsman';
            if (raw.includes('all')) return 'All-Rounder';
            if (raw.includes('batsman')) return 'Batsman';
            if (raw.includes('bowler')) return 'Bowler';
            if (raw.includes('keeper') || raw.includes('wicket')) return 'Wicket-Keeper';
            return 'Batsman';
          };

          const parseBasePrice = (value) => {
            const parsed = parseInt(value);
            return Number.isFinite(parsed) ? parsed : DEFAULT_BASE_PRICE;
          };

          const parseIs24 = (value) => {
            const raw = (value || '').trim().toLowerCase();
            return ['1', 'true', 'yes', 'y'].includes(raw);
          };

          const out = [];
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(delimiter);
            const row = {};
            headers.forEach((h, idx) => { row[h] = values[idx] ? values[idx].trim() : ''; });

            if (!row.studentid || !row.studentname) continue;

            out.push({
              name: row.studentname,
              uniId: row.studentid,
              semester: row.lastenrolledtrimester || '',
              department: '',
              age: null,
              position: normalizeRole(row.playingrole),
              jerseyNumber: null,
              basePrice: parseBasePrice(row.baseprice),
              is_24: parseIs24(row.is24),
              phone: row.phone || '',
              email: '',
              battingStyle: '',
              bowlingStyle: '',
              team: null
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

  // Handle CSV upload and bulk player creation
  const handleCsvUpload = async (file) => {
    try {
      setCsvUploading(true);
      setUploadErrors(0);
      
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
      
      setUploadTotal(playersData.length);
      setUploadCount(0);

      // Create players in Firebase
      const createdPlayers = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (const playerData of playersData) {
        try {
          const playerId = await cricketPlayersService.create(playerData);
          createdPlayers.push({ id: playerId, ...playerData });
          successCount++;
          setUploadCount((count) => count + 1);
        } catch (err) {
          console.error('Error creating player:', playerData.name, err);
          errorCount++;
          setUploadErrors((count) => count + 1);
          setUploadCount((count) => count + 1);
        }
      }
      
      showToast(`CSV Upload Complete! Created: ${successCount} players. Failed: ${errorCount}`, 'success');
      
      // Update local state
      setPlayers(prevPlayers => [...prevPlayers, ...createdPlayers]);
      setFilteredPlayers(prevPlayers => [...prevPlayers, ...createdPlayers]);
      setShowCsvModal(false);
      
    } catch (error) {
      showToast(`Error processing CSV file: ${error.message}`, 'error');
    } finally {
      setCsvUploading(false);
    }
  };

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

  const handleEditPlayer = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const basePriceValue = f.get('basePrice');
      const basePrice = basePriceValue ? parseInt(basePriceValue) : DEFAULT_BASE_PRICE;
      await cricketPlayersService.update(editingPlayer.id, {
        name: f.get('name'),
        uniId: f.get('uniId'),
        semester: f.get('semester') || '',
        department: f.get('department') || '',
        age: f.get('age') ? parseInt(f.get('age')) : null,
        position: f.get('position'),
        jerseyNumber: f.get('jerseyNumber') ? parseInt(f.get('jerseyNumber')) : null,
        basePrice,
        soldPrice: f.get('soldPrice') ? parseInt(f.get('soldPrice')) : null,
        is_24: f.get('is24') === 'on',
        phone: f.get('phone') || '',
        email: f.get('email') || '',
        battingStyle: f.get('battingStyle') || '',
        bowlingStyle: f.get('bowlingStyle') || '',
        team: f.get('team') || null
      });
      showToast('Player updated successfully', 'success');
      setEditingPlayer(null);
      loadData();
    } catch (error) {
      showToast('Failed to update player', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            Cricket Player Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Register and manage cricket players</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCsvModal(true)} disabled={csvUploading}>
            📄 Upload CSV
          </Button>
          <Button variant="destructive" onClick={handleDeleteAllPlayers} disabled={csvUploading || deletingAll}>
            {deletingAll ? 'Deleting...' : 'Delete All'}
          </Button>
          <Button onClick={() => setShowAddModal(true)} disabled={csvUploading}>
            <Plus className="w-4 h-4" />
            Add Player
          </Button>
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Name, ID, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Position</Label>
              <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} style={{ height: '30px' }} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="all">All Positions</option>
                {CRICKET_POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Top 24</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Assign</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    Loading players...
                  </TableCell>
                </TableRow>
              ) : filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <span className="text-5xl">🏏</span>
                      <p className="font-medium">No cricket players registered yet</p>
                      <p className="text-sm">Add players manually or upload a CSV file</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowCsvModal(true)}>📄 Upload CSV</Button>
                        <Button size="sm" onClick={() => setShowAddModal(true)}>
                          <Plus className="w-4 h-4" />
                          Add Player
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted border flex items-center justify-center shrink-0">
                          <img src={`/api/student-avatar?std=${encodeURIComponent(player.uniId || '')}`} alt={player.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{player.name}</div>
                          <div className="text-xs text-muted-foreground">{player.uniId} · {player.semester}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{player.position}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{player.is_24 ? 'Yes' : 'No'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="text-muted-foreground">{player.department} · Age {player.age}</div>
                      <div className="text-xs text-muted-foreground">{player.phone}</div>
                    </TableCell>
                    <TableCell>
                      {player.team ? (() => {
                        const team = teams.find(t => t.name === player.team);
                        return (
                          <div className="flex items-center gap-2">
                            {team?.logo ? (
                              <img src={team.logo} alt={`${team.name} logo`} className="w-6 h-6 rounded-full object-cover object-center" />
                            ) : (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary text-primary-foreground font-bold text-xs">
                                {player.team.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <Badge className="bg-green-100 text-green-800">{player.team}</Badge>
                          </div>
                        );
                      })() : (
                        <Badge variant="secondary">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <select value={player.team || ''} onChange={(e) => handleAssignPlayer(player.id, e.target.value)} style={{ height: '30px' }} className="px-2 py-1 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
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

      {/* Add Player Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Cricket Player</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPlayer}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Full Name</Label><Input name="name" required /></div>
              <div className="space-y-1"><Label>University ID</Label><Input name="uniId" required /></div>
              <div className="space-y-1"><Label>Semester</Label>
                <select name="semester" style={{ height: '30px' }} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Select Semester</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => (
                    <option key={s} value={`${s}${s===1?'st':s===2?'nd':s===3?'rd':'th'}`}>
                      {s}{s===1?'st':s===2?'nd':s===3?'rd':'th'} Semester
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1"><Label>Department</Label>
                <select name="department" style={{ height: '30px' }} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Select Department</option>
                  <option value="CSE">Computer Science &amp; Engineering</option>
                  <option value="EEE">Electrical &amp; Electronic Engineering</option>
                  <option value="BBA">Business Administration</option>
                  <option value="Civil">Civil Engineering</option>
                  <option value="English">English</option>
                  <option value="Economics">Economics</option>
                </select>
              </div>
              <div className="space-y-1"><Label>Age</Label><Input type="number" name="age" min="18" max="35" /></div>
              <div className="space-y-1"><Label>Jersey Number</Label><Input type="number" name="jerseyNumber" min="1" max="99" /></div>
              <div className="space-y-1"><Label>Playing Position</Label>
                <select name="position" required style={{ height: '30px' }} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Select Position</option>
                  {CRICKET_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Top 24 Queue</Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" name="is24" className="h-4 w-4" />
                  <span>Mark player in first 24 sequence</span>
                </div>
              </div>
              <div className="space-y-1"><Label>Base Price (৳)</Label><Input type="number" name="basePrice" min="0" defaultValue={DEFAULT_BASE_PRICE} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input type="tel" name="phone" /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" name="email" /></div>
              <div className="space-y-1"><Label>Batting Style</Label>
                <select name="battingStyle" style={{ height: '30px' }} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Select</option>
                  <option value="Right-handed">Right-handed</option>
                  <option value="Left-handed">Left-handed</option>
                </select>
              </div>
              <div className="space-y-1"><Label>Bowling Style</Label>
                <select name="bowlingStyle" style={{ height: '30px' }} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                  <option value="">Select / N/A</option>
                  <option value="Right-arm Fast">Right-arm Fast</option>
                  <option value="Right-arm Medium">Right-arm Medium</option>
                  <option value="Right-arm Spin">Right-arm Spin</option>
                  <option value="Left-arm Fast">Left-arm Fast</option>
                  <option value="Left-arm Medium">Left-arm Medium</option>
                  <option value="Left-arm Spin">Left-arm Spin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit">Add Player</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={(o) => !o && setEditingPlayer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Player</DialogTitle></DialogHeader>
          {editingPlayer && (
            <form onSubmit={handleEditPlayer}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Full Name</Label><Input name="name" defaultValue={editingPlayer.name} required /></div>
                <div className="space-y-1"><Label>University ID</Label><Input name="uniId" defaultValue={editingPlayer.uniId} required /></div>
                <div className="space-y-1"><Label>Semester</Label>
                  <select name="semester" defaultValue={editingPlayer.semester} style={{ height: '30px' }} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">Select Semester</option>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => <option key={s} value={`${s}${s===1?'st':s===2?'nd':s===3?'rd':'th'}`}>{s}{s===1?'st':s===2?'nd':s===3?'rd':'th'} Semester</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Department</Label><Input name="department" defaultValue={editingPlayer.department} /></div>
                <div className="space-y-1"><Label>Age</Label><Input type="number" name="age" defaultValue={editingPlayer.age} min="18" max="35" /></div>
                <div className="space-y-1"><Label>Jersey Number</Label><Input type="number" name="jerseyNumber" defaultValue={editingPlayer.jerseyNumber || ''} min="1" max="99" /></div>
                <div className="space-y-1"><Label>Position</Label>
                  <select name="position" defaultValue={editingPlayer.position} required style={{ height: '30px' }} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">Select Position</option>
                    {CRICKET_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Top 24 Queue</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" name="is24" defaultChecked={Boolean(editingPlayer.is_24)} className="h-4 w-4" />
                    <span>Mark player in first 24 sequence</span>
                  </div>
                </div>
                <div className="space-y-1"><Label>Base Price (৳)</Label><Input type="number" name="basePrice" defaultValue={editingPlayer.basePrice ?? DEFAULT_BASE_PRICE} min="0" /></div>
                <div className="space-y-1">
                  <Label>Sold Price (৳)</Label>
                  <Input type="number" name="soldPrice" defaultValue={editingPlayer.soldPrice || ''} min="0" placeholder="Auction sale price" />
                  <p className="text-xs text-muted-foreground">Price paid in auction (if sold)</p>
                </div>
                <div className="space-y-1"><Label>Phone</Label><Input type="tel" name="phone" defaultValue={editingPlayer.phone || ''} /></div>
                <div className="space-y-1"><Label>Email</Label><Input type="email" name="email" defaultValue={editingPlayer.email || ''} /></div>
                <div className="space-y-1"><Label>Batting Style</Label>
                  <select name="battingStyle" defaultValue={editingPlayer.battingStyle || ''} style={{ height: '30px' }} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">Select</option>
                    <option value="Right-handed">Right-handed</option>
                    <option value="Left-handed">Left-handed</option>
                  </select>
                </div>
                <div className="space-y-1"><Label>Bowling Style</Label>
                  <select name="bowlingStyle" defaultValue={editingPlayer.bowlingStyle || ''} style={{ height: '30px' }} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">Select / N/A</option>
                    <option value="Right-arm Fast">Right-arm Fast</option>
                    <option value="Right-arm Medium">Right-arm Medium</option>
                    <option value="Right-arm Spin">Right-arm Spin</option>
                    <option value="Left-arm Fast">Left-arm Fast</option>
                    <option value="Left-arm Medium">Left-arm Medium</option>
                    <option value="Left-arm Spin">Left-arm Spin</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-1"><Label>Assign to Team</Label>
                  <select name="team" defaultValue={editingPlayer.team || ''} style={{ height: '30px' }} className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
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

      {/* View Player Dialog */}
      <Dialog open={!!viewingPlayer} onOpenChange={(o) => !o && setViewingPlayer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Player Details</DialogTitle></DialogHeader>
          {viewingPlayer && (
            <div className="space-y-2 text-sm">
              {Object.entries({
                'Name': viewingPlayer.name,
                'University ID': viewingPlayer.uniId,
                'Department': viewingPlayer.department,
                'Semester': viewingPlayer.semester,
                'Age': viewingPlayer.age,
                'Position': viewingPlayer.position,
                'Top 24 Queue': viewingPlayer.is_24 ? 'Yes' : 'No',
                'Jersey Number': viewingPlayer.jerseyNumber,
                'Base Price': viewingPlayer.basePrice ? `৳${viewingPlayer.basePrice.toLocaleString()}` : '—',
                'Sold Price': viewingPlayer.soldPrice ? `৳${viewingPlayer.soldPrice.toLocaleString()}` : '—',
                'Phone': viewingPlayer.phone || '—',
                'Email': viewingPlayer.email || '—',
                'Batting Style': viewingPlayer.battingStyle || '—',
                'Bowling Style': viewingPlayer.bowlingStyle || '—',
                'Team': viewingPlayer.team || 'Unassigned'
              }).map(([k, v]) => (
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
              {(csvUploading || uploadTotal > 0) && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                    <span>{csvUploading ? 'Uploading players...' : 'Upload complete'}</span>
                    <span>{uploadCount}/{uploadTotal}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-2 bg-[#D0620D] transition-all"
                      style={{ width: `${uploadTotal ? Math.round((uploadCount / uploadTotal) * 100) : 0}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Errors: {uploadErrors}
                  </div>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">📋 CSV Format Requirements:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Required columns:</strong> SL, Student ID, StudentName, Playing Role</p>
                  <p><strong>Optional columns:</strong> Phone, LastEnrolledTrimester, BasePrice, Is24</p>
                  <p><strong>Delimiter:</strong> tab or comma</p>
                  <p><strong>Example:</strong></p>
                  <div className="bg-white border rounded p-2 mt-2 font-mono text-xs">
                    SL,Student ID,StudentName,Phone,LastEnrolledTrimester,Playing Role,BasePrice,Is24<br/>
                    1,0112230633,Md.Hasin Al Jubaier Bhuiyan,8801934409370,Spring 2026,All,5000,true<br/>
                    2,114222016,Md. Rashedul Islam Razu,8801984845679,Spring 2026,Batsman,5000,false
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
