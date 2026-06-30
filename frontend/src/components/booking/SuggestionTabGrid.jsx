import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import './VisitBookingFlow.css';

const COLUMN_CLASS = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

/**
 * @param {{
 *   layout?: 'grid' | 'vertical' | 'stacked' | 'rest',
 *   columns?: 2|3|4,
 *   cellWidth?: number,
 *   compact?: boolean,
 *   emphasized?: boolean,
 * }} props
 */
export function SuggestionCard({
  item,
  selected,
  onToggle,
  variant = 'hero',
  compact = false,
  lifted = false,
}) {
  const [broken, setBroken] = useState(false);
  const isMini = variant === 'mini';
  const initials = (item.label || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        'visit-category-card w-full text-left',
        isMini ? 'visit-category-card--mini' : 'visit-category-card--hero',
        selected && 'visit-category-card--active',
        lifted && 'suggestion-card--lifted'
      )}
    >
      <div className="visit-category-card__media relative">
        {item.imageUrl && !broken ? (
          <img src={item.imageUrl} alt="" onError={() => setBroken(true)} />
        ) : (
          <div className="visit-category-card__fallback" aria-hidden>
            {initials}
          </div>
        )}
        {selected && !isMini && (
          <span className="suggestion-card__check absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-md">
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
          </span>
        )}
      </div>
      <div className="visit-category-card__body">
        <div className="visit-category-card__label line-clamp-2">{item.label}</div>
        {item.priceLabel && <div className="visit-category-card__sub">{item.priceLabel}</div>}
        {!compact && !isMini && item.description && (
          <p className="mt-1 text-[11px] text-muted leading-snug line-clamp-2">{item.description}</p>
        )}
      </div>
    </button>
  );
}

export default function SuggestionTabGrid({
  items,
  selectedIds = [],
  onToggle,
  columns = 4,
  layout = 'grid',
  cellWidth,
}) {
  const cellStyle = cellWidth
    ? {
        width: cellWidth,
        minWidth: cellWidth,
        '--suggestion-cell-width': `${cellWidth}px`,
      }
    : undefined;

  if (layout === 'rest') {
    return (
      <div className="suggestion-rest--vertical">
        {items.length === 0 ? (
          <p className="text-[11px] text-muted text-center py-4 px-1">All services selected.</p>
        ) : (
          items.map((item) => (
            <SuggestionCard
              key={item.id}
              item={item}
              selected={false}
              variant="mini"
              onToggle={() => onToggle(item.id)}
            />
          ))
        )}
      </div>
    );
  }

  if (layout === 'stacked') {
    const selected = items.filter((item) => selectedIds.includes(item.id));
    const unselected = items.filter((item) => !selectedIds.includes(item.id));
    const selectedCount = selected.length;
    const rowCols = Math.min(Math.max(selectedCount, 1), 4);
    const countClass = `suggestion-selected-stack--cols-${rowCols}`;

    const widthVars = cellWidth ? { '--suggestion-cell-width': `${cellWidth}px` } : undefined;

    return (
      <div className="suggestion-selected-layout" style={widthVars}>
        {selected.length > 0 && (
          <div className={cn('suggestion-selected-stack', countClass)}>
            {selected.map((item) => (
              <SuggestionCard
                key={item.id}
                item={item}
                selected
                lifted
                compact
                variant="hero"
                onToggle={() => onToggle(item.id)}
              />
            ))}
          </div>
        )}
        {unselected.length > 0 && (
          <div className="suggestion-rest--vertical">
            {unselected.map((item) => (
              <SuggestionCard
                key={item.id}
                item={item}
                selected={false}
                variant="mini"
                onToggle={() => onToggle(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div className="suggestion-rest--vertical">
        {items.length === 0 ? (
          <p className="text-[11px] text-muted text-center py-4 px-1">All services selected.</p>
        ) : (
          items.map((item) => (
            <SuggestionCard
              key={item.id}
              item={item}
              selected={false}
              variant="mini"
              onToggle={() => onToggle(item.id)}
            />
          ))
        )}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-2 sm:gap-2.5', COLUMN_CLASS[columns] || COLUMN_CLASS[4])}>
      {items.map((item) => (
        <SuggestionCard
          key={item.id}
          item={item}
          selected={selectedIds.includes(item.id)}
          onToggle={() => onToggle(item.id)}
        />
      ))}
    </div>
  );
}
