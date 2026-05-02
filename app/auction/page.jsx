'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { teamsService, playersService } from '../../lib/firebaseService';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import { logger } from '../../lib/logger';
import { useToast } from '../../lib/useToast';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';

export default function Auction() {
  const { currentUser, isAdmin } = useAuth();
  const [teams, setTeams] = useState([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState([]);
  const [allUnassignedPlayers, setAllUnassignedPlayers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('A');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [bidHistory, setBidHistory] = useState([]);
  const [currentBids, setCurrentBids] = useState([]);
  const [highestBid, setHighestBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState('');
  const [auctionTimer, setAuctionTimer] = useState(59); // 59 seconds per player
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [showAssignmentResult, setShowAssignmentResult] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadAuctionData();
  }, []);

  // Utility: shuffle array for random auction order
  const shuffle = (arr) => arr
    .map(item => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);

  // Re-filter players when category or source changes
  useEffect(() => {
    const filtered = allUnassignedPlayers.filter(p => {
      // If category missing on player, exclude when filtering
      return selectedCategory ? (p.category === selectedCategory) : true;
    });
    // Shuffle so a random player shows first for this category
    setUnassignedPlayers(shuffle(filtered));
    setCurrentPlayerIndex(0);
  }, [selectedCategory, allUnassignedPlayers]);

  // Timer effect for auction countdown
  useEffect(() => {
    let interval;
    if (isAuctionActive && auctionTimer > 0) {
      interval = setInterval(() => {
        setAuctionTimer(prev => prev - 1);
      }, 1000);
    } else if (auctionTimer === 0 && isAuctionActive) {
      // Time's up - mark as expired but don't auto-assign
      setIsTimeExpired(true);
    }
    return () => clearInterval(interval);
  }, [isAuctionActive, auctionTimer]);

  // Start auction for current player
  const startAuction = () => {
    if (!currentUser || !isAdmin) {
      showToast('Only administrators can start the auction. Please log in as admin.', 'error');
      return;
    }
    setIsAuctionActive(true);
    setAuctionTimer(59);
    setCurrentBids([]);
    setHighestBid(0);
    setHighestBidder('');
    setIsTimeExpired(false);
  };

  // Confirm and assign player to highest bidder (manual confirmation)
  const confirmPlayerAssignment = async () => {
    if (!currentPlayer || !highestBidder) {
      // No bids, show skipped message and move to next player
      setAssignmentResult({
        player: currentPlayer,
        team: null,
        amount: 0,
        type: 'skipped'
      });
      setShowAssignmentResult(true);
      
      // Hide result after 3 seconds and move to next player
      setTimeout(() => {
        setShowAssignmentResult(false);
        moveToNextPlayer();
      }, 3000);
      return;
    }

    try {
      await playersService.assignToTeam(currentPlayer.id, highestBidder);
      await playersService.update(currentPlayer.id, { soldPrice: highestBid });
      
      // Update winning team's spent balance only on assignment
      const winningTeam = teams.find(t => t.name === highestBidder);
      if (winningTeam) {
        const total = winningTeam.totalBalance ?? 500000;
        const currentCommitted = (winningTeam.spent ?? 0);
        const remaining = total - currentCommitted;
        // Winner must be able to pay the winning bid at assignment time
        if (remaining < highestBid) {
          showToast(`Winner cannot afford the winning bid. Remaining: ৳${remaining.toLocaleString()}, Needed: ৳${highestBid.toLocaleString()}`, 'error');
          return;
        }
        const newSpent = (winningTeam.spent ?? 0) + highestBid;
        await teamsService.update(winningTeam.id, {
          totalBalance: winningTeam.totalBalance ?? 500000,
          spent: newSpent,
        });
        // Update local state
        setTeams(prev => prev.map(t => t.id === winningTeam.id ? { ...t, spent: newSpent, totalBalance: t.totalBalance ?? 500000 } : t));
      }

      // Add to bid history
      setBidHistory(prev => [
        { 
          team: highestBidder, 
          amount: highestBid, 
          time: 'Just now',
          player: currentPlayer.name
        },
        ...prev
      ]);
      
      // Show assignment result
      setAssignmentResult({
        player: currentPlayer,
        team: highestBidder,
        amount: highestBid,
        type: 'sold'
      });
      setShowAssignmentResult(true);
      
      // Hide result after 3 seconds and move to next player
      setTimeout(() => {
        setShowAssignmentResult(false);
        moveToNextPlayer();
      }, 3000);
      
    } catch (error) {
      logger.error('Error assigning player:', error);
      showToast('Failed to assign player. Please try again.', 'error');
    }
  };

  // Move to next player and reset auction state
  const moveToNextPlayer = () => {
    // Remove current player from unassigned list
    setUnassignedPlayers(prev => prev.filter((_, index) => index !== currentPlayerIndex));
    
    // Reset auction state for next player
    setIsAuctionActive(false);
    setCurrentBids([]);
    setHighestBid(0);
    setHighestBidder('');
    setBidAmount('');
    setSelectedTeam('');
    setAuctionTimer(59);
    setIsTimeExpired(false);
    
    // Don't increment currentPlayerIndex since we removed the current player from array
    // The next player will automatically be at the same index
  };

  const loadAuctionData = async () => {
    try {
      setLoading(true);
      
      // Load teams and players in parallel
      const [teamsData, playersData] = await Promise.all([
        teamsService.getAll(),
        playersService.getAll()
      ]);
      
      // Filter unassigned players and store
      const unassigned = playersData.filter(player => !player.team);
      // Ensure balances have sane defaults on the client even if missing in DB
      setTeams(teamsData.map(t => ({
        ...t,
        totalBalance: t.totalBalance ?? 500000,
        spent: t.spent ?? 0,
      })));
      setAllUnassignedPlayers(unassigned);
      // Initial category filter (shuffled for random order)
      const initial = unassigned.filter(p => p.category === selectedCategory);
      setUnassignedPlayers(shuffle(initial));
    } catch (error) {
      logger.error('Error loading auction data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentPlayer = unassignedPlayers[currentPlayerIndex];
  const getCategoryBasePrice = (category) => {
    if (category === 'A') return 10000;
    if (category === 'B') return 5000;
    return 0;
  };
  const basePrice = currentPlayer ? getCategoryBasePrice(currentPlayer.category) : 0;

  // Next bid must be strictly greater than current highest; base price if no bids yet
  const requiredMinBid = highestBid > 0 ? (highestBid + 1) : basePrice;
  const selectedTeamObj = teams.find(t => t.name === selectedTeam);
  const selectedTeamTotal = selectedTeamObj?.totalBalance ?? 500000;
  const selectedTeamSpent = (selectedTeamObj?.spent ?? 0);
  const selectedTeamRemaining = selectedTeamTotal - selectedTeamSpent;

  // Bids do not deduct funds. Deduction happens only when assignment is confirmed.

  const handlePlaceBid = async () => {
    if (!currentUser || !isAdmin) {
      showToast('Only administrators can place bids. Please log in as admin.', 'error');
      return;
    }
    if (!bidAmount || !selectedTeam || !currentPlayer || !isAuctionActive) return;
    
    const bidAmountNum = parseInt(bidAmount);
    // Enforce: if highest exists, next bid must be greater than highest; else >= base price
    if (highestBid > 0) {
      if (bidAmountNum <= highestBid) {
        showToast(`Bid must be greater than current highest bid of ৳${highestBid.toLocaleString()}`, 'warning');
        return;
      }
    } else if (bidAmountNum < basePrice) {
      showToast(`Bid must be at least the base price ৳${basePrice.toLocaleString()}`, 'warning');
      return;
    }

    // No funds are deducted on bid placement. Deduction occurs only upon assignment confirmation.

    // Add bid to current bids
    const newBid = {
      team: selectedTeam,
      amount: bidAmountNum,
      time: new Date().toLocaleTimeString(),
      player: currentPlayer.name
    };

    setCurrentBids(prev => [newBid, ...prev]);
    
    // Update highest bid
    setHighestBid(bidAmountNum);
    setHighestBidder(selectedTeam);
    
    // Reset form
    setBidAmount('');
    setSelectedTeam('');
    
    // Extend timer by 5 seconds if less than 10 seconds left (but not if already expired)
    if (auctionTimer < 10 && auctionTimer > 0) {
      setAuctionTimer(prev => Math.min(prev + 5, 59));
    }
  };

  const skipPlayer = () => {
    // Move to next player without assigning current one
    moveToNextPlayer();
  };


  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0A0D13' }}>
      <Navbar />
      {/* Header */}
      <section className="pt-32 pb-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Live <span className="text-[#D0620D]">Auction</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Participate in the live player auction. Bid for the best players and build your dream team for the tournament.
            </p>
          </div>
        </div>
      </section>

      {/* Current Auction */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Admin Category Selector */}
          {isAdmin && (
            <div className="mb-6 flex items-center justify-center gap-2">
              {['A', 'B'].map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat)}
                >
                  Category {cat}
                </Button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D0620D] mx-auto mb-4"></div>
              <p className="text-gray-300">Loading auction data...</p>
            </div>
          ) : showAssignmentResult ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                {assignmentResult.type === 'sold' ? (
                  <div className="bg-green-900 border border-green-600 rounded-2xl p-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl font-bold text-white mb-4">SOLD!</h2>
                    <div className="space-y-3">
                      <p className="text-xl text-white font-semibold">{assignmentResult.player.name}</p>
                      <p className="text-green-300">
                        Assigned to <strong>{assignmentResult.team}</strong>
                      </p>
                      <p className="text-2xl font-bold text-green-400">
                        ৳{assignmentResult.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-900 border border-yellow-600 rounded-2xl p-8">
                    <div className="text-6xl mb-4">⏭️</div>
                    <h2 className="text-3xl font-bold text-white mb-4">SKIPPED</h2>
                    <div className="space-y-3">
                      <p className="text-xl text-white font-semibold">{assignmentResult.player.name}</p>
                      <p className="text-yellow-300">No bids received</p>
                      <p className="text-gray-400">Moving to next player...</p>
                    </div>
                  </div>
                )}
                <div className="mt-6">
                  <div className="text-gray-400 text-sm">Next player in 3 seconds...</div>
                </div>
              </div>
            </div>
          ) : !currentPlayer || unassignedPlayers.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="text-4xl font-bold text-white mb-4">{allUnassignedPlayers.length === 0 ? 'Auction Complete!' : 'No players in this category'}</h2>
              <p className="text-gray-300 mb-6">
                {allUnassignedPlayers.length === 0 
                  ? 'All players have been assigned to teams.' 
                  : `There are no unassigned players in Category ${selectedCategory}.`}
              </p>
              <Link href="/teams" className="bg-[#D0620D] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#B8540B] transition-colors">
                View Teams
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Player Info */}
              <div className="lg:col-span-2">
                <div className="border border-gray-700 rounded-2xl p-8" style={{ backgroundColor: '#0A0D13' }}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="inline-flex items-center space-x-2 border border-[#D0620D] rounded-full px-4 py-2">
                      <div className="w-2 h-2 bg-[#D0620D] rounded-full animate-pulse"></div>
                      <span className="text-[#D0620D] text-sm font-medium uppercase tracking-wider">Live Auction</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${auctionTimer <= 10 && !isTimeExpired ? 'text-red-500 animate-pulse' : isTimeExpired ? 'text-yellow-500' : 'text-[#D0620D]'}`}>
                        {isAuctionActive ? (isTimeExpired ? 'EXPIRED' : `${auctionTimer}s`) : `${currentPlayerIndex + 1}/${unassignedPlayers.length}`}
                      </div>
                      <div className="text-gray-300 text-sm">
                        {isAuctionActive ? (isTimeExpired ? 'Bidding continues' : 'Time Left') : 'Player Progress'}
                      </div>
                    </div>
                  </div>

                  {(!currentUser || !isAdmin) && (
                    <div className="mb-6 p-4 border border-yellow-600 bg-yellow-900 rounded-lg text-yellow-200 text-sm">
                      Only administrators can start auctions and place bids. Please log in as admin.
                    </div>
                  )}

                  {/* Time Expired Notice */}
                  {isTimeExpired && isAuctionActive && (
                    <div className="mb-6 p-4 border border-yellow-600 bg-yellow-900 rounded-lg text-yellow-200 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-400">⏰</span>
                        <span><strong>Time Expired!</strong> Bidding can continue. Click "Confirm Assignment" to finalize the sale.</span>
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <div className="w-64 h-64 bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-700 mx-auto mb-6 overflow-hidden">
                        <img
                          src={`/api/student-avatar?std=${encodeURIComponent(currentPlayer.uniId || '')}`}
                          alt={`${currentPlayer.name} photo`}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">{currentPlayer.name}</h2>
                      {/* Base Price */}
                      <div className="mb-4">
                        <span className="bg-gray-800 px-3 py-1 rounded-full text-sm inline-block">Base: ৳{basePrice.toLocaleString()}</span>
                      </div>
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center space-x-2">
                          <span className="bg-[#D0620D] px-3 py-1 rounded-full text-sm text-white">{currentPlayer.position}</span>
                          <span className="bg-gray-800 px-3 py-1 rounded-full text-sm">Age: {currentPlayer.age}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-gray-800 px-3 py-1 rounded-full text-sm">{currentPlayer.department}</span>
                          <span className="bg-gray-800 px-3 py-1 rounded-full text-sm">{currentPlayer.semester}</span>
                        </div>
                        <div className="bg-gray-800 px-3 py-1 rounded-full text-sm inline-block">ID: {currentPlayer.uniId}</div>
                      </div>

                      {/* Current Bid Status - only when there is at least one bid */}
                      {highestBid > 0 && (
                        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300">Current Highest Bid:</span>
                            <span className="text-[#D0620D] font-bold text-xl">৳{highestBid.toLocaleString()}</span>
                          </div>
                          {highestBidder && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300">Leading Team:</span>
                              <span className="text-white font-semibold">{highestBidder}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-4">
                        {!isAuctionActive ? (
                          <Button 
                            onClick={startAuction}
                            className="w-full"
                          >
                            Start Auction
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm text-gray-300">
                              <span>Auction Active</span>
                            </div>
                            {/* Team Selection */}
                            <div className="space-y-2">
                              <label className="text-gray-300 text-sm font-medium">Select Team</label>
                              <div className="grid grid-cols-2 gap-2">
                                {teams.map((team) => (
                                  <Button
                                    key={team.id}
                                    variant={selectedTeam === team.name ? 'default' : 'outline'}
                                    onClick={() => (currentUser && isAdmin) && setSelectedTeam(team.name)}
                                    disabled={!currentUser || !isAdmin}
                                    className="justify-start"
                                  >
                                    {team.name}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Bid Amount */}
                            <div className="space-y-2">
                              <label className="text-gray-300 text-sm font-medium">Enter Bid Amount</label>
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <Input
                                    type="number"
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(e.target.value)}
                                    placeholder={isAuctionActive ? `Min: ৳${requiredMinBid.toLocaleString()}` : 'Start auction to place bids'}
                                    disabled={!currentUser || !isAdmin || !isAuctionActive || !currentPlayer}
                                  />
                                </div>
                                <Button 
                                  onClick={handlePlaceBid}
                                  disabled={!currentUser || !isAdmin || !bidAmount || !selectedTeam || parseInt(bidAmount) < (highestBid > 0 ? highestBid + 1 : basePrice)}
                                  className="w-full"
                                >
                                  Place Bid
                                </Button>
                              </div>
                              <p className="text-gray-400 text-xs">
                                {highestBid > 0 
                                  ? `Minimum next bid: > ৳${highestBid.toLocaleString()}` 
                                  : `Minimum bid: ৳${basePrice.toLocaleString()}`}
                              </p>
                              {selectedTeam && (
                                <div className="text-gray-400 text-xs mt-1">
                                  Team Remaining: ৳{selectedTeamRemaining.toLocaleString()} • Required (Base + Bid): ৳{(basePrice + (parseInt(bidAmount||'0')||0)).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-3">
                          {/* Confirm Assignment Button - Only when there are bids */}
                          {isAuctionActive && highestBid > 0 && (
                            <Button 
                              onClick={confirmPlayerAssignment}
                              disabled={!currentUser || !isAdmin}
                              className="flex-1"
                            >
                              Confirm Assignment
                            </Button>
                          )}
                          
                          <Button 
                            variant="outline"
                            onClick={skipPlayer}
                            disabled={isAuctionActive && !isTimeExpired}
                            className="flex-1"
                          >
                            {isAuctionActive ? 'Skip (Time expired)' : 'Skip Player'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {/* Bid History & Team Status */}
            <div className="space-y-6">
              {/* Current Auction Bids */}
              <div className="border border-gray-700 rounded-xl p-6" style={{ backgroundColor: '#0A0D13' }}>
                <h3 className="text-xl font-bold text-white mb-4">
                  {isAuctionActive ? 'Current Bids' : 'Recent Sales'}
                </h3>
                <div className="space-y-3">
                  {isAuctionActive ? (
                    currentBids.length > 0 ? currentBids.map((bid, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div>
                          <div className="text-white font-semibold text-sm">{bid.team}</div>
                          <div className="text-gray-400 text-xs">{bid.time}</div>
                        </div>
                        <div className={`font-bold ${bid.amount === highestBid ? 'text-green-500' : 'text-gray-400'}`}>
                          ৳{bid.amount.toLocaleString()}
                          {bid.amount === highestBid && <span className="ml-2 text-xs">HIGHEST</span>}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-4">
                        <p className="text-gray-400">No bids placed yet</p>
                        <p className="text-gray-500 text-xs mt-1">Start the auction to begin bidding</p>
                      </div>
                    )
                  ) : (
                    bidHistory.length > 0 ? bidHistory.slice(0, 5).map((bid, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div>
                          <div className="text-white font-semibold text-sm">{bid.player}</div>
                          <div className="text-gray-400 text-xs">Sold to {bid.team} • {bid.time}</div>
                        </div>
                        <div className="text-[#D0620D] font-bold">৳{bid.amount.toLocaleString()}</div>
                      </div>
                    )) : (
                      <div className="text-center py-4">
                        <p className="text-gray-400">No sales yet</p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Team Status */}
              <div className="border border-gray-700 rounded-xl p-6" style={{ backgroundColor: '#0A0D13' }}>
                <h3 className="text-xl font-bold text-white mb-4">Teams</h3>
                <div className="space-y-3">
                  {teams.map((team, index) => (
                    <div key={team.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {team.logo ? (
                          <img 
                            src={team.logo} 
                            alt={`${team.name} logo`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: team.color }}
                          >
                            {team.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-white font-semibold text-sm">{team.name}</div>
                          <div className="text-gray-400 text-xs">Captain: {team.captain || 'Not assigned'}</div>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-gray-300">Spent: <span className="text-white font-semibold">৳{((team.spent ?? 0)).toLocaleString()}</span> / <span className="text-white font-semibold">৳{(team.totalBalance ?? 500000).toLocaleString()}</span></div>
                        <div className="text-gray-400">Remaining: <span className="text-[#D0620D] font-bold">৳{(((team.totalBalance ?? 500000) - (team.spent ?? 0))).toLocaleString()}</span></div>
                        <div className="text-gray-500 mt-1">Players: {bidHistory.filter(bid => bid.team === team.name).length}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </section>

      {/* Upcoming Players */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-white mb-8 text-center">Upcoming Players</h3>
          {unassignedPlayers.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {unassignedPlayers.slice(currentPlayerIndex + 1, currentPlayerIndex + 9).map((player, index) => (
                <div key={player.id} className="border border-gray-700 rounded-xl p-6 text-center hover:border-[#D0620D] transition-all duration-300" style={{ backgroundColor: '#0A0D13' }}>
                  <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                    <img
                      src={`/api/student-avatar?std=${encodeURIComponent(player.uniId || '')}`}
                      alt={`${player.name} photo`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{player.name}</h4>
                  <div className="space-y-2 mb-4">
                    <p className="text-[#D0620D] font-semibold">{player.position}</p>
                    <p className="text-gray-300 text-sm">{player.department} • {player.semester}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">University ID</p>
                    <p className="text-white font-bold text-sm">{player.uniId}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400">No more players in queue</p>
            </div>
          )}
        </div>
      </section>

      {/* Auction Statistics */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-white mb-8 text-center">Auction Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-[#D0620D]">{unassignedPlayers.length + bidHistory.length}</div>
              <div className="text-gray-300">Total Players</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-[#D0620D]">{bidHistory.length}</div>
              <div className="text-gray-300">Players Assigned</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-[#D0620D]">
                {bidHistory.length > 0 ? `৳${Math.max(...bidHistory.map(b => b.amount)).toLocaleString()}` : '৳0'}
              </div>
              <div className="text-gray-300">Highest Bid</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-[#D0620D]">{unassignedPlayers.length}</div>
              <div className="text-gray-300">Remaining</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}