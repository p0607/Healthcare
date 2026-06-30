import { useHealthcareFallAlertsContext } from '../../healthcare/HealthcareFallAlertsContext.jsx';
import { cn } from '../../lib/utils';

/** Green when live/polling, red when offline — label: Monitoring ON / OFF */
export default function MonitoringStatus({ compact = false, compactOnMobile = false }) {
  const { status } = useHealthcareFallAlertsContext();
  const online = status === 'live' || status === 'polling';
  const label = online ? 'Monitoring ON' : 'Monitoring OFF';
  const shortLabel = online ? 'ON' : 'OFF';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-glass-border/60 bg-white px-2.5 py-1.5 text-xs font-medium text-foreground shrink-0 min-h-[34px]',
        compact && 'px-1.5',
        compactOnMobile && 'dashboard-monitoring--responsive'
      )}
      title={label}
    >
      <span
        className={cn('h-2 w-2 shrink-0 rounded-full', online ? 'bg-emerald-500' : 'bg-red-500')}
        aria-hidden
      />
      {!compact && (
        <>
          {compactOnMobile ? (
            <>
              <span className="hidden sm:inline whitespace-nowrap">{label}</span>
              <span className="sm:hidden whitespace-nowrap">{shortLabel}</span>
            </>
          ) : (
            <span className="whitespace-nowrap">{label}</span>
          )}
        </>
      )}
    </div>
  );
}
