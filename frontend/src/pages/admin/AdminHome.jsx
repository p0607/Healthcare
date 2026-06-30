import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge.jsx';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import AdminOverviewBlocks from './AdminOverviewBlocks.jsx';

const VALUE_COLORS = {
  brand: 'text-brand-700 dark:text-brand-300',
  emerald: 'text-emerald-700 dark:text-emerald-300',
  amber: 'text-amber-700 dark:text-amber-300',
  violet: 'text-violet-700 dark:text-violet-300',
};

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const serviceLabel = (value) => value?.replace(/_/g, ' ') || '—';

const fmtDate = (value) => (value ? new Date(value).toLocaleString() : '—');

const statShell =
  'rounded-xl bg-glass/60 shadow-soft border border-glass-border/60 p-2 sm:p-2.5 min-w-0 text-left transition-all hover:border-brand-400/60 hover:bg-glass-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';

const StatCard = ({ label, value, color = 'brand', active, onClick }) => {
  const valueCls = VALUE_COLORS[color] || VALUE_COLORS.brand;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${statShell} ${active ? 'border-brand-500/70 bg-brand-500/10' : ''}`}
    >
      <div className="text-[10px] sm:text-xs text-muted leading-tight truncate">{label}</div>
      <div className={`mt-0.5 text-[11px] sm:text-base md:text-lg font-bold leading-snug tabular-nums ${valueCls}`}>
        {value}
      </div>
    </button>
  );
};

const detailTitles = {
  patients: 'Patients',
  nurses: 'Caregivers',
  active: 'Active jobs',
  completed: 'Completed jobs',
  revenue: 'Revenue bookings',
};

const AdminHome = () => {
  const [stats, setStats] = useState(null);
  const [detailKind, setDetailKind] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get('/requests/admin/stats');
    setStats(data.counts);
  };

  const loadDetail = async (kind) => {
    setDetailKind(kind);
    setDetailLoading(true);
    try {
      if (kind === 'patients' || kind === 'nurses') {
        const role = kind === 'patients' ? 'user' : 'nurse';
        const { data } = await api.get('/nurses/admin/users', { params: { role } });
        setDetailRows(data.users || []);
        return;
      }
      if (kind === 'revenue') {
        const { data } = await api.get('/requests/admin/paid');
        setDetailRows(data.requests || []);
        return;
      }
      const { data } = await api.get('/requests/admin/all');
      const wanted = kind === 'active' ? ['accepted', 'on_the_way', 'in_progress'] : ['completed'];
      setDetailRows((data.requests || []).filter((r) => wanted.includes(r.status)));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load details');
      setDetailRows([]);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onActivity = () => load();
    s.on('activity:new', onActivity);
    return () => s.off('activity:new', onActivity);
  }, []);

  return (
    <>
      {stats && (
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 md:gap-3">
          <StatCard label="Patients" value={stats.users} active={detailKind === 'patients'} onClick={() => loadDetail('patients')} />
          <StatCard label="Nurses" value={stats.nurses} color="emerald" active={detailKind === 'nurses'} onClick={() => loadDetail('nurses')} />
          <StatCard label="Active jobs" value={stats.active} color="amber" active={detailKind === 'active'} onClick={() => loadDetail('active')} />
          <StatCard label="Completed" value={stats.completed} color="emerald" active={detailKind === 'completed'} onClick={() => loadDetail('completed')} />
          <StatCard
            label="Revenue"
            value={fmtInr(stats.revenueTotal ?? 0)}
            color="violet"
            active={detailKind === 'revenue'}
            onClick={() => loadDetail('revenue')}
          />
        </div>
      )}

      <AdminOverviewBlocks />

      {detailKind && (
        <div className="card mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-glass-border/60 pb-3">
            <div>
              <h2 className="font-semibold text-base text-foreground">{detailTitles[detailKind]}</h2>
              <p className="text-xs text-muted mt-0.5">
                {detailLoading ? 'Loading details…' : `${detailRows.length} record${detailRows.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => loadDetail(detailKind)}>
                Refresh
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-glass-border/70 bg-glass/50 text-muted hover:bg-glass-elevated/70 hover:text-foreground transition-colors"
                onClick={() => {
                  setDetailKind(null);
                  setDetailRows([]);
                }}
                aria-label="Close details"
              >
                ×
              </button>
            </div>
          </div>

          <div className="overflow-x-auto mt-3">
            {detailLoading ? (
              <p className="py-8 text-center text-sm text-muted">Loading…</p>
            ) : detailRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No records found.</p>
            ) : detailKind === 'patients' || detailKind === 'nurses' ? (
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left text-muted border-b border-glass-border/60">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Phone</th>
                    {detailKind === 'nurses' && <th className="py-2 pr-3">Specialization</th>}
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((u) => (
                    <tr key={u._id || u.id} className="border-b last:border-0 border-glass-border/60 text-foreground/85">
                      <td className="py-2.5 pr-3 font-medium text-foreground">{u.name || '—'}</td>
                      <td className="py-2.5 pr-3 text-muted">{u.email || '—'}</td>
                      <td className="py-2.5 pr-3 text-muted">{u.phone || '—'}</td>
                      {detailKind === 'nurses' && <td className="py-2.5 pr-3 text-muted">{u.specialization || '—'}</td>}
                      <td className="py-2.5 pr-3 text-muted max-w-[240px]">
                        <span className="line-clamp-2">{u.location?.address || '—'}</span>
                      </td>
                      <td className="py-2.5 text-muted whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="text-left text-muted border-b border-glass-border/60">
                    <th className="py-2 pr-3">Service</th>
                    <th className="py-2 pr-3">Patient</th>
                    <th className="py-2 pr-3">Caregiver</th>
                    <th className="py-2 pr-3">Location</th>
                    {detailKind === 'revenue' && <th className="py-2 pr-3 text-right">Amount</th>}
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((r) => (
                    <tr key={r._id} className="border-b last:border-0 border-glass-border/60 text-foreground/85">
                      <td className="py-2.5 pr-3 font-medium capitalize text-foreground">{serviceLabel(r.serviceType)}</td>
                      <td className="py-2.5 pr-3 text-muted">{r.user?.name || '—'}</td>
                      <td className="py-2.5 pr-3 text-muted">{r.nurse?.name || '—'}</td>
                      <td className="py-2.5 pr-3 text-muted max-w-[260px]">
                        <span className="line-clamp-2">{r.location?.address || '—'}</span>
                      </td>
                      {detailKind === 'revenue' && (
                        <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                          {fmtInr(r.feeAmount)}
                        </td>
                      )}
                      <td className="py-2.5 pr-3 text-muted whitespace-nowrap">
                        {fmtDate(detailKind === 'revenue' ? r.paidAt : r.createdAt)}
                      </td>
                      <td className="py-2.5"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </>
  );
};

export default AdminHome;
