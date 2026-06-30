import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { useHealthcareFallAlertsContext } from './HealthcareFallAlertsContext.jsx';
import {
  alertStableId,
  alertsDashboardPath,
  filterAlertsForViewer,
  formatAlertAge,
  laymanAlertSummary,
  laymanAlertTitle,
  loadAckIds,
  saveAckIds,
  severityLabel,
} from './fallAlertUtils.js';
import { cn } from '../lib/utils.js';

/**
 * Sticky safety alert banner — connects to Healthcare backend (port 4000).
 * @param {{ user: object, compact?: boolean, inline?: boolean }} props
 */
export default function FallAlertBanner({ user, compact = false, inline = false }) {
  const { alerts, status } = useHealthcareFallAlertsContext();
  const [ackIds, setAckIds] = useState(() => loadAckIds());

  const relevant = useMemo(() => {
    const filtered = filterAlertsForViewer(alerts, user).map((a, idx) => ({
      ...a,
      _id: alertStableId(a, idx),
    }));
    return filtered.filter((a) => !ackIds.has(a._id));
  }, [alerts, user, ackIds]);

  const dashboardPath = alertsDashboardPath(user);

  const ackOne = (id) => {
    const next = new Set(ackIds);
    next.add(id);
    setAckIds(next);
    saveAckIds(next);
  };

  if (relevant.length === 0) {
    if (compact) return null;
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-glass-border/50 bg-glass/30 px-3 py-1.5 text-xs text-muted',
          inline && 'shrink-0 max-w-full sm:max-w-none'
        )}
      >
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            status === 'live' ? 'bg-emerald-500' : status === 'polling' ? 'bg-amber-500' : 'bg-slate-400'
          )}
          aria-hidden
        />
        <span className="truncate">
          Safety monitor: {status === 'live' ? 'watching' : status === 'polling' ? 'checking' : 'offline'}
        </span>
        <Link to={dashboardPath} className={cn('font-semibold text-brand-700 hover:underline', inline ? 'shrink-0' : 'ml-auto')}>
          Alert history
        </Link>
      </div>
    );
  }

  const top = relevant[0];
  const severity = top.severity || (top.type === 'UNCONSCIOUS' ? 'critical' : top.type === 'FALL' ? 'warning' : 'info');

  if (inline) {
    return (
      <aside
        role="alert"
        aria-live="assertive"
        className={cn(
          'fall-alert-banner max-w-md shrink-0 rounded-xl border px-3 py-2 shadow-sm',
          severity === 'critical' && 'fall-alert-banner--critical',
          severity === 'warning' && 'fall-alert-banner--warning',
          severity === 'info' && 'fall-alert-banner--info'
        )}
      >
        <div className="flex items-start gap-2">
          <span className="fall-alert-pulse mt-1 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80 truncate">
              {severityLabel(severity, top.type)}
            </p>
            <p className="text-xs font-bold leading-snug line-clamp-2">{laymanAlertTitle(top)}</p>
          </div>
          <Link
            to={dashboardPath}
            className="shrink-0 text-[11px] font-semibold text-brand-700 hover:underline whitespace-nowrap"
          >
            View
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className={cn(
        'fall-alert-banner rounded-xl border px-4 py-3 shadow-sm',
        severity === 'critical' && 'fall-alert-banner--critical',
        severity === 'warning' && 'fall-alert-banner--warning',
        severity === 'info' && 'fall-alert-banner--info'
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="fall-alert-pulse mt-1 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            {severityLabel(severity, top.type)} · {formatAlertAge(top.timestamp)}
          </p>
          <p className="mt-0.5 text-sm font-bold leading-snug">{laymanAlertTitle(top)}</p>
          {!compact && (
            <p className="mt-1 text-xs leading-relaxed opacity-90">{laymanAlertSummary(top)}</p>
          )}
          {relevant.length > 1 && (
            <p className="mt-1 text-xs font-medium opacity-80">
              + {relevant.length - 1} more alert{relevant.length - 1 === 1 ? '' : 's'} need attention
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            to={dashboardPath}
            className="inline-flex items-center gap-1 rounded-lg border border-current/30 bg-white/80 px-2.5 py-1.5 text-xs font-semibold hover:bg-white"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <button
            type="button"
            className="rounded-lg border border-current/30 bg-transparent px-2.5 py-1.5 text-xs font-semibold hover:bg-white/50"
            onClick={() => ackOne(top._id)}
          >
            Dismiss
          </button>
        </div>
      </div>
    </aside>
  );
}

export function FallAlertStatusChip({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <Bell className="h-3.5 w-3.5" aria-hidden />
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'live' ? 'bg-emerald-500' : status === 'polling' ? 'bg-amber-500' : 'bg-slate-400'
        )}
      />
      {status === 'live' ? 'Live' : status === 'polling' ? 'Polling' : 'Offline'}
    </span>
  );
}
