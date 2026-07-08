import { useNavigate, useLocation } from 'react-router-dom';
import {
  Briefcase,
  History,
  LayoutDashboard,
  Settings,
  UserCircle2,
  Wallet,
} from 'lucide-react';
import BrandLogo from './BrandLogo.jsx';

export const NURSE_MENU_ITEMS = [
  { id: 'profile', label: 'Profile', path: '/nurse/profile', Icon: UserCircle2 },
  { id: 'active_jobs', label: 'Active Jobs', path: '/nurse', panel: 'active_jobs', Icon: Briefcase },
  { id: 'history', label: 'History', path: '/nurse', panel: 'history', Icon: History },
  { id: 'settings', label: 'Settings', path: '/nurse/settings', Icon: Settings },
  { id: 'payment', label: 'Payment', path: '/nurse/payment', Icon: Wallet },
];

const NurseCaregiverNav = ({ activeId }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (item) => {
    if (item.panel) {
      navigate(item.path, { state: { panel: item.panel } });
      return;
    }
    navigate(item.path);
  };

  const isActive = (item) => {
    if (activeId) return activeId === item.id;
    if (item.path === '/nurse/payment') return location.pathname === '/nurse/payment';
    if (item.path === '/nurse/settings') return location.pathname === '/nurse/settings';
    if (item.path === '/nurse/profile') return location.pathname === '/nurse/profile';
    return false;
  };

  return (
    <aside className="group/sbar dashboard-sidebar">
      <div className="hidden lg:flex px-2 pt-2 pb-3 border-b border-glass-border/40 mb-2">
        <BrandLogo size="sm" to="/nurse" showTagline />
      </div>
      <nav className="flex flex-row lg:flex-col py-2 px-2 lg:px-1.5 gap-1 justify-between lg:justify-start overflow-x-auto lg:overflow-x-visible">
        <button
          type="button"
          onClick={() => navigate('/nurse')}
          className="flex items-center gap-0 mx-0 sm:mx-0.5 rounded-xl text-sm font-medium transition-all duration-200 text-muted hover:bg-glass-elevated/50 border border-transparent hover:border-glass-border/60"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-glass/40 border border-glass-border/50">
            <LayoutDashboard className="w-[1.1rem] h-[1.1rem]" strokeWidth={2} />
          </span>
          <span className="min-w-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,padding] duration-300 ease-out lg:group-hover/sbar:max-w-[10rem] lg:group-hover/sbar:opacity-100 lg:group-hover/sbar:pr-2.5 max-w-[10rem] opacity-100 px-2 lg:max-w-0 lg:opacity-0 lg:px-0">
            Dashboard
          </span>
        </button>
        {NURSE_MENU_ITEMS.map((item) => {
          const active = isActive(item);
          const { Icon, label, id } = item;
          return (
            <button
              key={id}
              type="button"
              onClick={() => go(item)}
              className={`flex items-center gap-0 mx-0 sm:mx-0.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                  : 'text-muted hover:bg-glass-elevated/50 border border-transparent hover:border-glass-border/60'
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  active ? 'bg-white/15' : 'bg-glass/40 border border-glass-border/50'
                }`}
              >
                <Icon className="w-[1.1rem] h-[1.1rem]" strokeWidth={2} />
              </span>
              <span className="min-w-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,padding] duration-300 ease-out lg:group-hover/sbar:max-w-[10rem] lg:group-hover/sbar:opacity-100 lg:group-hover/sbar:pr-2.5 max-w-[10rem] opacity-100 px-2 lg:max-w-0 lg:opacity-0 lg:px-0">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default NurseCaregiverNav;
