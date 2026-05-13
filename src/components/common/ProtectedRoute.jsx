import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { AppShellLoader } from './AppShellLoader.jsx';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, bootstrapping } = useAuth();

  if (bootstrapping) {
    return <AppShellLoader label="Restoring your secure session" />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
