import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge.jsx';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const AdminRevenue = () => {
  const [requests, setRequests] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get('/requests/admin/paid');
    setRequests(data.requests || []);
    setTotalRevenue(Number(data.totalRevenue) || 0);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e) {
        toast.error(e.response?.data?.message || 'Could not load paid bookings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onActivity = () => {
      load();
    };
    s.on('activity:new', onActivity);
    return () => s.off('activity:new', onActivity);
  }, []);

  return (
    <div>
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Back to overview
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Paid bookings</h2>
          <p className="text-sm text-muted mt-0.5">
            Jobs where payment was collected. Status shows where each visit stands today.
          </p>
        </div>
        <div className="card py-3 px-4">
          <div className="text-xs text-muted">Total collected</div>
          <div className="text-xl font-bold text-violet-700 dark:text-violet-300">{fmtInr(totalRevenue)}</div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="text-muted text-sm py-6 text-center">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="text-muted text-sm py-6 text-center">No paid bookings yet.</div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-muted border-b border-glass-border/60">
                <th className="py-2 pr-3">Service</th>
                <th className="py-2 pr-3">Patient</th>
                <th className="py-2 pr-3">Caregiver</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3">Paid</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id} className="border-b last:border-0 border-glass-border/60 text-foreground/85">
                  <td className="py-2.5 pr-3 font-medium capitalize text-foreground">{r.serviceType?.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-3">{r.user?.name || '—'}</td>
                  <td className="py-2.5 pr-3">{r.nurse?.name || '—'}</td>
                  <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-violet-700 dark:text-violet-300">{fmtInr(r.feeAmount)}</td>
                  <td className="py-2.5 pr-3 text-muted whitespace-nowrap">
                    {r.paidAt ? new Date(r.paidAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminRevenue;
