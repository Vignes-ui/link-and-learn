import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMe, logoutUser } from '../api/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyUser = (u) => {
    if (u) {
      setCurrentUser({ uid: String(u.id) });
      setUserData(u);
      setUserRole(u.role || 'student');
    } else {
      setCurrentUser(null);
      setUserData(null);
      setUserRole(null);
    }
  };

  // Call this after signup or login to sync AuthContext with the new session
  const refreshUser = useCallback(async () => {
    try {
      const res = await getMe();
      applyUser(res?.user || null);
    } catch {
      applyUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMe();
        const u = res?.user || null;
        if (cancelled) return;
        applyUser(u);
      } catch {
        if (!cancelled) applyUser(null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const logout = async () => {
    await logoutUser();
    applyUser(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userData,
      setUserData,
      userRole,
      loading,
      logout,
      refreshUser,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
