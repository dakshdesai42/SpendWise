import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FullPageLoader } from '../ui/LoadingSpinner';

export default function ProtectedRoute() {
  const { isAuthenticated, loading, authError } = useAuth();

  if (loading) {
    return <FullPageLoader state="auth_loading" message="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ startupState: 'auth_required', authError }} />;
  }

  return <Outlet />;
}
