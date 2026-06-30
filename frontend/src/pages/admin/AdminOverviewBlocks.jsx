import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatAlertAge, laymanAlertTitle } from '../../healthcare/fallAlertUtils.js';
import { useHealthcareFallAlertsContext } from '../../healthcare/HealthcareFallAlertsContext.jsx';
import { api } from '../../lib/api';

const PREVIEW_LIMIT = 3;

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const fmtDate = (value) => (value ? new Date(value).toLocaleString() : '—');

const serviceLabel = (value) => value?.replace(/_/g, ' ') || '—';

const roleLabel = (role) => {
  if (role === 'user') return 'Patient';
  if (role === 'nurse') return 'Caregiver';
  if (role === 'admin') return 'Admin';
  return role || '—';
};

const sortByNewest = (rows, key = 'createdAt') =>
  [...rows].sort((a, b) => new Date(b[key] || 0) - new Date(a[key] || 0));

function flattenMarketingServices(sections) {
  const items = [];
  for (const section of sections || []) {
    for (const svc of section.services || []) {
      items.push({
        id: `${section.id}-${svc.id}`,
        sectionTitle: section.title || section.serviceName,
        name: svc.laymanName || svc.name,
        rate: svc.rate,
      });
    }
  }
  return items;
}

const OverviewBlock = ({ title, viewAllTo, loading, emptyText, children }) => (
  <div className="card !p-3 sm:!p-3.5 flex flex-col min-h-0">
    <div className="flex items-start justify-between gap-2 border-b border-glass-border/60 pb-2">
      <h3 className="font-semibold text-xs sm:text-sm text-foreground">{title}</h3>
      <Link
        to={viewAllTo}
        className="text-[11px] font-semibold text-brand-700 dark:text-brand-300 hover:underline shrink-0"
      >
        View all
      </Link>
    </div>
    <div className="mt-1.5 flex-1 space-y-1.5">
      {loading ? (
        <p className="text-xs text-muted py-3 text-center">Loading…</p>
      ) : children?.length ? (
        children
      ) : (
        <p className="text-xs text-muted py-3 text-center">{emptyText}</p>
      )}
    </div>
  </div>
);

const PreviewRow = ({ primary, secondary, meta }) => (
  <div className="rounded-lg border border-glass-border/60 bg-glass/25 px-2 py-1.5 min-w-0">
    <div className="text-xs font-medium text-foreground truncate">{primary}</div>
    {secondary && <div className="text-[11px] text-muted truncate mt-0.5">{secondary}</div>}
    {meta && <div className="text-[10px] text-muted/80 mt-0.5 truncate">{meta}</div>}
  </div>
);

const AdminOverviewBlocks = () => {
  const { alerts: liveAlerts } = useHealthcareFallAlertsContext();
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [visitOptions, setVisitOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [activityRes, usersRes, servicesRes, visitRes] = await Promise.all([
          api.get('/requests/admin/all'),
          api.get('/nurses/admin/users'),
          api.get('/marketing-services/admin/all'),
          api.get('/care-services/admin/all'),
        ]);

        if (cancelled) return;

        setActivity(sortByNewest(activityRes.data.requests || []).slice(0, PREVIEW_LIMIT));
        setUsers(sortByNewest(usersRes.data.users || []).slice(0, PREVIEW_LIMIT));
        setServices(flattenMarketingServices(servicesRes.data.sections).slice(0, PREVIEW_LIMIT));
        setVisitOptions((visitRes.data.options || []).slice(0, PREVIEW_LIMIT));
      } catch {
        if (!cancelled) {
          setActivity([]);
          setUsers([]);
          setServices([]);
          setVisitOptions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const safetyAlerts = useMemo(
    () =>
      [...liveAlerts]
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
        .slice(0, PREVIEW_LIMIT),
    [liveAlerts]
  );

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
      <OverviewBlock
        title="Activity feed"
        viewAllTo="/admin/activity"
        loading={loading}
        emptyText="No recent activity."
      >
        {activity.map((r) => (
          <div key={r._id} className="rounded-lg border border-glass-border/60 bg-glass/25 px-2 py-1.5 min-w-0">
            <div className="flex justify-between items-start gap-1.5">
              <div className="min-w-0">
                <div className="text-xs font-medium capitalize text-foreground truncate">{serviceLabel(r.serviceType)}</div>
                <div className="text-[11px] text-muted truncate mt-0.5">
                  {r.user?.name || 'Patient'} → {r.nurse?.name || 'unassigned'}
                </div>
                <div className="text-[10px] text-muted/80 mt-0.5">{fmtDate(r.createdAt)}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          </div>
        ))}
      </OverviewBlock>

      <OverviewBlock
        title="Safety alerts"
        viewAllTo="/admin/alerts"
        loading={false}
        emptyText="No safety alerts right now."
      >
        {safetyAlerts.map((alert, index) => (
          <PreviewRow
            key={alert.id || `${alert.timestamp}-${index}`}
            primary={laymanAlertTitle(alert)}
            secondary={alert.userName || alert.source || 'Home monitor'}
            meta={formatAlertAge(alert.timestamp)}
          />
        ))}
      </OverviewBlock>

      <OverviewBlock title="Users" viewAllTo="/admin/users" loading={loading} emptyText="No users yet.">
        {users.map((u) => (
          <PreviewRow
            key={u._id || u.id}
            primary={u.name || '—'}
            secondary={`${roleLabel(u.role)} · ${u.email || '—'}`}
            meta={`Joined ${fmtDate(u.createdAt)}`}
          />
        ))}
      </OverviewBlock>

      <OverviewBlock title="Add service" viewAllTo="/admin/services" loading={loading} emptyText="No services added yet.">
        {services.map((svc) => (
          <PreviewRow
            key={svc.id}
            primary={svc.name || '—'}
            secondary={svc.sectionTitle || 'Marketing service'}
            meta={fmtInr(svc.rate)}
          />
        ))}
      </OverviewBlock>

      <OverviewBlock
        title="Patient visit options"
        viewAllTo="/admin/visit-options"
        loading={loading}
        emptyText="No visit options yet."
      >
        {visitOptions.map((o) => (
          <PreviewRow
            key={o.id}
            primary={o.label || '—'}
            secondary={serviceLabel(o.serviceType)}
            meta={`${fmtInr(o.rate)}${o.active === false ? ' · inactive' : ''}`}
          />
        ))}
      </OverviewBlock>
    </div>
  );
};

export default AdminOverviewBlocks;
