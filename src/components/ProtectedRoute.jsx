import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllowedPathsForRole, getHomePathForRole } from '../constants/navigation';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userRole, userData, loading } = useAuth();
  const location = useLocation();
  const roleAllowedPaths = getAllowedPathsForRole(userRole);

  // 🔹 Wait until auth + Firestore is loaded
  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  // 🔹 Not logged in → go to login
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (userData?.roleSelected === false && location.pathname !== '/oauth-role') {
    return <Navigate to="/oauth-role" replace />;
  }

  if (roleAllowedPaths && !roleAllowedPaths.has(location.pathname)) {
    return <Navigate to={getHomePathForRole(userRole)} replace />;
  }

  // 🔹 Role check (RBAC)
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={getHomePathForRole(userRole)} replace />;
  }

  return children;
}
