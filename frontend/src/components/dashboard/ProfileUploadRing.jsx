import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

/** Base + bottom-fill colors by completion tier. */
export function profileRingTheme(percent) {
  if (percent >= 90) {
    return { base: '#15803d', fill: '#4ade80' };
  }
  if (percent >= 70) {
    return { base: '#4d7c0f', fill: '#a3e635' };
  }
  if (percent >= 50) {
    return { base: '#b45309', fill: '#fbbf24' };
  }
  return { base: '#b91c1c', fill: '#f87171' };
}

/**
 * Circular profile completion badge — fill rises from bottom; color reflects progress.
 */
export default function ProfileUploadRing({
  completion,
  className,
  to = '/dashboard/profile',
  size = 'default',
  onClick,
}) {
  const percent = Math.min(100, Math.max(0, Math.round(completion?.percent ?? 0)));
  const complete = percent >= 100;

  if (complete) return null;

  const { base, fill } = profileRingTheme(percent);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'profile-upload-ring shrink-0',
        size === 'header' && 'profile-upload-ring--header',
        className
      )}
      style={{
        '--profile-fill': `${percent}%`,
        '--profile-base': base,
        '--profile-fill-color': fill,
      }}
      title="Update profile"
      aria-label={`Profile ${percent}% complete — update profile`}
    >
      <span className="profile-upload-ring__liquid" aria-hidden>
        <span className="profile-upload-ring__wave profile-upload-ring__wave--a" />
        <span className="profile-upload-ring__wave profile-upload-ring__wave--b" />
      </span>
      <span className="profile-upload-ring__content">
        <span className="profile-upload-ring__label">Profile</span>
        <span className="profile-upload-ring__percent">{percent}%</span>
      </span>
    </Link>
  );
}
