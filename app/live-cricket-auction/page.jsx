'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { cricketTeamsService, cricketPlayersService, cricketAuctionService } from '../../lib/firebaseService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../lib/useToast';
import Navbar from '../../components/Navbar';

const TOURNAMENT_CONFIG = {
  totalTeams: 4,
  totalPlayersPerTeam: 12,
  basePrice: 5000,
  totalBudget: 500000,
  wicketkeeperMax: 2,
  priorityCount: 24
};

const RESULT_DISPLAY_WINDOW_MS = 8000;

const PLAYER_FILTERS = [
  { key: 'all', label: 'All Players' },
  { key: 'batter', label: 'Batters' },
  { key: 'bowler', label: 'Bowlers' },
  { key: 'wicketkeeper', label: 'Wicketkeepers' }
];

const normalizePosition = (position) => (position || '').toLowerCase();

const getRoleTokens = (player) => {
  const raw = `${player?.position || ''} ${player?.category || ''} ${player?.role || ''}`.toLowerCase();
  return raw.split(/[^a-z0-9]+/).filter(Boolean);
};

const getPlayerRoles = (player) => {
  const tokens = getRoleTokens(player);
  const hasToken = (list) => list.some((token) => tokens.includes(token));
  const hasAllRounderTokens = tokens.includes('all') && tokens.includes('rounder');

  const isWicketkeeper = hasToken(['wk', 'wicketkeeper', 'wicket', 'keeper']);
  const isAllRounder = hasToken(['allrounder', 'allrounders', 'allround', 'ar']) || hasAllRounderTokens;
  const isBatter = hasToken(['batsman', 'batter', 'bat', 'batting']) || isAllRounder;
  const isBowler = hasToken(['bowler', 'bowl', 'bowling', 'spinner', 'spin', 'fast', 'pace', 'medium']) || isAllRounder;

  return { isBatter, isBowler, isWicketkeeper };
};

  const doesPlayerMatchFilter = (player, filter) => {
  if (!player) return false;
  if (!filter || filter === 'all') return true;
  const roles = getPlayerRoles(player);

  if (filter === 'batter') return roles.isBatter;
  if (filter === 'bowler') return roles.isBowler;
  if (filter === 'wicketkeeper') return roles.isWicketkeeper;

  return true;
};

