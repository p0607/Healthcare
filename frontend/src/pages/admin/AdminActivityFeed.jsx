import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/StatusBadge.jsx';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';

const AdminActivityFeed = () => {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const { data } = await api.get('/requests/admin/all');
    setRequests(data.requests);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onActivity = (evt) => {
      toast(`Activity: ${evt.type.replace(/_/g, ' ')}`);
      load();
    };
    s.on('activity:new', onActivity);
    return () => s.off('activity:new', onActivity);
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  return (
    <div className="card">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-base text-foreground">Activity feed</h2>
          <p className="text-xs text-muted mt-0.5">Live booking updates across all services.</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input !w-auto !py-1.5 text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="on_the_way">On the way</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="mt-3 space-y-2 max-h-[min(70vh,640px)] overflow-y-auto">
        {filtered.length === 0 && <div className="text-muted text-sm">No activity.</div>}
        {filtered.map((r) => (
          <div key={r._id} className="rounded-xl border border-glass-border/60 bg-glass/25 p-3">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="font-semibold capitalize text-foreground">{r.serviceType.replace(/_/g, ' ')}</div>
                <div className="text-xs text-muted">
                  {r.user?.name} → {r.nurse?.name || <i>unassigned</i>}
                </div>
                <div className="text-xs text-muted/80 truncate">
                  {r.location?.address ||
                    `${r.location?.coordinates?.[1]?.toFixed(3)}, ${r.location?.coordinates?.[0]?.toFixed(3)}`}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <div className="text-[11px] text-muted/80 mt-2">{new Date(r.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminActivityFeed;
