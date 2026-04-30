'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { logger } from '../lib/logger';

// Admin email allowlist - hardcoded admin accounts
const ADMIN_EMAILS = [
  'uiuvccup@gmail.com'
];

// Check if email is in admin allowlist
const isAdminEmail = (email) => {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
};

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userTeam, setUserTeam] = useState(null);
  const [userTeamId, setUserTeamId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login function - all users via Firebase Auth
  const login = async (email, password) => {
    try {
      logger.log('🔐 AuthContext: Attempting login for:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      logger.log('✅ AuthContext: Firebase login successful');
      return result;
    } catch (error) {
      logger.error('❌ AuthContext: Login error:', error);
      throw error;
    }
  };

  // Logout function
  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    logger.log('🔧 AuthContext: Setting up auth listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      logger.log('🔥 AuthContext: Auth state changed', {
        user: user ? { uid: user.uid, email: user.email } : null,
        timestamp: new Date().toISOString()
      });
      
      if (user) {
        logger.log('👤 AuthContext: Firebase Auth user found');
        setCurrentUser(user);

        try {
          const tokenResult = await user.getIdTokenResult(true);
          const roleClaim = tokenResult?.claims?.role;

          if (roleClaim === 'admin') {
            logger.log('👑 AuthContext: Admin detected:', user.email);
            setUserRole('admin');
            setUserTeam(null);
            setUserTeamId(null);
            setLoading(false);
            logger.log('🏁 AuthContext: Admin loading complete');
            return;
          }

          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || null);
            setUserTeam(userData.teamName || null);
            setUserTeamId(userData.teamId || null);
            logger.log('✅ AuthContext: User profile loaded', {
              role: userData.role,
              teamName: userData.teamName,
              teamId: userData.teamId
            });
          } else {
            logger.log('⚠️ AuthContext: User profile not found:', user.uid);
            setUserRole(null);
            setUserTeam(null);
            setUserTeamId(null);
          }
        } catch (error) {
          logger.error('❌ AuthContext: Failed to load user profile:', error);
          setUserRole(null);
          setUserTeam(null);
          setUserTeamId(null);
        } finally {
          setLoading(false);
        }
      } else {
        logger.log('🚫 AuthContext: No user, clearing all state');
        setCurrentUser(null);
        setUserRole(null);
        setUserTeam(null);
        setUserTeamId(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    userTeam,
    userTeamId,
    loading,
    isAdmin: userRole === 'admin',
    isTeamOwner: userRole === 'team_owner',
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}