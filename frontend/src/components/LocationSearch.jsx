import { useEffect, useRef, useState } from 'react';
import { Building2, Loader2, MapPin, Search, X } from 'lucide-react';
import { searchPlaces } from '../lib/geocode';
import { cn } from '../lib/utils';

/**
 * Exact delivery location: choose a structured search result (full street / area / building).
 */
const LocationSearch = ({
  pin,
  setPin,
  address,
  setAddress,
  locationConfirmed,
  setLocationConfirmed,
  loadNurses,
  idPrefix = 'loc',
  onPlaceSelected,
  variant = 'default',
}) => {
  const prominent = variant === 'prominent';
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const q = searchInput.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await searchPlaces(q);
        setSuggestions(rows);
        setOpen(rows.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const chooseSuggestion = (s) => {
    setPin([s.lng, s.lat]);
    setAddress(s.label);
    setLocationConfirmed(true);
    setSearchInput('');
    setSuggestions([]);
    setOpen(false);
    setFocused(false);
    loadNurses([s.lng, s.lat]);
    onPlaceSelected?.(s);
  };

  const clearLocation = () => {
    setAddress('');
    setLocationConfirmed(false);
    setSearchInput('');
    setSuggestions([]);
    setOpen(false);
  };

  const showDropdown = open && (suggestions.length > 0 || (loading && searchInput.trim().length >= 2));

  return (
    <div ref={wrapRef} className={cn('space-y-3', prominent && 'location-search--prominent')}>
      {!prominent && (
        <label
          htmlFor={`${idPrefix}-search`}
          className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
        >
          Search address
        </label>
      )}

      {prominent && (
        <p className="text-sm font-semibold text-foreground">Where is this address?</p>
      )}

      <div className="relative">
        <div
          className={cn(
            'relative flex items-center transition-shadow duration-200',
            prominent
              ? cn(
                  'rounded-2xl border-2 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.35)]',
                  focused || showDropdown
                    ? 'border-slate-900 shadow-[0_12px_40px_-14px_rgba(15,23,42,0.45)]'
                    : 'border-slate-200'
                )
              : 'rounded-xl border border-slate-200/90 bg-white shadow-sm'
          )}
        >
          <span
            className={cn(
              'pointer-events-none flex shrink-0 items-center justify-center text-slate-500',
              prominent ? 'pl-4 pr-2' : 'pl-3 pr-2'
            )}
          >
            <Search className={cn(prominent ? 'w-5 h-5' : 'w-4 h-4')} aria-hidden />
          </span>
          <input
            id={`${idPrefix}-search`}
            type="text"
            autoComplete="off"
            className={cn(
              'min-w-0 flex-1 border-0 bg-transparent outline-none ring-0 focus:ring-0',
              prominent
                ? 'py-4 pr-12 text-base font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400'
                : 'py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400'
            )}
            placeholder={
              prominent
                ? 'Search building, apartment, street, area, or PIN code'
                : 'Street, neighbourhood, landmark, or PIN code'
            }
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (locationConfirmed) {
                setLocationConfirmed(false);
                setAddress('');
              }
            }}
            onFocus={() => {
              setFocused(true);
              if (suggestions.length > 0) setOpen(true);
            }}
            onBlur={() => setFocused(false)}
          />
          {searchInput && !loading && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSuggestions([]);
                setOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Loader2 className={cn('animate-spin', prominent ? 'w-5 h-5' : 'w-4 h-4')} aria-hidden />
            </span>
          )}
        </div>

        {showDropdown && (
          <ul
            className={cn(
              'absolute z-30 w-full overflow-auto bg-white text-sm',
              prominent
                ? 'mt-2 max-h-72 rounded-2xl border-2 border-slate-900 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.45)]'
                : 'mt-1.5 max-h-56 rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50'
            )}
          >
            {loading && suggestions.length === 0 && (
              <li className="px-4 py-4 text-sm text-slate-500">Searching locations…</li>
            )}
            {suggestions.map((s) => {
              const isBuilding = Boolean(s.buildingName);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-3 text-left transition-colors',
                      prominent ? 'px-4 py-3.5 hover:bg-slate-50' : 'px-4 py-2.5 hover:bg-brand-50/90',
                      'border-b border-slate-100 last:border-0'
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => chooseSuggestion(s)}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex shrink-0 items-center justify-center rounded-full',
                        prominent ? 'h-9 w-9 bg-slate-900 text-white' : 'h-8 w-8 bg-brand-100 text-brand-700'
                      )}
                    >
                      {isBuilding ? (
                        <Building2 className="w-4 h-4" aria-hidden />
                      ) : (
                        <MapPin className="w-4 h-4" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900 leading-snug">{s.title || s.label}</span>
                      {s.subtitle ? (
                        <span className="mt-0.5 block text-xs text-slate-500 leading-snug">{s.subtitle}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {prominent && !locationConfirmed && (
        <p className="text-xs text-muted leading-relaxed">
          Tip: type your society or apartment name first — e.g. &quot;Prestige Shantiniketan&quot; or &quot;Brigade Gateway&quot;.
        </p>
      )}

      {locationConfirmed && address && (
        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm shadow-sm',
            prominent
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-white'
          )}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800/80">Confirmed</div>
          <div className="text-emerald-950 leading-snug mt-1 font-medium">{address}</div>
          <div className="text-[11px] text-emerald-800/60 mt-1.5 font-mono tabular-nums">
            {pin[1].toFixed(5)}, {pin[0].toFixed(5)}
          </div>
          <button
            type="button"
            onClick={clearLocation}
            className="text-xs text-brand-700 font-semibold mt-3 hover:text-brand-800 hover:underline"
          >
            Change address
          </button>
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
