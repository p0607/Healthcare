import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigation, Star, UserRound } from 'lucide-react';
import SuggestionTabGrid from './SuggestionTabGrid.jsx';
import FloatingContinueToCartBar from './FloatingContinueToCartBar.jsx';
import { mergeServiceCategoryCards } from '../../lib/serviceCategoryCards.js';
import { api } from '../../lib/api';
import './VisitBookingFlow.css';

function CategoryCard({ card, variant = 'hero', active, onSelect }) {
  const [broken, setBroken] = useState(false);
  const isList = variant === 'list';
  const isMini = variant === 'mini';
  const isCompact = variant === 'compact' || isMini;
  const isSelected = variant === 'selected';
  const isFeatured = variant === 'featured' || isSelected;
  const initials = card.label
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={() => onSelect(card.serviceType)}
        className="visit-category-text-row"
        aria-pressed={active}
      >
        <span className="visit-category-text-row__label">{card.label}</span>
        {card.subtitle && <span className="visit-category-text-row__sub">{card.subtitle}</span>}
      </button>
    );
  }

  if (variant === 'tab' || variant === 'tab-mini') {
    const isMini = variant === 'tab-mini';
    return (
      <button
        type="button"
        onClick={() => onSelect(card.serviceType)}
        className={`visit-category-tab${isMini ? ' visit-category-tab--mini' : ''}${active ? ' visit-category-tab--active' : ''}`}
        aria-pressed={active}
      >
        <span className="visit-category-tab__label">{card.label}</span>
        {card.subtitle && <span className="visit-category-tab__sub">{card.subtitle}</span>}
      </button>
    );
  }

  if (isList) {
    return (
      <button
        type="button"
        onClick={() => onSelect(card.serviceType)}
        className="visit-category-list-row"
        aria-pressed={active}
      >
        {card.imageSrc && !broken ? (
          <img src={card.imageSrc} alt="" className="visit-category-list-row__thumb" onError={() => setBroken(true)} />
        ) : (
          <span className="visit-category-list-row__thumb visit-category-list-row__thumb--fallback" aria-hidden>
            {initials}
          </span>
        )}
        <span className="visit-category-list-row__body min-w-0 flex-1">
          <span className="visit-category-list-row__label">{card.label}</span>
          {card.subtitle && <span className="visit-category-list-row__sub">{card.subtitle}</span>}
        </span>
      </button>
    );
  }

  const variantClass = isSelected
    ? 'visit-category-card--selected'
    : isFeatured
      ? 'visit-category-card--featured'
      : isMini
      ? 'visit-category-card--mini'
      : isCompact
        ? 'visit-category-card--compact'
        : 'visit-category-card--hero';

  return (
    <button
      type="button"
      onClick={() => onSelect(card.serviceType)}
      className={`visit-category-card ${variantClass} ${active ? 'visit-category-card--active' : ''}`}
      aria-pressed={active}
    >
      <div className="visit-category-card__media">
        {card.imageSrc && !broken ? (
          <img src={card.imageSrc} alt="" onError={() => setBroken(true)} />
        ) : (
          <div className="visit-category-card__fallback" aria-hidden>
            {initials}
          </div>
        )}
      </div>
      <div className="visit-category-card__body">
        <div className="visit-category-card__label">{card.label}</div>
        {(isFeatured || (!isCompact && !isMini)) && card.subtitle && (
          <div className="visit-category-card__sub">{card.subtitle}</div>
        )}
      </div>
    </button>
  );
}

