import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils.js';

/**
 * @typedef {object} SeasonCardData
 * @property {string} id
 * @property {string} [serviceType]
 * @property {string} title
 * @property {string} subtitle
 * @property {string} description
 * @property {string} imageSrc
 * @property {string} [imageAlt]
 */

function CardVisual({ title, imageSrc, imageAlt, onImageError }) {
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        className="season-card-image absolute inset-0 h-full w-full object-cover object-center"
        alt={imageAlt || title}
        onError={onImageError}
      />
    );
  }
  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="season-card-fallback absolute inset-0 flex items-center justify-center" aria-hidden>
      <span className="text-4xl font-bold tracking-tight text-[#ffffff]">{initials || '?'}</span>
    </div>
  );
}

function SeasonCard({
  id,
  serviceType,
  title,
  subtitle,
  description,
  imageSrc,
  imageAlt,
  selected,
  onSelect,
  compact,
  imageOnly,
  inGrid,
  className,
}) {
  const interactive = typeof onSelect === 'function';
  const payload = { id, serviceType, title, subtitle, description, imageSrc, imageAlt };
  const [brokenImage, setBrokenImage] = useState(false);
  const visualSrc = brokenImage ? '' : imageSrc;

  if (compact && !imageOnly) {
    return (
      <div
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? () => onSelect(payload) : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(payload);
                }
              }
            : undefined
        }
        className={cn(
          'season-card-compact group relative flex w-[9.5rem] shrink-0 flex-col overflow-hidden rounded-xl border border-glass-border/60 bg-white shadow-md transition-all duration-300',
          interactive && 'cursor-pointer hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          selected && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-white',
          className
        )}
      >
        <div className="relative h-36 w-full overflow-hidden bg-muted/20">
          <CardVisual
            title={title}
            imageSrc={visualSrc}
            imageAlt={imageAlt}
            onImageError={() => setBrokenImage(true)}
          />
          {selected && (
            <span className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-[#ffffff] shadow-lg">
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-end p-2.5">
          <h2 className="line-clamp-2 text-sm font-bold leading-snug text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs font-semibold text-brand-700 tabular-nums">{subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => onSelect(payload) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(payload);
              }
            }
          : undefined
      }
      className={cn(
        'group relative flex flex-col justify-end overflow-hidden shadow-lg transition-all duration-500',
        imageOnly ? 'rounded-[1.75rem] h-[280px] sm:h-[320px] lg:h-[360px] flex-1 min-w-0' : 'rounded-xl',
        !imageOnly && (compact ? 'h-[280px] min-h-[240px]' : inGrid ? 'h-[280px] sm:h-[320px]' : 'h-[350px] lg:h-[420px]'),
        interactive && 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        interactive && !imageOnly && !inGrid && 'flex-1 min-w-0 hover:flex-[1.35]',
        !interactive && !imageOnly && !inGrid && 'w-full md:w-1/4',
        selected && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-white',
        imageOnly && selected && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-teal-50',
        className
      )}
    >
      <CardVisual
        title={title}
        imageSrc={visualSrc}
        imageAlt={imageAlt}
        onImageError={() => setBrokenImage(true)}
      />
      {!imageOnly && (
        <>
          <div className="season-card-overlay absolute inset-0 transition-colors duration-500 group-hover:opacity-90" />
          {selected && (
            <span className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-[#ffffff] shadow-lg">
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
            </span>
          )}
          <div className="season-card-caption relative z-10 space-y-1 p-4 md:absolute md:bottom-16 md:p-5">
            <h2 className="text-base font-bold leading-tight md:text-lg">{title}</h2>
            <p className="text-sm font-semibold">{subtitle}</p>
          </div>
          <div className="season-card-description relative z-10 mt-2 translate-y-4 p-4 pt-0 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 md:absolute md:bottom-0 md:left-0 md:right-0 md:mt-0 md:p-5">
            <p className="text-sm leading-relaxed md:text-base">{description}</p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * @param {object} props
 * @param {SeasonCardData[]} props.cards
 * @param {string[]} [props.selectedIds]
 * @param {(card: SeasonCardData) => void} [props.onCardSelect]
 * @param {boolean} [props.compact] — single-row dashboard layout (4 cards)
 * @param {boolean} [props.wrap] — grid layout for view-all page (4 per row on large screens)
 * @param {boolean} [props.imageOnly] — photos only, no titles or overlays
 * @param {string} [props.className]
 */
export function SeasonalHoverCards({
  cards,
  selectedIds = [],
  onCardSelect,
  compact = false,
  wrap = false,
  imageOnly = false,
  className,
}) {
  return (
    <div
      className={cn(
        'w-full gap-3',
        wrap
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          : cn('flex', compact && !imageOnly ? 'overflow-x-auto pb-1 scrollbar-thin' : 'px-0', 'flex-nowrap'),
        imageOnly && 'gap-4 sm:gap-5',
        className
      )}
    >
      {cards.map((card) => (
        <SeasonCard
          key={card.id}
          {...card}
          compact={compact}
          imageOnly={imageOnly}
          inGrid={wrap}
          selected={selectedIds.includes(card.id)}
          onSelect={onCardSelect}
          className={wrap ? 'w-full min-w-0' : undefined}
        />
      ))}
    </div>
  );
}
