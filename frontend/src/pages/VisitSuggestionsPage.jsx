import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import SuggestionTabGrid from '../components/booking/SuggestionTabGrid.jsx';
import FloatingContinueToCartBar from '../components/booking/FloatingContinueToCartBar.jsx';
import FallAlertBanner from '../healthcare/FallAlertBanner.jsx';
import { api } from '../lib/api';
import { CAREGIVER_SERVICE_TYPES, caregiverServiceLabel, visitFocusMatchesSearch } from '../lib/caregiverServices';
import { useAuth } from '../context/AuthContext.jsx';

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n) || 0
  );

export default function VisitSuggestionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const serviceType = searchParams.get('serviceType') || 'nurse_visit';
  const initialSelected = location.state?.selectedCareIds;

  const [careOptions, setCareOptions] = useState([]);
  const [allCareCatalog, setAllCareCatalog] = useState([]);
  const [reasonQuery, setReasonQuery] = useState('');
  const [selectedCareIds, setSelectedCareIds] = useState(
    () => (Array.isArray(initialSelected) ? initialSelected : [])
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/care-services', { params: { serviceType } });
        if (!cancelled) setCareOptions(data.options || []);
      } catch {
        if (!cancelled) setCareOptions([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceType]);

  useEffect(() => {
    const q = reasonQuery.trim();
    if (!q) {
      setAllCareCatalog([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          CAREGIVER_SERVICE_TYPES.map(({ value: st }) =>
            api
              .get('/care-services', { params: { serviceType: st } })
              .then((res) => ({ st, options: res.data.options || [] }))
          )
        );
        if (!cancelled) {
          setAllCareCatalog(
            results.flatMap(({ st, options }) => options.map((o) => ({ ...o, serviceType: st })))
          );
        }
      } catch {
        if (!cancelled) setAllCareCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reasonQuery]);

  const catalog = useMemo(() => {
    const q = reasonQuery.trim();
    if (!q) return careOptions;
    const pool = allCareCatalog.length > 0 ? allCareCatalog : careOptions;
    return pool;
  }, [reasonQuery, careOptions, allCareCatalog]);

  const filtered = useMemo(
    () => catalog.filter((o) => visitFocusMatchesSearch(o, reasonQuery)),
    [catalog, reasonQuery]
  );

  const toggleCareId = useCallback((id) => {
    setSelectedCareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const tabItems = useMemo(
    () =>
      filtered.map((opt) => ({
        id: opt.id,
        label: opt.label,
        imageUrl: opt.imageUrl || '',
        priceLabel: fmtInr(Number(opt.rate) || 0),
        description: opt.description?.trim() || '',
      })),
    [filtered]
  );

  const continueBooking = () => {
    navigate('/dashboard', {
      state: { selectedCareIds, mainPanel: 'book', serviceType },
      replace: false,
    });
  };

  if (!user) return null;

  return (
    <div className="visit-suggestions-shell mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard"
          state={{ mainPanel: 'book' }}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to booking
        </Link>
        <FallAlertBanner user={user} inline />
      </div>

      <div className="card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-glass-border/50 pb-3">
          <div className="flex items-start gap-2 min-w-0 shrink-0 sm:max-w-[14rem]">
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground sm:text-lg leading-tight">All suggestions</h1>
              <p className="mt-0.5 text-[11px] sm:text-xs text-muted leading-snug">
                {caregiverServiceLabel(serviceType)} — tap to select.
              </p>
            </div>
          </div>

          <input
            type="search"
            className="input !py-2 text-sm min-w-0 flex-1 basis-[10rem] sm:max-w-xs"
            placeholder="Filter suggestions…"
            value={reasonQuery}
            onChange={(e) => setReasonQuery(e.target.value)}
            autoComplete="off"
            aria-label="Filter suggestions"
          />

          <button
            type="button"
            className="btn-primary !py-2 !px-3.5 text-sm shrink-0 ml-auto sm:ml-0"
            onClick={continueBooking}
          >
            Continue ({selectedCareIds.length})
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted py-4">Loading suggestions…</p>
        ) : tabItems.length === 0 ? (
          <p className="text-sm text-muted py-4">
            No suggestions found. Your administrator can add them from Admin → Visit options.
          </p>
        ) : (
          <SuggestionTabGrid items={tabItems} selectedIds={selectedCareIds} onToggle={toggleCareId} />
        )}
      </div>

      <FloatingContinueToCartBar
        visible={selectedCareIds.length > 0}
        count={selectedCareIds.length}
        onContinue={continueBooking}
        label="Continue"
      />
    </div>
  );
}