const VisitBookingFlow = ({
  serviceType,
  activeCategory,
  onActiveCategoryChange,
  onServiceTypeChange,
  bookingCopy,
  sectionLabelClass,
  catalogForBooking,
  filteredReasonOptions,
  allSuggestionCards,
  selectedCareIds,
  onSuggestionCardSelect,
  hasChosenVisitFocus,
  filteredCaregivers,
  locationConfirmed,
  kindBadge,
  initialsFromName,
  onContinueToCart,
  onFloatingContinueToCart,
  selectedCaregiver,
  onOpenCaregiverPicker,
}) => {
  const [categoryCards, setCategoryCards] = useState(() => mergeServiceCategoryCards());
  const [categoryCellWidth, setCategoryCellWidth] = useState(null);
  const categoryGridRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/booking-categories');
        if (!cancelled) setCategoryCards(mergeServiceCategoryCards(data.categories));
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const panelSuggestionItems = useMemo(
    () =>
      allSuggestionCards.map((card) => ({
        id: card.id,
        label: card.title,
        imageUrl: card.imageSrc || '',
        priceLabel: card.subtitle,
        description: card.description || '',
      })),
    [allSuggestionCards]
  );

  const hasSelectedSuggestions = selectedCareIds.length > 0;

  const measureCategoryCell = useCallback(() => {
    const cell = categoryGridRef.current?.querySelector('.visit-category-tab, .visit-category-card');
    if (!cell) return;
    const width = Math.round(cell.getBoundingClientRect().width);
    if (width > 0) setCategoryCellWidth(width);
  }, []);

  useEffect(() => {
    measureCategoryCell();
    const grid = categoryGridRef.current;
    if (!grid) return undefined;
    const ro = new ResizeObserver(measureCategoryCell);
    ro.observe(grid);
    window.addEventListener('resize', measureCategoryCell);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measureCategoryCell);
    };
  }, [activeCategory, categoryCards, measureCategoryCell]);

  const pickCategory = useCallback(
    (st) => {
      measureCategoryCell();
      onActiveCategoryChange(st);
      onServiceTypeChange(st);
    },
    [measureCategoryCell, onActiveCategoryChange, onServiceTypeChange]
  );

  const showNursePanel = Boolean(activeCategory && hasChosenVisitFocus);

  const handleSuggestionToggle = useCallback(
    (id) => {
      onSuggestionCardSelect({ id });
    },
    [onSuggestionCardSelect]
  );

  const gridLayoutClass = showNursePanel ? 'visit-booking-grid--split' : '';

  const renderCaregiverList = () => (
    <div className="visit-panel-stage flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
      {locationConfirmed && filteredCaregivers.length > 0 ? (
        filteredCaregivers.map((n) => {
          const kb = kindBadge(n._kind);
          return (
            <button
              key={n._id}
              type="button"
              onClick={() => onContinueToCart?.(n)}
              className="group flex w-full flex-col gap-2 rounded-xl border border-glass-border/60 bg-glass/40 p-3 text-left transition-all duration-200 hover:border-brand-500/30 hover:bg-glass-elevated/50 hover:shadow-md"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300 text-xs font-bold tracking-tight border border-brand-500/30">
                  {initialsFromName(n.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-foreground text-sm leading-tight">{n.name}</span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${kb.className}`}
                    >
                      {kb.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5 line-clamp-2 leading-snug">
                    {n.specialization || 'Home care professional'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted pt-1 border-t border-glass-border/50">
                <span className="flex items-center gap-0.5 tabular-nums">
                  <Navigation className="w-3 h-3 opacity-70 shrink-0" aria-hidden />
                  {n.distanceKm != null ? `${Number(n.distanceKm).toFixed(2)} km` : '-'}
                </span>
                <span className="inline-flex items-center gap-0.5 text-amber-700 font-medium tabular-nums ml-auto">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" aria-hidden />
                  {n.rating?.toFixed?.(1) ?? '-'}
                </span>
              </div>
            </button>
          );
        })
      ) : (
        <div className="rounded-xl border border-dashed border-glass-border/60 bg-glass/25 px-3 py-8 text-center text-xs text-muted leading-relaxed">
          {locationConfirmed ? bookingCopy.nearbyEmptyConfirmed : bookingCopy.nearbyEmptyUnconfirmed}
        </div>
      )}
    </div>
  );

  return (
    <div className="visit-booking-flow">
      <div className={`visit-booking-grid ${gridLayoutClass}`}>
        <div className="visit-booking-main visit-booking-main--stacked">
          <div className="rounded-2xl border border-glass-border/60 bg-glass/50 backdrop-blur-xl shadow-glass overflow-hidden min-w-0 p-2 sm:p-3">
            <div ref={categoryGridRef} className="visit-category-grid">
              {categoryCards.map((card) => (
                <CategoryCard
                  key={card.id}
                  card={card}
                  variant="tab"
                  active={activeCategory === card.serviceType}
                  onSelect={pickCategory}
                />
              ))}
            </div>
          </div>

          {activeCategory && (
            <div
              className={`visit-booking-suggestions-below rounded-2xl border border-glass-border/60 bg-glass/50 backdrop-blur-xl shadow-glass overflow-hidden min-w-0${showNursePanel ? ' visit-booking-suggestions-below--with-nurses' : ''}`}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-glass-elevated/35 border-b border-glass-border/50">
                <div className="min-w-0">
                  <span className={sectionLabelClass}>Suggestions</span>
                  {hasSelectedSuggestions && (
                    <p className="text-[10px] text-muted mt-0.5">{selectedCareIds.length} selected</p>
                  )}
                </div>
                {hasSelectedSuggestions && onOpenCaregiverPicker && (
                  <button
                    type="button"
                    onClick={onOpenCaregiverPicker}
                    className="visit-suggestions-caregiver-cta lg:hidden shrink-0"
                  >
                    <UserRound className="w-3.5 h-3.5" aria-hidden />
                    <span className="truncate max-w-[7.5rem]">
                      {selectedCaregiver?.name ? 'Change caregiver' : 'Select caregiver'}
                    </span>
                  </button>
                )}
              </div>
              <div className="visit-panel-stage p-2 sm:p-3">
                <p className="visit-multi-select-hint">
                  You can select <strong>multiple services</strong> — tap each card to add or remove.
                </p>
                {catalogForBooking.length === 0 && (
                  <p className="text-xs text-muted text-center py-6 leading-relaxed">
                    No services for this care type yet. Your administrator can add them from the admin dashboard.
                  </p>
                )}
                {panelSuggestionItems.length > 0 && (
                  <div className="visit-suggestion-grid-wrap">
                    <SuggestionTabGrid
                      items={panelSuggestionItems}
                      selectedIds={selectedCareIds}
                      onToggle={handleSuggestionToggle}
                      layout="grid"
                      columns={showNursePanel ? 2 : 4}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showNursePanel && (
          <aside
            className="visit-booking-panel visit-booking-panel--nurses-rail hidden lg:flex flex-col min-h-0"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-glass-elevated/35 border-b border-glass-border/50 shrink-0">
              <span className={sectionLabelClass}>{bookingCopy.nearbyTitle}</span>
              <span className="text-[10px] text-muted shrink-0">Tap to add to cart</span>
            </div>
            {renderCaregiverList()}
          </aside>
        )}
      </div>

      <FloatingContinueToCartBar
        visible={hasSelectedSuggestions && Boolean(onFloatingContinueToCart)}
        count={selectedCareIds.length}
        onContinue={onFloatingContinueToCart}
      />
    </div>
  );
};

export default VisitBookingFlow;
