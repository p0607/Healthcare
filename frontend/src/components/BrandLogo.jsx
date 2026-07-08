import { Link } from 'react-router-dom';
import { APP_LOGO_ALT, APP_LOGO_FILE, APP_NAME, APP_TAGLINE } from '@nursecare/shared';
import { cn } from '../lib/utils';

const LOGO_SRC = `${import.meta.env.BASE_URL}${APP_LOGO_FILE}`;

const SIZE = {
  sm: { image: 'w-8 h-8', name: 'text-sm', gap: 'gap-2' },
  md: { image: 'w-9 h-9 sm:w-10 sm:h-10', name: 'text-base sm:text-lg', gap: 'gap-2.5' },
  lg: { image: 'w-12 h-12 sm:w-14 sm:h-14', name: 'text-xl sm:text-2xl', gap: 'gap-3' },
};

const BrandLogo = ({
  size = 'md',
  showName = true,
  showTagline = false,
  to,
  className,
  onClick,
  nameClassName,
}) => {
  const s = SIZE[size] || SIZE.md;
  const inner = (
    <>
      <img
        src={LOGO_SRC}
        alt={APP_LOGO_ALT}
        className={cn(
          'rounded-xl object-contain shrink-0 bg-white/90 dark:bg-white/95 p-0.5 shadow-[0_4px_14px_-4px_rgba(15,23,42,0.35)]',
          s.image,
          to || onClick ? 'group-hover:scale-105 transition-transform' : null
        )}
      />
      {showName ? (
        <span className={cn('flex flex-col min-w-0', showTagline ? 'gap-0.5' : null)}>
          <span
            className={cn(
              'font-bold tracking-tight text-gradient-brand leading-none',
              s.name,
              nameClassName
            )}
          >
            {APP_NAME}
          </span>
          {showTagline ? (
            <span className="text-[10px] sm:text-xs text-muted font-medium leading-tight truncate">
              {APP_TAGLINE}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );

  const rootClass = cn('inline-flex items-center group shrink-0', s.gap, className);

  if (to) {
    return (
      <Link to={to} className={rootClass} aria-label={`${APP_NAME} home`} onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={rootClass} role="img" aria-label={APP_NAME}>
      {inner}
    </div>
  );
};

export default BrandLogo;
