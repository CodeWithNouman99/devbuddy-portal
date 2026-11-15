// Wrap pages that need a logged-in user. Not logged in -> go to /login.
// Optional: <ProtectedRoute roles={['admin']}> to allow only some roles.
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted">Loading…</div>;
  }

  if (!user) {
    // Remember where they wanted to go, so we can send them back after login.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/overview" replace />;
  }

  return <Outlet />;
}
