import { NavLink, Outlet } from 'react-router-dom';
import { ADMIN_TIER_LABELS, isSuperAdminUser } from '@nursecare/shared/adminPermissions';
import { useAuth } from '../../context/AuthContext.jsx';
import { cn } from '../../lib/utils';

const tabClass = ({ isActive }) =>
  cn(
    'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 -mb-px transition-all duration-200',
    isActive
      ? 'border-brand-500 dark:border-brand-400 text-brand-700 dark:text-brand-300 bg-glass-elevated/60'
      : 'border-transparent text-muted hover:text-foreground hover:border-glass-border/80'
  );

const AdminLayout = () => {
  const { user } = useAuth();
  const tierLabel = ADMIN_TIER_LABELS[user?.adminTier] || 'Admin';
  const superAdmin = isSuperAdminUser(user);

  return (
    <div className="app-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Alchemy control center
          </h1>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide',
              superAdmin
                ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                : 'bg-brand-500/15 text-brand-700 dark:text-brand-300'
            )}
          >
            {tierLabel}
          </span>
        </div>
        {user?.name ? (
          <p className="text-sm text-muted">
            Signed in as <span className="font-semibold text-foreground">{user.name}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-3 tabs-scroll border-b border-glass-border/50">
        <NavLink to="/admin" end className={tabClass}>
          Overview
        </NavLink>
        <NavLink to="/admin/activity" className={tabClass}>
          Activity feed
        </NavLink>
        <NavLink to="/admin/alerts" className={tabClass}>
          Safety alerts
        </NavLink>
        <NavLink to="/admin/users" className={tabClass}>
          Users
        </NavLink>
        <NavLink to="/admin/services" className={tabClass}>
          Add service
        </NavLink>
        <NavLink to="/admin/visit-options" className={tabClass}>
          Patient visit options
        </NavLink>
      </div>

      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
