import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { logger } from './logger';

// Teams CRUD Operations
export const teamsService = {
  // Get all teams
  async getAll() {
    try {
      const querySnapshot = await getDocs(collection(db, 'teams'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error fetching teams:', error);
      throw error;
    }
  },

  // Get team by ID
  async getById(id) {
    try {
      const docRef = doc(db, 'teams', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Team not found');
      }
    } catch (error) {
      logger.error('Error fetching team:', error);
      throw error;
    }
  },

  // Create new team
  async create(teamData) {
    try {
      const docRef = await addDoc(collection(db, 'teams'), {
        ...teamData,
        totalBalance: 500000,
        spent: 0,
        raiseSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      logger.error('Error creating team:', error);
      throw error;
    }
  },

  // Update team
  async update(id, teamData) {
    try {
      const docRef = doc(db, 'teams', id);
      await updateDoc(docRef, {
        ...teamData,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error updating team:', error);
      throw error;
    }
  },

  // Delete team
  async delete(id) {
    try {
      await deleteDoc(doc(db, 'teams', id));
    } catch (error) {
      logger.error('Error deleting team:', error);
      throw error;
    }
  }
};

// Players CRUD Operations
export const playersService = {
  // Get all players
  async getAll() {
    try {
      const querySnapshot = await getDocs(collection(db, 'players'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error fetching players:', error);
      throw error;
    }
  },

  // Get players by team
  async getByTeam(teamName) {
    try {
      const q = query(
        collection(db, 'players'), 
        where('team', '==', teamName)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error fetching players by team:', error);
      throw error;
    }
  },

  // Get unassigned players
  async getUnassigned() {
    try {
      const q = query(
        collection(db, 'players'), 
        where('team', '==', null)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error fetching unassigned players:', error);
      throw error;
    }
  },

  // Create new player
  async create(playerData) {
    try {
      const docRef = await addDoc(collection(db, 'players'), {
        ...playerData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      logger.error('Error creating player:', error);
      throw error;
    }
  },

  // Update player
  async update(id, playerData) {
    try {
      const docRef = doc(db, 'players', id);
      await updateDoc(docRef, {
        ...playerData,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error updating player:', error);
      throw error;
    }
  },

  // Assign player to team
  async assignToTeam(playerId, teamName) {
    try {
      const docRef = doc(db, 'players', playerId);
      await updateDoc(docRef, {
        team: teamName,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error assigning player to team:', error);
      throw error;
    }
  },

  // Delete player
  async delete(id) {
    try {
      await deleteDoc(doc(db, 'players', id));
    } catch (error) {
      logger.error('Error deleting player:', error);
      throw error;
    }
  }
};

// Auction CRUD Operations
export const auctionService = {
  // Get current auction
  async getCurrent() {
    try {
      const q = query(
        collection(db, 'auctions'), 
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      logger.error('Error fetching current auction:', error);
      throw error;
    }
  },

  // Create new auction
  async create(auctionData) {
    try {
      const docRef = await addDoc(collection(db, 'auctions'), {
        ...auctionData,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      logger.error('Error creating auction:', error);
      throw error;
    }
  },

  // Place bid
  async placeBid(auctionId, bidData) {
    try {
      const auctionRef = doc(db, 'auctions', auctionId);
      await updateDoc(auctionRef, {
        currentBid: bidData.amount,
        highestBidder: bidData.team,
        updatedAt: new Date()
      });

      // Add to bid history
      await addDoc(collection(db, 'bids'), {
        auctionId,
        ...bidData,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error placing bid:', error);
      throw error;
    }
  },

  // Get bid history for auction
  async getBidHistory(auctionId) {
    try {
      const q = query(
        collection(db, 'bids'),
        where('auctionId', '==', auctionId),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error('Error fetching bid history:', error);
      throw error;
    }
  },

  // Listen to auction updates (real-time)
  onAuctionUpdate(auctionId, callback) {
    const auctionRef = doc(db, 'auctions', auctionId);
    return onSnapshot(auctionRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  },

  // Listen to bid updates (real-time)
  onBidUpdate(auctionId, callback) {
    const q = query(
      collection(db, 'bids'),
      where('auctionId', '==', auctionId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (querySnapshot) => {
      const bids = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(bids);
    });
  }
};

// Cricket Auction CRUD + Realtime
export const cricketAuctionService = {
  async getActive() {
    try {
      const q = query(
        collection(db, 'cricket-auctions'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      logger.error('Error fetching active cricket auction:', error);
      throw error;
    }
  },

  async create(auctionData) {
    try {
      const docRef = await addDoc(collection(db, 'cricket-auctions'), {
        ...auctionData,
        status: auctionData.status || 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      logger.error('Error creating cricket auction:', error);
      throw error;
    }
  },

  async update(auctionId, auctionData) {
    try {
      const docRef = doc(db, 'cricket-auctions', auctionId);
      const cleaned = Object.fromEntries(
        Object.entries(auctionData).filter(([, value]) => value !== undefined)
      );
      await updateDoc(docRef, { ...cleaned, updatedAt: new Date() });
    } catch (error) {
      logger.error('Error updating cricket auction:', error);
      throw error;
    }
  },

  async placeBid(auctionId, bidData, auctionUpdates = {}) {
    try {
      const auctionRef = doc(db, 'cricket-auctions', auctionId);
      const cleanedUpdates = Object.fromEntries(
        Object.entries(auctionUpdates).filter(([, value]) => value !== undefined)
      );

      await updateDoc(auctionRef, {
        highestBid: bidData.amount,
        highestBidder: bidData.team,
        ...cleanedUpdates,
        updatedAt: new Date()
      });

      await addDoc(collection(db, 'cricket-bids'), {
        auctionId,
        ...bidData,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error placing cricket bid:', error);
      throw error;
    }
  },

  onAuctionUpdate(auctionId, callback) {
    const auctionRef = doc(db, 'cricket-auctions', auctionId);
    return onSnapshot(auctionRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  },

  onBidUpdate(auctionId, callback) {
    const q = query(
      collection(db, 'cricket-bids'),
      where('auctionId', '==', auctionId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (querySnapshot) => {
      const bids = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(bids);
    });
  }
};

// User Management Operations
export const userService = {
  // Create team owner (Firebase Auth + user profile)
  async createTeamOwner(email, teamName, teamId = null) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Admin must be logged in to create team owner.');
      }

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/create-team-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, teamName, teamId })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data?.error || 'Failed to create team owner.';
        throw new Error(message);
      }

      return await response.json();
    } catch (error) {
      logger.error('Error creating team owner record:', error);
      throw error;
    }
  },

  // Team owner login - check credentials against Firestore
  async loginTeamOwner(email, password) {
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', email),
        where('role', '==', 'team_owner')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        logger.log('❌ Team owner not found:', email);
        return null;
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Check password
      if (userData.generatedPassword === password) {
        logger.log('✅ Team owner credentials valid:', email);
        return {
          uid: userDoc.id,
          email: userData.email,
          role: userData.role,
          teamName: userData.teamName
        };
      } else {
        logger.log('❌ Invalid password for team owner:', email);
        return null;
      }
    } catch (error) {
      logger.error('Error checking team owner credentials:', error);
      return null;
    }
  },

  // Get user by UID
  async getByUid(uid) {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      logger.error('Error fetching user by UID:', error);
      throw error;
    }
  },

  // Get user by email
  async getByEmail(email) {
    try {
      const q = query(
        collection(db, 'users'), 
        where('email', '==', email)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      logger.error('Error fetching user by email:', error);
      throw error;
    }
  },


  // Update user
  async update(id, userData) {
    try {
      const docRef = doc(db, 'users', id);
      await updateDoc(docRef, {
        ...userData,
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  },

  // Delete user
  async delete(id) {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }
};

// Cricket Teams CRUD Operations
export const cricketTeamsService = {
  async getAll() {
    try {
      const querySnapshot = await getDocs(collection(db, 'cricket-teams'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error fetching cricket teams:', error);
      throw error;
    }
  },

  onAll(callback) {
    const q = collection(db, 'cricket-teams');
    return onSnapshot(q, (querySnapshot) => {
      const teams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(teams);
    });
  },

  async getById(id) {
    try {
      const docRef = doc(db, 'cricket-teams', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Cricket team not found');
      }
    } catch (error) {
      logger.error('Error fetching cricket team:', error);
      throw error;
    }
  },

  async create(teamData) {
    try {
      const docRef = await addDoc(collection(db, 'cricket-teams'), {
        ...teamData,
        totalBalance: teamData.budget || 100000,
        spent: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      logger.error('Error creating cricket team:', error);
      throw error;
    }
  },

  async update(id, teamData) {
    try {
      const docRef = doc(db, 'cricket-teams', id);
      await updateDoc(docRef, { ...teamData, updatedAt: new Date() });
    } catch (error) {
      logger.error('Error updating cricket team:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await deleteDoc(doc(db, 'cricket-teams', id));
    } catch (error) {
      logger.error('Error deleting cricket team:', error);
      throw error;
    }
  }
};

// Cricket Players CRUD Operations
export const cricketPlayersService = {
  async getAll() {
    try {
      const querySnapshot = await getDocs(collection(db, 'cricket-players'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error fetching cricket players:', error);
      throw error;
    }
  },

  onAll(callback) {
    const q = collection(db, 'cricket-players');
    return onSnapshot(q, (querySnapshot) => {
      const players = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(players);
    });
  },

  async getById(id) {
    try {
      const docRef = doc(db, 'cricket-players', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Cricket player not found');
      }
    } catch (error) {
      logger.error('Error fetching cricket player:', error);
      throw error;
    }
  },

  async create(playerData) {
    try {
      const docRef = await addDoc(collection(db, 'cricket-players'), {
        ...playerData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      logger.error('Error creating cricket player:', error);
      throw error;
    }
  },

  async update(id, playerData) {
    try {
      const docRef = doc(db, 'cricket-players', id);
      await updateDoc(docRef, { ...playerData, updatedAt: new Date() });
    } catch (error) {
      logger.error('Error updating cricket player:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await deleteDoc(doc(db, 'cricket-players', id));
    } catch (error) {
      logger.error('Error deleting cricket player:', error);
      throw error;
    }
  },

  async assignToTeam(playerId, teamName) {
    try {
      const docRef = doc(db, 'cricket-players', playerId);
      await updateDoc(docRef, { team: teamName, updatedAt: new Date() });
    } catch (error) {
      logger.error('Error assigning cricket player to team:', error);
      throw error;
    }
  }
};
