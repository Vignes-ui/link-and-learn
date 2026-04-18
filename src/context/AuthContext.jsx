import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, logoutUser } from '../api/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMe();
        const u = res?.user || null;
        if (cancelled) return;
        if (u) {
          // Keep existing consumers happy: expose a `currentUser` with a `uid`
          setCurrentUser({ uid: u.id });
          setUserData(u);
          setUserRole(u.role || 'student');
        } else {
          setCurrentUser(null);
          setUserData(null);
          setUserRole(null);
        }
      } catch {
        setCurrentUser(null);
        setUserData(null);
        setUserRole(null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const logout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setUserData(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userData,
      setUserData,
      userRole,
      loading,
      logout,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
