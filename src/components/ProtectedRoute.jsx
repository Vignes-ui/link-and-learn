import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userRole, loading } = useAuth();

  // 🔹 Wait until auth + Firestore is loaded
  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  // 🔹 Not logged in → go to login
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // 🔹 Role check (RBAC)
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/feed" replace />;
  }

  return children;
}