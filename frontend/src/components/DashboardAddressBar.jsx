import { useEffect, useRef } from 'react';
import { Check, ChevronDown, MapPin, Plus } from 'lucide-react';

const DashboardAddressBar = ({
  userName,
  displayAddress,
  savedAddresses = [],
  selectedLabel = '',
  onSelectAddress,
  onAddClick,
  pickerOpen,
  onPickerOpenChange,
  compact = false,
  narrow = false,
}) => {
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        onPickerOpenChange(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onPickerOpenChange]);

  return (
    <div ref={wrapRef} className="relative min-w-0 w-full h-full">
      <div
        className={`flex h-full items-stretch rounded-xl border border-glass-border/70 bg-white shadow-sm overflow-hidden ${
          compact || narrow ? 'min-h-[34px]' : 'min-h-[40px]'
        }`}
      >
        <button
          type="button"
          onClick={() => onPickerOpenChange(!pickerOpen)}
          className={`group/addr flex min-w-0 flex-1 items-center gap-1.5 text-left hover:bg-slate-50/80 transition-colors ${
            compact || narrow ? 'px-1.5 py-1' : 'px-3 py-1.5'
          }`}
          aria-expanded={pickerOpen}
          aria-haspopup="listbox"
          title={displayAddress}
        >
          <span
            className={`flex shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white ${
              compact || narrow ? 'h-6 w-6' : 'h-7 w-7'
            }`}
          >
            <MapPin className={compact || narrow ? 'w-3.5 h-3.5' : 'w-4 h-4'} aria-hidden />
          </span>
          <span className="min-w-0 flex-1 relative">
            {!compact && !narrow && (
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted leading-none">
                Deliver to{userName ? ` · ${userName.split(' ')[0]}` : ''}
              </span>
            )}
            <span
              className={`block truncate font-medium text-foreground ${
                compact || narrow ? 'text-[11px] leading-tight' : 'mt-0.5 text-sm'
              }`}
            >
              {displayAddress}
            </span>
            {narrow && displayAddress && (
              <span
                role="tooltip"
                className="dashboard-address-tooltip pointer-events-none absolute left-0 top-[calc(100%+6px)] z-50 hidden max-w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-glass-border/70 bg-white px-2.5 py-2 text-xs font-normal leading-snug text-foreground shadow-lg group-hover/addr:block"
              >
                {displayAddress}
              </span>
            )}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 text-muted transition-transform ${pickerOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        <button
          type="button"
          onClick={onAddClick}
          className={`flex shrink-0 items-center justify-center border-l border-glass-border/60 text-brand-700 hover:bg-brand-50 transition-colors ${
            compact || narrow ? 'px-1.5' : 'px-3 sm:px-4 touch-target'
          }`}
          aria-label="Add address"
          title="Add address"
        >
          <Plus className={compact ? 'w-4 h-4' : 'w-5 h-5'} strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      {pickerOpen && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1.5 w-full max-h-64 overflow-auto rounded-xl border border-glass-border/70 bg-white shadow-xl py-1"
        >
          {savedAddresses.length > 0 ? (
            savedAddresses.map((item) => {
              const selected = selectedLabel && selectedLabel === item.label;
              return (
                <li key={`${item.id}-${item.label}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelectAddress(item);
                      onPickerOpenChange(false);
                    }}
                    className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                      selected ? 'bg-brand-50 text-foreground' : 'hover:bg-slate-50 text-foreground/90'
                    }`}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                    <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
                    {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> : null}
                  </button>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-3 text-xs text-muted">No saved addresses. Tap + to add one.</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default DashboardAddressBar;
