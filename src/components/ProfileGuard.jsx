import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProfileGuard({ children }) {
  const { userData, userRole, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  if (userData?.roleSelected === false) {
    return <Navigate to="/oauth-role" replace />;
  }

  if (userRole === 'admin') {
    return children;
  }

  // 🔴 If profile not completed → force setup
  if (userData && !userData.profileCompleted) {
    return <Navigate to="/setup-profile" replace />;
  }

  return children;
}
