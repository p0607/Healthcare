const COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-blue-100 text-blue-800',
  on_the_way: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

const LABEL = {
  pending: 'Pending',
  accepted: 'Accepted',
  on_the_way: 'On the way',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const StatusBadge = ({ status }) => (
  <span className={`badge ${COLORS[status] || 'bg-slate-100 text-slate-700'}`}>
    {LABEL[status] || status}
  </span>
);

export default StatusBadge;
