import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FallAlertBanner from '../healthcare/FallAlertBanner.jsx';

const INLINE_BANNER_PATHS = ['/dashboard/suggestions'];
const DASHBOARD_RAIL_PATHS = ['/dashboard'];
const CART_PATHS = ['/dashboard/cart'];

/** Shows live fall-alert banner on all authenticated app pages. */
export default function FallAlertsShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) return null;
  if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register')) return null;
  if (INLINE_BANNER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  if (DASHBOARD_RAIL_PATHS.some((p) => pathname === p)) return null;
  if (CART_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div className="border-b border-glass-border/40 bg-canvas/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
        <FallAlertBanner user={user} />
      </div>
    </div>
  );
}
