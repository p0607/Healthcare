import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import ProfileCompletionPie from './ProfileCompletionPie.jsx';

const ProfileCompletionAlert = ({ completion, variant = 'banner', profileLink = '/dashboard/profile' }) => {
  const { percent = 0, pending = 0 } = completion || {};
  if (percent >= 100 || pending <= 0) return null;

  if (variant === 'compact') {
    return (
      <div className="glass-panel border-rose-500/40 bg-rose-500/10 px-4 py-3 flex items-center gap-4">
        <ProfileCompletionPie completion={completion} size={72} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-rose-300">Profile update required</p>
          <p className="text-xs text-rose-200/80 mt-0.5">
            {pending} field{pending === 1 ? '' : 's'} still missing — complete for visit verification.
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'tab') {
    return (
      <div className="dashboard-profile-tab shrink-0 flex items-center gap-2 rounded-xl border border-rose-500/45 bg-rose-50 px-2 py-1.5 shadow-sm">
        <ProfileCompletionPie completion={completion} size={44} />
        <Link
          to={profileLink}
          className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white whitespace-nowrap hover:bg-rose-500 transition-colors"
        >
          Update profile
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel border-rose-500/50 bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-transparent px-3 py-2.5 sm:px-4 sm:py-3 shadow-glass">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <ProfileCompletionPie completion={completion} size={58} />
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="inline-flex items-center gap-1 rounded-md bg-rose-600/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            <AlertCircle className="w-3 h-3" aria-hidden />
            Profile update required
          </div>
        </div>
        <div className="shrink-0 w-full sm:w-auto">
          <Link
            to={profileLink}
            className="inline-flex w-full items-center justify-center rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-[0_0_18px_-5px_rgba(244,63,94,0.5)] hover:bg-rose-500 transition-colors"
          >
            Update profile now
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-3 text-[9px] font-medium">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-sm bg-emerald-500" aria-hidden />
              Completed ({completion.filled})
            </span>
            <span className="inline-flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-sm bg-rose-500" aria-hidden />
              Pending ({pending})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionAlert;
