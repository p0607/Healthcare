import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ClipboardList,
  IdCard,
  Inbox,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  UserRound,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const SIDEBAR_MORE = [
  { id: 'book', panel: 'book', label: 'Book care', Icon: UserRound },
  { id: 'services', panel: 'services', label: 'Services', Icon: ClipboardList },
  { id: 'alerts', path: '/dashboard/alerts', label: 'Safety alerts', Icon: Bell },
  { id: 'tracking', panel: 'tracking', label: 'Live tracking', Icon: Radar },
  { id: 'requests', panel: 'requests', label: 'Your requests', Icon: Inbox },
  { id: 'profile', path: '/dashboard/profile', label: 'Profile', Icon: IdCard },
];

export default function PatientDashboardRail({
  sidebarExpanded,
  onToggleSidebar,
  mainPanel,
  careTab = 'homecare',
  onNavPanel,
  location,
  profileComplete,
  activeRequestCount,
}) {
  const navigate = useNavigate();

  const sidebarLabelClass = sidebarExpanded
    ? 'min-w-0 max-w-[11rem] overflow-hidden whitespace-nowrap opacity-100 px-2 pr-2.5 transition-[max-width,opacity,padding] duration-300 ease-out lg:max-w-[11rem] lg:opacity-100 lg:pr-2.5'
    : 'min-w-0 max-w-[11rem] overflow-hidden whitespace-nowrap opacity-100 px-2 pr-2.5 transition-[max-width,opacity,padding] duration-300 ease-out lg:max-w-0 lg:opacity-0 lg:px-0';

  return (
    <aside
      className={cn('dashboard-sidebar', sidebarExpanded && 'dashboard-sidebar--expanded')}
      aria-label="Patient dashboard menu"
    >
      <button
        type="button"
        className="dashboard-sidebar-toggle dashboard-sidebar-toggle--top"
        onClick={onToggleSidebar}
        aria-expanded={sidebarExpanded}
        aria-label={sidebarExpanded ? 'Collapse menu' : 'Expand menu'}
      >
        {sidebarExpanded ? (
          <>
            <PanelLeftClose className="w-4 h-4 shrink-0" aria-hidden />
            <span className="hidden lg:inline">Collapse</span>
          </>
        ) : (
          <PanelLeftOpen className="w-4 h-4 shrink-0" aria-hidden />
        )}
      </button>

      {sidebarExpanded && (
        <nav className="dashboard-sidebar-nav">
          {SIDEBAR_MORE.map(({ id, label, Icon, panel, path }) => {
            const active = path
              ? location.pathname === path
              : panel === 'book'
                ? mainPanel === 'book' && careTab === 'homecare'
                : panel === 'services'
                  ? mainPanel === 'book' && careTab === 'services'
                  : mainPanel === panel;
            const profileIncomplete =
              id === 'profile' && profileComplete.percent < 100 && profileComplete.pending > 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => (path ? navigate(path) : onNavPanel(panel))}
                title={profileIncomplete ? `${label} — update required` : label}
                className={cn(
                  'flex items-center gap-0 mx-0 sm:mx-0.5 rounded-xl text-sm font-medium transition-all duration-200 w-full',
                  profileIncomplete && !active
                    ? 'text-rose-800 bg-rose-50 border-2 border-rose-500 shadow-sm shadow-rose-200/60 ring-1 ring-rose-300'
                    : active
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                      : 'text-muted hover:bg-glass-elevated/50 hover:text-foreground border border-transparent hover:border-glass-border/60'
                )}
              >
                <span
                  className={cn(
                    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
                    profileIncomplete && !active
                      ? 'bg-rose-100 text-rose-700 border border-rose-400'
                      : active
                        ? 'bg-white/15 text-white'
                        : 'bg-glass/40 text-muted border border-glass-border/50'
                  )}
                >
                  <Icon className="w-[1.15rem] h-[1.15rem]" strokeWidth={2} aria-hidden />
                  {profileIncomplete && !active && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-none grid place-items-center tabular-nums ring-2 ring-white"
                      aria-hidden
                    >
                      !
                    </span>
                  )}
                  {panel === 'requests' && activeRequestCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none grid place-items-center tabular-nums ring-2 ring-white"
                      aria-label={`${activeRequestCount} active requests`}
                    >
                      {activeRequestCount > 9 ? '9+' : activeRequestCount}
                    </span>
                  )}
                </span>
                <span className={sidebarLabelClass}>{label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
