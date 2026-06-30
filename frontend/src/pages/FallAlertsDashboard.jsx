import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useHealthcareFallAlertsContext } from '../healthcare/HealthcareFallAlertsContext.jsx';
import { FallAlertStatusChip } from '../healthcare/FallAlertBanner.jsx';
import {
  alertStableId,
  connectionStatusLabel,
  filterAlertsForViewer,
  formatAlertTime,
  laymanAlertSummary,
  laymanAlertTitle,
  loadAckIds,
  saveAckIds,
  severityLabel,
} from '../healthcare/fallAlertUtils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { cn } from '../lib/utils.js';

const SEV_ICON = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: CheckCircle2,
};

export default function FallAlertsDashboard() {
  const { user } = useAuth();
  const { alerts, status, error } = useHealthcareFallAlertsContext();
  const [ackIds, setAckIds] = useState(() => loadAckIds());
  const [showDismissed, setShowDismissed] = useState(false);

  const filtered = useMemo(
    () =>
      filterAlertsForViewer(alerts, user).map((a, idx) => ({
        ...a,
        _id: alertStableId(a, idx),
      })),
    [alerts, user]
  );

  const active = useMemo(() => filtered.filter((a) => !ackIds.has(a._id)), [filtered, ackIds]);
  const dismissed = useMemo(() => filtered.filter((a) => ackIds.has(a._id)), [filtered, ackIds]);
  const list = showDismissed ? dismissed : active;

  const dismiss = (id) => {
    const next = new Set(ackIds);
    next.add(id);
    setAckIds(next);
    saveAckIds(next);
  };

  const dismissAll = () => {
    const next = new Set(ackIds);
    active.forEach((a) => next.add(a._id));
    setAckIds(next);
    saveAckIds(next);
  };

  const roleHint =
    user?.role === 'admin'
      ? 'You see every safety alert for your organisation.'
      : user?.activeKind === 'guardian'
        ? 'You see alerts for people you care for.'
        : user?.role === 'nurse'
          ? 'You see alerts shared with care teams.'
          : 'You see alerts about your home monitoring.';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-rose-600" aria-hidden />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Safety alerts</h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted leading-relaxed">
            Fall and wellness alerts from your home monitoring — written in plain language. {roleHint}
          </p>
          <p className="mt-2 text-xs text-muted">{connectionStatusLabel(status)}</p>
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
        <FallAlertStatusChip status={status} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn('btn-outline !py-1.5 !px-3 text-xs', !showDismissed && 'border-brand-500/50 bg-brand-500/10')}
          onClick={() => setShowDismissed(false)}
        >
          Active ({active.length})
        </button>
        <button
          type="button"
          className={cn('btn-outline !py-1.5 !px-3 text-xs', showDismissed && 'border-brand-500/50 bg-brand-500/10')}
          onClick={() => setShowDismissed(true)}
        >
          Dismissed ({dismissed.length})
        </button>
        {active.length > 0 && !showDismissed && (
          <button type="button" className="btn-outline !py-1.5 !px-3 text-xs" onClick={dismissAll}>
            Dismiss all active
          </button>
        )}
      </div>

      <div className="card overflow-hidden !p-0">
        {list.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            {showDismissed ? 'No dismissed alerts yet.' : 'No active alerts — everything looks quiet right now.'}
          </p>
        ) : (
          <ul className="divide-y divide-glass-border/50">
            {list.map((alert) => {
              const severity =
                alert.severity ||
                (alert.type === 'UNCONSCIOUS' ? 'critical' : alert.type === 'FALL' ? 'warning' : 'info');
              const Icon = SEV_ICON[severity] || AlertTriangle;
              return (
                <li key={alert._id} className="flex flex-wrap gap-3 px-4 py-4 sm:px-5">
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      severity === 'critical' && 'bg-rose-100 text-rose-700',
                      severity === 'warning' && 'bg-amber-100 text-amber-800',
                      severity === 'info' && 'bg-emerald-100 text-emerald-800'
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'badge border text-[10px]',
                          severity === 'critical' && 'bg-rose-500/10 text-rose-800 border-rose-500/30',
                          severity === 'warning' && 'bg-amber-500/10 text-amber-900 border-amber-500/30',
                          severity === 'info' && 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30'
                        )}
                      >
                        {severityLabel(severity, alert.type)}
                      </span>
                      <time className="text-xs text-muted tabular-nums">{formatAlertTime(alert.timestamp)}</time>
                    </div>
                    <h2 className="mt-1 text-base font-semibold text-foreground">{laymanAlertTitle(alert)}</h2>
                    <p className="mt-1 text-sm text-muted leading-relaxed">{laymanAlertSummary(alert)}</p>
                    {alert.userName && (
                      <p className="mt-1 text-xs text-muted">
                        Person: <span className="font-medium text-foreground">{alert.userName}</span>
                      </p>
                    )}
                  </div>
                  {!showDismissed && (
                    <button
                      type="button"
                      className="btn-outline !py-1.5 !px-3 text-xs self-start"
                      onClick={() => dismiss(alert._id)}
                    >
                      Dismiss
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Alerts come from the Healthcare fall-detection system. Ask your IT team to add this app&apos;s URL to{' '}
        <code className="text-foreground">EXTRA_ORIGINS</code> in the Healthcare backend and keep that server running
        on port 4000.
      </p>
    </div>
  );
}
