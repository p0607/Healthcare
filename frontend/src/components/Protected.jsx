import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/** Maps route role to session role + activeKind for multi-role accounts. */
function sessionMatches(user, requiredRole) {
  if (!requiredRole) return true;
  if (user.role === requiredRole) {
    if (requiredRole === 'user' && user.activeKind === 'guardian') return true;
    return true;
  }
  return false;
}

const Protected = ({ children, role: requiredRole, activeKind: requiredKind }) => {
  const { user } = useAuth();
  if (!user) {
    const loginTo = requiredRole === 'admin' ? '/login?staff=1&admin=1' : '/login';
    return <Navigate to={loginTo} replace />;
  }

  if (requiredRole && !sessionMatches(user, requiredRole)) {
    const fallback =
      user.role === 'admin' ? '/admin' : user.role === 'nurse' ? '/nurse' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  if (requiredKind && user.activeKind && user.activeKind !== requiredKind) {
    const fallback =
      user.role === 'admin' ? '/admin' : user.role === 'nurse' ? '/nurse' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default Protected;
