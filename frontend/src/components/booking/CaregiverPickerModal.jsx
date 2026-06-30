import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Navigation, Star, X } from 'lucide-react';
import {
  caregiverKindBadge,
  caregiversForCartItems,
  caregiversForService,
  initialsFromName,
} from '../../lib/caregiverServices';

export default function CaregiverPickerModal({
  open,
  onClose,
  nurses = [],
  loading = false,
  serviceType,
  cartItems = null,
  selectedId,
  onSelect,
  emptyMessage = 'No caregivers available near your location.',
  closeOnSelect = true,
  footerLabel = null,
  onFooterAction = null,
  footerDisabled = false,
}) {
  const list = useMemo(() => {
    if (Array.isArray(cartItems) && cartItems.length > 0) {
      return caregiversForCartItems(nurses, cartItems);
    }
    return caregiversForService(nurses, serviceType);
  }, [nurses, serviceType, cartItems]);

  if (!open) return null;

  const handlePick = (n) => {
    onSelect?.(n);
    if (closeOnSelect) onClose?.();
  };

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-glass-border/60 bg-white shadow-2xl max-h-[min(88vh,640px)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="caregiver-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-glass-border/50 shrink-0">
          <h3 id="caregiver-picker-title" className="text-base font-semibold text-foreground">
            Choose a caregiver
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-glass-border/60 text-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {loading && (
            <p className="text-sm text-muted text-center py-8">Loading nearby caregivers…</p>
          )}
          {!loading && list.length === 0 && (
            <p className="text-sm text-muted text-center py-8 leading-relaxed">{emptyMessage}</p>
          )}
          {!loading &&
            list.map((n) => {
              const kb = caregiverKindBadge(n._kind);
              const selected = selectedId === n._id;
              return (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => handlePick(n)}
                  className={`group flex w-full flex-col gap-2 rounded-xl border p-3 text-left transition-all duration-200 ${
                    selected
                      ? 'border-brand-500/50 bg-brand-500/15 shadow-md ring-2 ring-brand-500/25'
                      : 'border-glass-border/60 bg-glass/40 hover:border-brand-500/30 hover:bg-glass-elevated/50'
                  }`}
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
            })}
        </div>

        {footerLabel && onFooterAction && (
          <div className="shrink-0 border-t border-glass-border/50 p-3 bg-glass-elevated/30">
            <button
              type="button"
              disabled={footerDisabled}
              onClick={onFooterAction}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:from-brand-700 hover:to-brand-800 disabled:pointer-events-none disabled:opacity-45"
            >
              <CreditCard className="w-4 h-4" strokeWidth={2} aria-hidden />
              {footerLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
