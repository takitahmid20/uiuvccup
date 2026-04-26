'use client';
import { useState, useEffect } from 'react';
import { cricketTeamsService, cricketPlayersService } from '../../lib/firebaseService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../lib/useToast';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import Link from 'next/link';

export default function CricketAuction() {
  const { currentUser, isAdmin } = useAuth();
  const [teams, setTeams] = useState([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState([]);
  const [allUnassignedPlayers, setAllUnassignedPlayers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('A');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentBids, setCurrentBids] = useState([]);
  const [highestBid, setHighestBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState('');
  const [auctionTimer, setAuctionTimer] = useState(59);
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [showAssignmentResult, setShowAssignmentResult] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadAuctionData();
  }, []);

  const shuffle = (arr) => arr
    .map(item => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);

  useEffect(() => {
    const filtered = allUnassignedPlayers.filter(p => {
      return selectedCategory ? (p.category === selectedCategory) : true;
    });
    setUnassignedPlayers(shuffle(filtered));
    setCurrentPlayerIndex(0);
  }, [selectedCategory, allUnassignedPlayers]);

  useEffect(() => {
    let interval;
    if (isAuctionActive && auctionTimer > 0) {
      interval = setInterval(() => {
        setAuctionTimer(prev => prev - 1);
      }, 1000);
    } else if (auctionTimer === 0 && isAuctionActive) {
      setIsTimeExpired(true);
    }
    return () => clearInterval(interval);
  }, [isAuctionActive, auctionTimer]);

  const loadAuctionData = async () => {
    try {
      setLoading(true);
      const [teamsData, playersData] = await Promise.all([
        cricketTeamsService.getAll(),
        cricketPlayersService.getAll()
      ]);
      setTeams(teamsData);
      const unassigned = playersData.filter(p => !p.team);
      setAllUnassignedPlayers(unassigned);
      const initial = unassigned.filter(p => p.category === selectedCategory);
      setUnassignedPlayers(shuffle(initial));
    } catch (error) {
      showToast('Failed to load auction data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startAuction = () => {
    if (!currentUser || !isAdmin) {
      showToast('Only administrators can start the auction', 'error');
      return;
    }
    setIsAuctionActive(true);
    setAuctionTimer(59);
    setCurrentBids([]);
    setHighestBid(0);
    setHighestBidder('');
    setIsTimeExpired(false);
  };

  const confirmPlayerAssignment = async () => {
    const currentPlayer = unassignedPlayers[currentPlayerIndex];
    if (!currentPlayer || !highestBidder) {
      setAssignmentResult({
        player: currentPlayer,
        team: null,
        amount: 0,
        type: 'skipped'
      });
      setShowAssignmentResult(true);
      setTimeout(() => {
        setShowAssignmentResult(false);
        moveToNextPlayer();
      }, 3000);
      return;
    }

    try {
      await cricketPlayersService.update(currentPlayer.id, {
        team: highestBidder,
        soldPrice: highestBid
      });
      const team = teams.find(t => t.name === highestBidder);
      if (team) {
        await cricketTeamsService.update(team.id, {
          spent: (team.spent || 0) + highestBid
        });
      }

      setAssignmentResult({
        player: currentPlayer,
        team: highestBidder,
        amount: highestBid,
        type: 'sold'
      });
      setShowAssignmentResult(true);

      setTimeout(() => {
        setShowAssignmentResult(false);
        moveToNextPlayer();
      }, 3000);
    } catch (error) {
      showToast('Failed to assign player', 'error');
    }
  };

  const moveToNextPlayer = () => {
    setIsAuctionActive(false);
    setCurrentBids([]);
    setHighestBid(0);
    setHighestBidder('');
    setIsTimeExpired(false);
    setCurrentPlayerIndex(prev => prev + 1);
    loadAuctionData();
  };

  const handlePlaceBid = async () => {
    if (!currentUser || !isAdmin) {
      showToast('Only administrators can place bids', 'error');
      return;
    }
    const currentPlayer = unassignedPlayers[currentPlayerIndex];
    if (!bidAmount || !selectedTeam || !currentPlayer || !isAuctionActive) return;

    const bidAmountNum = parseInt(bidAmount);
    const basePrice = currentPlayer.basePrice || 5000;

    if (highestBid > 0) {
      if (bidAmountNum <= highestBid) {
        showToast(`Bid must be greater than ৳${highestBid.toLocaleString()}`, 'warning');
        return;
      }
    } else if (bidAmountNum < basePrice) {
      showToast(`Bid must be at least ৳${basePrice.toLocaleString()}`, 'warning');
      return;
    }

    const newBid = {
      team: selectedTeam,
      amount: bidAmountNum,
      time: new Date().toLocaleTimeString(),
      player: currentPlayer.name
    };

    setCurrentBids(prev => [newBid, ...prev]);
    setHighestBid(bidAmountNum);
    setHighestBidder(selectedTeam);
    setBidAmount('');
    setSelectedTeam('');

    if (auctionTimer < 10 && auctionTimer > 0) {
      setAuctionTimer(prev => Math.min(prev + 5, 59));
    }
  };

  const currentPlayer = unassignedPlayers[currentPlayerIndex];
  const basePrice = currentPlayer?.basePrice || 5000;
  const requiredMinBid = highestBid > 0 ? (highestBid + 1) : basePrice;

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0A0D13' }}>
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Cricket <span className="text-[#D0620D]">Auction</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Live player auction for cricket teams. Bid for the best players and build your dream cricket squad.
            </p>
          </div>
        </div>
      </section>

      {/* Current Auction */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Admin Category Selector */}
          {isAdmin && (
            <div className="mb-6 flex items-center justify-center gap-3">
              {['A', 'B'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  disabled={isAuctionActive}
                  className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#D0620D] text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  } ${isAuctionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Category {cat}
                </button>
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
              </div>
            </div>
          ) : !currentPlayer || unassignedPlayers.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                {allUnassignedPlayers.length === 0 ? 'Auction Complete!' : 'No players in this category'}
              </h2>
              <p className="text-gray-300 mb-6">
                {allUnassignedPlayers.length === 0
                  ? 'All players have been assigned to teams.'
                  : `There are no unassigned players in Category ${selectedCategory}.`}
              </p>
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
                      <div className={`text-4xl font-bold ${auctionTimer <= 10 && !isTimeExpired ? 'text-red-500 animate-pulse' : isTimeExpired ? 'text-yellow-500' : 'text-[#D0620D]'}`}>
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
                        <span className="text-6xl">🏏</span>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">{currentPlayer.name}</h2>
                      <div className="mb-4">
                        <span className="bg-gray-800 px-3 py-1 rounded-full text-sm inline-block">Base: ৳{basePrice.toLocaleString()}</span>
                      </div>
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center space-x-2">
                          <span className="bg-[#D0620D] px-3 py-1 rounded-full text-sm text-white">{currentPlayer.position}</span>
                          <span className="bg-gray-800 px-3 py-1 rounded-full text-sm">Cat {currentPlayer.category}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="bg-gray-800 px-3 py-1 rounded-full text-sm">{currentPlayer.department}</span>
                          <span className="bg-gray-800 px-3 py-1 rounded-full text-sm">{currentPlayer.semester}</span>
                        </div>
                        <div className="bg-gray-800 px-3 py-1 rounded-full text-sm inline-block">ID: {currentPlayer.uniId}</div>
                      </div>

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
                          <button
                            onClick={startAuction}
                            disabled={!currentUser || !isAdmin}
                            className="w-full bg-[#D0620D] text-white px-8 py-5 rounded-xl font-bold text-xl hover:bg-[#B8540B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          >
                            🏏 Start Auction
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <select
                                value={selectedTeam}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                disabled={!currentUser || !isAdmin}
                                className="px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg"
                              >
                                <option value="">Select Team</option>
                                {teams.map(t => (
                                  <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                placeholder={`Min: ৳${requiredMinBid.toLocaleString()}`}
                                disabled={!currentUser || !isAdmin}
                                className="px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg placeholder-gray-400"
                              />
                            </div>
                            <button
                              onClick={handlePlaceBid}
                              disabled={!currentUser || !isAdmin || !bidAmount || !selectedTeam}
                              className="w-full bg-[#D0620D] text-white px-6 py-5 rounded-xl font-bold text-xl hover:bg-[#B8540B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                              💰 Place Bid
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={confirmPlayerAssignment}
                                disabled={!currentUser || !isAdmin}
                                className="bg-green-600 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                ✅ Confirm
                              </button>
                              <button
                                onClick={moveToNextPlayer}
                                disabled={!currentUser || !isAdmin}
                                className="bg-gray-700 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                              >
                                ⏭️ Skip
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Teams */}
                <div className="border border-gray-700 rounded-2xl p-6" style={{ backgroundColor: '#0A0D13' }}>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>🏆</span> Teams
                  </h3>
                  <div className="space-y-3">
                    {teams.map(team => (
                      <div key={team.id} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <span className="text-white font-medium truncate">{team.name}</span>
                        <span className="text-[#D0620D] font-bold">৳{((team.totalBalance || 0) - (team.spent || 0)).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bid History */}
                <div className="border border-gray-700 rounded-2xl p-6" style={{ backgroundColor: '#0A0D13' }}>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>📊</span> Bid History
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {currentBids.length === 0 ? (
                      <p className="text-gray-400 text-sm">No bids yet</p>
                    ) : (
                      currentBids.map((bid, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                          <div>
                            <div className="text-white font-medium">{bid.team}</div>
                            <div className="text-xs text-gray-400">{bid.time}</div>
                          </div>
                          <div className="text-[#D0620D] font-bold text-lg">৳{bid.amount.toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
