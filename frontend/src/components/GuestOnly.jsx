import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardPathForUser } from '../lib/accountKinds';

/** Redirect signed-in users away from public pages (home, login, register, forgot password). */
export default function GuestOnly({ children }) {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={dashboardPathForUser(user)} replace />;
  }
  return children;
}