export default function LiveCricketAuction() {
  const { currentUser, isAdmin } = useAuth();
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [auctionId, setAuctionId] = useState(null);
  const [auctionState, setAuctionState] = useState(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [bidHistory, setBidHistory] = useState([]);
  const [highestBid, setHighestBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState('');
  const [auctionTimer, setAuctionTimer] = useState(59);
  const [timerEndsAt, setTimerEndsAt] = useState(null);
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [showAssignmentResult, setShowAssignmentResult] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [playersLoaded, setPlayersLoaded] = useState(false);
  const [playerFilter, setPlayerFilter] = useState('all');
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const lastResultAtRef = useRef(null);
  const resultTimeoutRef = useRef(null);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const unassignedPlayers = useMemo(
    () => allPlayers.filter(p => !p.team),
    [allPlayers]
  );
  const activePlayerFilter = auctionState?.playerFilter || 'all';
  const activeFilterLabel = PLAYER_FILTERS.find(item => item.key === activePlayerFilter)?.label || 'All Players';
  const canChangeFilter = isAdmin && !auctionState?.isAuctionActive;

  const shuffle = (arr) => arr
    .map(item => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);

  const getTimestampMs = (value) => {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toMillis === 'function') return value.toMillis();
    return null;
  };

  const isPriorityPlayer = (player) => Boolean(player?.is_24 ?? player?.is24 ?? player?.is24Player);

  const buildAuctionQueue = (eligiblePlayers) => {
    const priorityPlayers = eligiblePlayers.filter(isPriorityPlayer);
    const sortedPriority = [...priorityPlayers].sort((a, b) => {
      const aTime = getTimestampMs(a.createdAt);
      const bTime = getTimestampMs(b.createdAt);
      if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime;
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      return aName.localeCompare(bName);
    });
    const prioritySlice = sortedPriority.slice(0, TOURNAMENT_CONFIG.priorityCount);
    const priorityIds = new Set(prioritySlice.map((player) => player.id));
    const restPlayers = eligiblePlayers.filter((player) => !priorityIds.has(player.id));

    return [...prioritySlice, ...shuffle(restPlayers)].map((player) => player.id);
  };

  useEffect(() => {
    let unsubTeams;
    let unsubPlayers;
    let isMounted = true;

    setLoading(true);

    unsubTeams = cricketTeamsService.onAll((teamsData) => {
      if (!isMounted) return;
      setTeams(teamsData.map(team => ({
        ...team,
        totalBalance: Math.max(team.totalBalance ?? 0, TOURNAMENT_CONFIG.totalBudget)
      })));
      setTeamsLoaded(true);
    });

    unsubPlayers = cricketPlayersService.onAll((playersData) => {
      if (!isMounted) return;
      setAllPlayers(playersData);
      setPlayersLoaded(true);
    });

    const initAuction = async () => {
      try {
        const activeAuction = await cricketAuctionService.getActive();
        if (!isMounted) return;
        if (activeAuction) {
          setAuctionId(activeAuction.id);
          setAuctionState(activeAuction);
        }
      } catch (error) {
        showToastRef.current?.('Failed to load auction state', 'error');
      }
    };

    initAuction();

    return () => {
      isMounted = false;
      if (unsubTeams) unsubTeams();
      if (unsubPlayers) unsubPlayers();
    };
  }, []);

  useEffect(() => {
    if (teamsLoaded && playersLoaded) {
      setLoading(false);
    }
  }, [teamsLoaded, playersLoaded]);

  useEffect(() => {
    if (!auctionId) return undefined;
    const unsubAuction = cricketAuctionService.onAuctionUpdate(auctionId, setAuctionState);
    const unsubBids = cricketAuctionService.onBidUpdate(auctionId, setBidHistory);

    return () => {
      if (unsubAuction) unsubAuction();
      if (unsubBids) unsubBids();
    };
  }, [auctionId]);

  useEffect(() => {
    if (!auctionState) return;
    setCurrentPlayerIndex(Number.isFinite(auctionState.currentIndex) ? auctionState.currentIndex : 0);
    setHighestBid(auctionState.highestBid ?? 0);
    setHighestBidder(auctionState.highestBidder ?? '');
    setIsAuctionActive(Boolean(auctionState.isAuctionActive));
    setTimerEndsAt(getTimestampMs(auctionState.timerEndsAt));
  }, [auctionState]);

  useEffect(() => {
    if (!auctionState?.lastResult || !auctionState?.lastResultAt) return;
    const lastResultAt = getTimestampMs(auctionState.lastResultAt);
    if (!lastResultAt || lastResultAtRef.current === lastResultAt) return;
    if (Date.now() - lastResultAt > RESULT_DISPLAY_WINDOW_MS) return;
    lastResultAtRef.current = lastResultAt;

    const result = auctionState.lastResult;
    const playerName = result.playerName || result.player?.name || '';
    const normalized = {
      ...result,
      player: result.player || { id: result.playerId, name: playerName }
    };

    setAssignmentResult(normalized);
    setShowAssignmentResult(true);
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }
    resultTimeoutRef.current = setTimeout(() => {
      setShowAssignmentResult(false);
    }, 3000);
  }, [auctionState]);

  useEffect(() => () => {
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isAuctionActive || !timerEndsAt) {
      setAuctionTimer(59);
      setIsTimeExpired(false);
      return undefined;
    }

    const tick = () => {
      const remainingMs = timerEndsAt - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setAuctionTimer(remainingSec);
      setIsTimeExpired(remainingSec === 0);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isAuctionActive, timerEndsAt]);

  const teamStats = useMemo(() => {
    const stats = {};

    teams.forEach((team) => {
      const teamPlayers = allPlayers.filter(p => p.team === team.name);
      let wicketkeepers = 0;
      let spent = 0;

      teamPlayers.forEach((player) => {
        const roles = getPlayerRoles(player);
        const price = Number(player.soldPrice ?? player.basePrice ?? TOURNAMENT_CONFIG.basePrice);

        if (roles.isWicketkeeper) wicketkeepers += 1;
        spent += Number.isFinite(price) ? price : 0;
      });

      stats[team.name] = {
        totalBudget: Math.max(team.totalBalance ?? 0, TOURNAMENT_CONFIG.totalBudget),
        spent,
        totalPicked: teamPlayers.length,
        wicketkeepers
      };
    });

    return stats;
  }, [teams, allPlayers]);

  const getNextAvailableIndex = (queue, startIndex, filter) => {
    if (!Array.isArray(queue)) return -1;
    for (let i = startIndex; i < queue.length; i += 1) {
      const player = allPlayers.find(p => p.id === queue[i]);
      if (player && !player.team && doesPlayerMatchFilter(player, filter)) {
        return i;
      }
    }
    return -1;
  };

  const startAuction = async () => {
    if (!currentUser || !isAdmin) {
      showToast('Only administrators can start the auction', 'error');
      return;
    }

    if (unassignedPlayers.length === 0) {
      showToast('No unassigned players available.', 'warning');
      return;
    }

    const filterToUse = playerFilter || 'all';
    const eligiblePlayers = unassignedPlayers.filter(player => doesPlayerMatchFilter(player, filterToUse));
    if (eligiblePlayers.length === 0) {
      showToast('No unassigned players match selected filter.', 'warning');
      return;
    }

    const timerEndsAtValue = new Date(Date.now() + 59000);

    try {
      if (!auctionId) {
        const queue = buildAuctionQueue(eligiblePlayers);
        const nextIndex = getNextAvailableIndex(queue, 0, filterToUse);
        const currentPlayerId = nextIndex >= 0 ? queue[nextIndex] : null;

        if (!currentPlayerId) {
          showToast('No available players in queue.', 'warning');
          return;
        }

        const auctionData = {
          status: 'active',
          isAuctionActive: true,
          playerFilter: filterToUse,
          playerQueue: queue,
          currentIndex: nextIndex,
          currentPlayerId,
          highestBid: 0,
          highestBidder: '',
          timerEndsAt: timerEndsAtValue,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const newAuctionId = await cricketAuctionService.create(auctionData);
        setAuctionId(newAuctionId);
        setAuctionState({ id: newAuctionId, ...auctionData });
        return;
      }

      const existingFilter = auctionState?.playerFilter ?? 'all';
      const shouldRebuildQueue = !auctionState?.isAuctionActive && (existingFilter !== filterToUse);
      const currentFilter = shouldRebuildQueue ? filterToUse : existingFilter;
      const queue = (auctionState?.playerQueue?.length && !shouldRebuildQueue)
        ? auctionState.playerQueue
        : buildAuctionQueue(eligiblePlayers);
      const startIndex = Number.isFinite(auctionState?.currentIndex) ? auctionState.currentIndex : 0;
      let nextIndex = startIndex;
      let currentPlayerId = auctionState?.currentPlayerId;

      if (shouldRebuildQueue) {
        nextIndex = getNextAvailableIndex(queue, 0, currentFilter);
        currentPlayerId = nextIndex >= 0 ? queue[nextIndex] : null;
      } else if (!currentPlayerId) {
        nextIndex = getNextAvailableIndex(queue, startIndex, currentFilter);
        currentPlayerId = nextIndex >= 0 ? queue[nextIndex] : null;
      }

      if (!currentPlayerId) {
        showToast('No available players in queue.', 'warning');
        return;
      }

      const updateData = {
        isAuctionActive: true,
        highestBid: 0,
        highestBidder: '',
        timerEndsAt: timerEndsAtValue,
        currentIndex: nextIndex,
        currentPlayerId,
        playerFilter: currentFilter,
        updatedAt: new Date()
      };

      if (!auctionState?.playerQueue?.length || shouldRebuildQueue) {
        updateData.playerQueue = queue;
      }

      await cricketAuctionService.update(auctionId, updateData);
    } catch (error) {
      showToast('Failed to start auction', 'error');
    }
  };

  const getTeamBudgetInfo = (teamName, extraPlayers = 1) => {
    const stats = teamStats[teamName];

    if (!stats) return null;

    const remainingBudget = stats.totalBudget - stats.spent;
    const remainingPlayersAfterPick = TOURNAMENT_CONFIG.totalPlayersPerTeam - (stats.totalPicked + extraPlayers);
    const maxAllowedBid = remainingBudget - (remainingPlayersAfterPick * TOURNAMENT_CONFIG.basePrice);

    return {
      remainingBudget,
      remainingPlayersAfterPick,
      maxAllowedBid
    };
  };

  const validateRoundConstraints = (teamName, player) => {
    const stats = teamStats[teamName];

    if (!stats) {
      return { ok: false, reason: 'Team not found.' };
    }

    if (stats.totalPicked >= TOURNAMENT_CONFIG.totalPlayersPerTeam) {
      return { ok: false, reason: 'Team already completed auction slots.' };
    }

    const roles = getPlayerRoles(player);
    if (roles.isWicketkeeper && stats.wicketkeepers >= TOURNAMENT_CONFIG.wicketkeeperMax) {
      return { ok: false, reason: 'Wicketkeeper limit reached (max 2).' };
    }

    return { ok: true };
  };

  const validateBidAmount = (teamName, player, bidAmountNum, requireHigherThanHighest = true) => {
    const budgetInfo = getTeamBudgetInfo(teamName, 1);

    if (!budgetInfo) {
      return { ok: false, reason: 'Team budget not available.' };
    }

    if (budgetInfo.remainingPlayersAfterPick < 0) {
      return { ok: false, reason: 'Team already completed squad.' };
    }

    const minBaseBid = Math.max(
      Number(player.basePrice) || TOURNAMENT_CONFIG.basePrice,
      TOURNAMENT_CONFIG.basePrice
    );
    const minBid = (requireHigherThanHighest && highestBid > 0) ? highestBid + 1 : minBaseBid;

    if (bidAmountNum < minBid) {
      return { ok: false, reason: `Bid must be at least ৳${minBid.toLocaleString()}.` };
    }

    if (bidAmountNum > budgetInfo.maxAllowedBid) {
      return { ok: false, reason: `Max allowed bid is ৳${Math.max(budgetInfo.maxAllowedBid, 0).toLocaleString()}.` };
    }

    return { ok: true, maxAllowedBid: budgetInfo.maxAllowedBid };
  };

  const confirmPlayerAssignment = async () => {
    if (!auctionId) {
      showToast('Start the auction before confirming.', 'warning');
      return;
    }

    if (!currentPlayer) {
      showToast('No active player selected.', 'warning');
      return;
    }

    if (!highestBidder) {
      const resultPayload = {
        type: 'skipped',
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        team: null,
        amount: 0
      };

      try {
        await cricketAuctionService.update(auctionId, {
          lastResult: resultPayload,
          lastResultAt: new Date()
        });
      } catch (error) {
        showToast('Failed to update auction result', 'error');
      }

      setTimeout(() => {
        moveToNextPlayer();
      }, 3000);
      return;
    }

    const roundCheck = validateRoundConstraints(highestBidder, currentPlayer);
    if (!roundCheck.ok) {
      showToast(roundCheck.reason, 'error');
      return;
    }

    const budgetCheck = validateBidAmount(highestBidder, currentPlayer, highestBid, false);
    if (!budgetCheck.ok) {
      showToast(budgetCheck.reason, 'error');
      return;
    }

    try {
      await cricketPlayersService.update(currentPlayer.id, {
        team: highestBidder,
        soldPrice: highestBid
      });
      const team = teams.find(t => t.name === highestBidder);
      if (team) {
        const stats = teamStats[highestBidder];
        const newSpent = (stats?.spent || 0) + highestBid;
        await cricketTeamsService.update(team.id, {
          spent: newSpent,
          totalBalance: Math.max(team.totalBalance ?? 0, TOURNAMENT_CONFIG.totalBudget)
        });
      }

      try {
        await cricketAuctionService.update(auctionId, {
          lastResult: {
            type: 'sold',
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            team: highestBidder,
            amount: highestBid
          },
          lastResultAt: new Date()
        });
      } catch (error) {
        showToast('Failed to update auction result', 'error');
      }

      setTimeout(() => {
        moveToNextPlayer(true);
      }, 3000);
    } catch (error) {
      showToast('Failed to assign player', 'error');
    }
  };

  const moveToNextPlayer = async (force = false) => {
    if (!auctionId || !auctionState?.playerQueue?.length) {
      showToast('No auction queue found.', 'warning');
      return;
    }

    if (!force && (highestBid > 0 || highestBidder)) {
      showToast('Cannot skip after bids placed. Confirm sale first.', 'warning');
      return;
    }

    const queue = auctionState.playerQueue;
    const startIndex = Number.isFinite(auctionState.currentIndex) ? auctionState.currentIndex + 1 : 0;
    const currentFilter = auctionState?.playerFilter || 'all';
    const nextIndex = getNextAvailableIndex(queue, startIndex, currentFilter);
    const nextPlayerId = nextIndex >= 0 ? queue[nextIndex] : null;

    try {
      await cricketAuctionService.update(auctionId, {
        isAuctionActive: false,
        highestBid: 0,
        highestBidder: '',
        timerEndsAt: null,
        currentIndex: nextIndex >= 0 ? nextIndex : (auctionState.currentIndex ?? 0),
        currentPlayerId: nextPlayerId,
        status: nextPlayerId ? 'active' : 'completed',
        updatedAt: new Date()
      });
      setBidAmount('');
      setSelectedTeam('');
      setIsTimeExpired(false);
    } catch (error) {
      showToast('Failed to move to next player', 'error');
    }
  };

  const applyPlayerFilter = async (filterKey) => {
    setPlayerFilter(filterKey);

    if (!isAdmin || !auctionId || auctionState?.isAuctionActive) return;

    const filterToUse = filterKey || 'all';
    const eligiblePlayers = unassignedPlayers.filter(player => doesPlayerMatchFilter(player, filterToUse));

    if (eligiblePlayers.length === 0) {
      showToast('No unassigned players match selected filter.', 'warning');
      return;
    }

    const queue = buildAuctionQueue(eligiblePlayers);
    const nextIndex = getNextAvailableIndex(queue, 0, filterToUse);
    const currentPlayerId = nextIndex >= 0 ? queue[nextIndex] : null;

    if (!currentPlayerId) {
      showToast('No available players in queue.', 'warning');
      return;
    }

    try {
      await cricketAuctionService.update(auctionId, {
        playerFilter: filterToUse,
        playerQueue: queue,
        currentIndex: nextIndex,
        currentPlayerId,
        highestBid: 0,
        highestBidder: '',
        timerEndsAt: null,
        isAuctionActive: false,
        updatedAt: new Date()
      });
    } catch (error) {
      showToast('Failed to update player filter.', 'error');
    }
  };

  const resetAuction = async () => {
    if (!currentUser || !isAdmin) {
      showToast('Only administrators can reset the auction.', 'error');
      return;
    }

    const confirmed = confirm('Reset auction? This will unassign all players, clear bids, and stop the auction.');
    if (!confirmed) return;

    try {
      setLoading(true);

      const playerUpdates = allPlayers.map((player) =>
        cricketPlayersService.update(player.id, {
          team: null,
          soldPrice: null
        })
      );
      await Promise.all(playerUpdates);

      const teamUpdates = teams.map((team) =>
        cricketTeamsService.update(team.id, {
          spent: 0,
          totalBalance: TOURNAMENT_CONFIG.totalBudget
        })
      );
      await Promise.all(teamUpdates);

      if (auctionId) {
        await cricketAuctionService.clearBids(auctionId);
        await cricketAuctionService.update(auctionId, {
          status: 'idle',
          isAuctionActive: false,
          highestBid: 0,
          highestBidder: '',
          timerEndsAt: null,
          currentIndex: 0,
          currentPlayerId: null,
          playerQueue: [],
          playerFilter: 'all',
          lastResult: null,
          lastResultAt: null,
          updatedAt: new Date()
        });
      }

      setBidHistory([]);
      setBidAmount('');
      setSelectedTeam('');
      setHighestBid(0);
      setHighestBidder('');
      setIsAuctionActive(false);
      setTimerEndsAt(null);
      setAuctionTimer(59);
      setIsTimeExpired(false);
      setShowAssignmentResult(false);
      setAssignmentResult(null);
      setPlayerFilter('all');

      showToast('Auction reset complete.', 'success');
    } catch (error) {
      showToast('Failed to reset auction.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!currentUser || !isAdmin) {
      showToast('Only administrators can place bids', 'error');
      return;
    }
    if (!auctionId) {
      showToast('Start the auction before bidding.', 'warning');
      return;
    }
    if (!bidAmount || !selectedTeam || !currentPlayer || !isAuctionActive) return;

    const bidAmountNum = parseInt(bidAmount);
    if (!Number.isFinite(bidAmountNum)) {
      showToast('Enter a valid bid amount.', 'warning');
      return;
    }
    const roundCheck = validateRoundConstraints(selectedTeam, currentPlayer);
    if (!roundCheck.ok) {
      showToast(roundCheck.reason, 'warning');
      return;
    }

    const budgetCheck = validateBidAmount(selectedTeam, currentPlayer, bidAmountNum);
    if (!budgetCheck.ok) {
      showToast(budgetCheck.reason, 'warning');
      return;
    }

    const bidPayload = {
      team: selectedTeam,
      amount: bidAmountNum,
      playerId: currentPlayer.id,
      player: currentPlayer.name,
      time: new Date().toLocaleTimeString()
    };

    const auctionUpdates = {};
    if (timerEndsAt && isAuctionActive) {
      const remainingMs = timerEndsAt - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      if (remainingSec > 0 && remainingSec < 10) {
        auctionUpdates.timerEndsAt = new Date(Date.now() + (remainingSec + 5) * 1000);
      }
    }

    try {
      await cricketAuctionService.placeBid(auctionId, bidPayload, auctionUpdates);
      setBidAmount('');
      setSelectedTeam('');
    } catch (error) {
      showToast('Failed to place bid', 'error');
    }
  };

  const playerQueue = auctionState?.playerQueue || [];
  const queueLength = playerQueue.length || unassignedPlayers.length;
  const currentPlayer = useMemo(() => {
    const playerId = auctionState?.currentPlayerId
      || (Number.isFinite(auctionState?.currentIndex) ? playerQueue[auctionState.currentIndex] : null);
    if (!playerId) return null;
    return allPlayers.find(p => p.id === playerId) || null;
  }, [auctionState, playerQueue, allPlayers]);
  const basePrice = currentPlayer?.basePrice || TOURNAMENT_CONFIG.basePrice;
  const minBaseBid = Math.max(basePrice, TOURNAMENT_CONFIG.basePrice);
  const requiredMinBid = highestBid > 0 ? (highestBid + 1) : minBaseBid;
  const selectedTeamStats = selectedTeam ? teamStats[selectedTeam] : null;
  const selectedBudgetInfo = selectedTeam ? getTeamBudgetInfo(selectedTeam, 1) : null;
  const maxAllowedBidDisplay = selectedBudgetInfo
    ? Math.max(selectedBudgetInfo.maxAllowedBid, 0)
    : null;

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
            <div className="mt-6" />
          </div>
        </div>
      </section>

      {/* Current Auction */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400">Filter:</span>
            {PLAYER_FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => applyPlayerFilter(item.key)}
                disabled={!canChangeFilter}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  playerFilter === item.key
                    ? 'bg-[#D0620D] text-white'
                    : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                } ${!canChangeFilter ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {item.label}
              </button>
            ))}
            <span className="text-xs text-gray-500">Active: {activeFilterLabel}</span>
            {isAdmin && (
              <button
                type="button"
                onClick={resetAuction}
                className="ml-auto rounded-full border border-red-500 px-3 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
              >
                Reset Auction
              </button>
            )}
          </div>

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
          ) : !auctionState ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto border border-gray-700 rounded-2xl p-8">
                <div className="mb-4 flex justify-center">
                  <img
                    src="/assets/uiuvccuplogo.png"
                    alt="UIU VC Cup logo"
                    className="w-16 h-16 rounded-full object-cover border border-gray-700"
                  />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Auction Not Started</h2>
                <p className="text-gray-300">Admin can start the auction to begin live bidding.</p>
                {isAdmin && (
                  <button
                    onClick={startAuction}
                    disabled={!currentUser}
                    className="mt-6 w-full bg-[#D0620D] text-white px-8 py-5 rounded-xl font-bold text-xl hover:bg-[#B8540B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    <span className="inline-flex items-center gap-2">
                      <img
                        src="/assets/uiuvccuplogo.png"
                        alt="UIU VC Cup"
                        className="w-5 h-5 rounded-full object-cover border border-white/20"
                      />
                      <span>Start Auction</span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : !currentPlayer || unassignedPlayers.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto border border-gray-700 rounded-2xl p-8">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-white mb-2">All Players Assigned</h2>
                <p className="text-gray-300">No unassigned players left for this auction.</p>
              </div>
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
                        {isAuctionActive
                          ? (isTimeExpired ? 'EXPIRED' : `${auctionTimer}s`)
                          : `${currentPlayerIndex + 1}/${queueLength || 0}`}
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

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <div className="w-64 h-64 bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-700 mx-auto mb-6 overflow-hidden">
                        <img
                          src={`/api/student-avatar?std=${encodeURIComponent(currentPlayer?.uniId || '')}`}
                          alt={`${currentPlayer?.name || 'Player'} avatar`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/assets/uiuvccuplogo.png';
                          }}
                        />
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
                            <span className="inline-flex items-center gap-2">
                              <img
                                src="/assets/uiuvccuplogo.png"
                                alt="UIU VC Cup"
                                className="w-5 h-5 rounded-full object-cover border border-white/20"
                              />
                              <span>Start Auction</span>
                            </span>
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2">
                                <div className="text-sm text-gray-300 mb-2">Select Team</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {teams.map(t => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => setSelectedTeam(t.name)}
                                      disabled={!currentUser || !isAdmin}
                                      className={`rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
                                        selectedTeam === t.name
                                          ? 'bg-[#D0620D] text-white'
                                          : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                                      } ${(!currentUser || !isAdmin) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {t.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <input
                                type="number"
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                placeholder={`Min: ৳${requiredMinBid.toLocaleString()}${maxAllowedBidDisplay !== null ? ` | Max: ৳${maxAllowedBidDisplay.toLocaleString()}` : ''}`}
                                disabled={!currentUser || !isAdmin}
                                className="col-span-2 px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg placeholder-gray-400"
                              />
                            </div>
                            {selectedTeamStats && selectedBudgetInfo && (
                              <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-3 text-sm text-gray-300">
                                <div className="flex items-center justify-between">
                                  <span>Remaining Budget</span>
                                  <span className="text-white font-semibold">৳{selectedBudgetInfo.remainingBudget.toLocaleString()}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between">
                                  <span>Remaining Players</span>
                                  <span className="text-white font-semibold">{TOURNAMENT_CONFIG.totalPlayersPerTeam - selectedTeamStats.totalPicked}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between">
                                  <span>Max Allowed Bid</span>
                                  <span className="text-[#D0620D] font-semibold">৳{Math.max(selectedBudgetInfo.maxAllowedBid, 0).toLocaleString()}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between">
                                  <span>Wicketkeepers</span>
                                  <span className="text-white font-semibold">{selectedTeamStats.wicketkeepers} / {TOURNAMENT_CONFIG.wicketkeeperMax}</span>
                                </div>
                              </div>
                            )}
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
                                disabled={!currentUser || !isAdmin || !highestBidder}
                                className="bg-green-600 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                ✅ Confirm Sale
                              </button>
                              <button
                                onClick={moveToNextPlayer}
                                disabled={!currentUser || !isAdmin || highestBid > 0 || !!highestBidder}
                                className="bg-gray-700 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                              >
                                ⏭️ Skip Player
                              </button>
                            </div>
                            {highestBidder ? (
                              <p className="text-xs text-gray-400">Confirm assigns {currentPlayer?.name} to {highestBidder} for ৳{highestBid.toLocaleString()}.</p>
                            ) : (
                              <p className="text-xs text-gray-400">No bids yet. Use Skip to move on.</p>
                            )}
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
                    {teams.map(team => {
                      const stats = teamStats[team.name];
                      const budgetInfo = getTeamBudgetInfo(team.name, 1);
                      const maxBid = budgetInfo ? Math.max(budgetInfo.maxAllowedBid, 0) : 0;

                      return (
                        <div key={team.id} className="p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {team.logo ? (
                                <img
                                  src={team.logo}
                                  alt={`${team.name} logo`}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-700"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-700 text-white flex items-center justify-center text-sm font-bold">
                                  {team.name?.split(' ').map(word => word.charAt(0)).join('').toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-white font-semibold truncate">{team.name}</div>
                                <div className="text-xs text-gray-400">Players {stats?.totalPicked || 0}/{TOURNAMENT_CONFIG.totalPlayersPerTeam}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-400">Remaining</div>
                              <div className="text-lg font-bold text-[#D0620D]">
                                ৳{Math.max((stats?.totalBudget || 0) - (stats?.spent || 0), 0).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-gray-900/60 p-2 text-center">
                              <div className="text-[11px] uppercase text-gray-400">Max Bid</div>
                              <div className="text-base font-bold text-white">৳{maxBid.toLocaleString()}</div>
                            </div>
                            <div className="rounded-lg bg-gray-900/60 p-2 text-center">
                              <div className="text-[11px] uppercase text-gray-400">Wicketkeepers</div>
                              <div className="text-base font-bold text-white">{stats?.wicketkeepers || 0}/{TOURNAMENT_CONFIG.wicketkeeperMax}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bid History */}
                <div className="border border-gray-700 rounded-2xl p-6" style={{ backgroundColor: '#0A0D13' }}>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>📊</span> Bid History
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {bidHistory.length === 0 ? (
                      <p className="text-gray-400 text-sm">No bids yet</p>
                    ) : (
                      bidHistory.map((bid, i) => {
                        const bidTime = bid.time
                          || (bid.timestamp?.toDate ? bid.timestamp.toDate().toLocaleTimeString() : '');

                        return (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                          <div>
                            <div className="text-white font-medium">{bid.team}</div>
                            <div className="text-xs text-gray-400">{bid.player}{bidTime ? ` • ${bidTime}` : ''}</div>
                          </div>
                          <div className="text-[#D0620D] font-bold text-lg">৳{bid.amount.toLocaleString()}</div>
                        </div>
                        );
                      })
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
