import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { api } from '../lib/api';
import { CAREGIVER_SERVICE_TYPES, caregiverServiceLabel } from '../lib/caregiverServices';

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

/**
 * Base visit fee + catalog sub-services with per-line rates.
 * `careOfferings`: [{ careServiceOptionId, rate }]
 *
 * Register: `serviceType` + `onServiceTypeChange` + `layout="register-panel"`.
 * Profile: `serviceType` only (locked) — sub-services for that tab only.
 */
const NurseServiceOfferingsForm = ({
  visitRate,
  onVisitRateChange,
  careOfferings,
  onCareOfferingsChange,
  disabled = false,
  serviceType,
  onServiceTypeChange,
  layout = 'default',
  showBaseFee = true,
}) => {
  const registerPanel = layout === 'register-panel';
  const profilePanel = layout === 'profile-panel';
  const activeType = serviceType || 'nurse_visit';
  const singleService = Boolean(onServiceTypeChange) || Boolean(serviceType);
  const serviceLocked = singleService && !onServiceTypeChange;

  const [catalog, setCatalog] = useState({});

  useEffect(() => {
    let cancelled = false;
    const types = singleService ? [activeType] : CAREGIVER_SERVICE_TYPES.map((t) => t.value);
    (async () => {
      const entries = await Promise.all(
        types.map(async (st) => {
          try {
            const { data } = await api.get('/care-services', { params: { serviceType: st } });
            return [st, data.options || []];
          } catch {
            return [st, []];
          }
        })
      );
      if (!cancelled) {
        setCatalog((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeType, singleService]);

  const offeringMap = useMemo(() => {
    const m = new Map();
    (careOfferings || []).forEach((row) => {
      m.set(row.careServiceOptionId, Number(row.rate) || 0);
    });
    return m;
  }, [careOfferings]);

  const setOfferingRate = (optionId, rate) => {
    const next = Math.max(0, Math.round(Number(rate)) || 0);
    const arr = careOfferings.filter((r) => r.careServiceOptionId !== optionId);
    arr.push({ careServiceOptionId: optionId, rate: next });
    onCareOfferingsChange(arr);
  };

  const removeOption = (optionId) => {
    onCareOfferingsChange(careOfferings.filter((r) => r.careServiceOptionId !== optionId));
  };

  const toggleOption = (optionId, catalogDefault, checked) => {
    if (checked) {
      const rate = offeringMap.has(optionId) ? offeringMap.get(optionId) : Number(catalogDefault) || 0;
      onCareOfferingsChange([
        ...careOfferings.filter((r) => r.careServiceOptionId !== optionId),
        { careServiceOptionId: optionId, rate },
      ]);
    } else {
      removeOption(optionId);
    }
  };

  const catalogById = useMemo(() => {
    const m = new Map();
    for (const opts of Object.values(catalog)) {
      for (const opt of opts || []) m.set(opt.id, opt);
    }
    return m;
  }, [catalog]);

  const optedItems = useMemo(
    () =>
      careOfferings.map((row) => {
        const cat = catalogById.get(row.careServiceOptionId);
        return {
          ...row,
          label: cat?.label ?? 'Sub-service',
          catalogRate: cat?.rate,
        };
      }),
    [careOfferings, catalogById]
  );

  const sections = singleService
    ? [{ serviceType: activeType, title: caregiverServiceLabel(activeType), hint: '' }]
    : CAREGIVER_SERVICE_TYPES.map((t) => ({
        serviceType: t.value,
        title: t.label,
        hint: t.hint,
      }));

  const shellClass = registerPanel
    ? 'flex flex-col h-full min-h-0 gap-3'
    : profilePanel
      ? 'space-y-5 glass-panel p-5 sm:p-6'
      : 'sm:col-span-2 space-y-4 glass-panel p-4';

  const listClass = registerPanel
    ? 'flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-x-4 gap-y-1.5 content-start auto-rows-min overflow-hidden'
    : profilePanel
      ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[min(22rem,50vh)] overflow-y-auto pr-1'
      : 'space-y-2 max-h-[min(28rem,55vh)] overflow-y-auto pr-1';

  return (
    <div className={shellClass}>
      <div className={registerPanel ? 'shrink-0' : ''}>
        <h3 className={`font-semibold text-foreground ${registerPanel ? 'text-base' : 'text-sm'}`}>
          Services &amp; sub-services
        </h3>
        <p className="text-xs text-muted mt-0.5">
          {onServiceTypeChange
            ? 'Choose your role, then tick sub-services you offer and set your rate for each.'
            : serviceLocked
              ? `Check or uncheck sub-services for your ${caregiverServiceLabel(activeType).toLowerCase()} profile. Selected items stay highlighted.`
              : 'Pick catalog lines and set your INR rate.'}
        </p>
      </div>

      {singleService && onServiceTypeChange && (
        <div className={registerPanel ? 'shrink-0' : ''}>
          <label className="block text-xs font-medium text-muted mb-1">Registering as</label>
          <select
            className="input !py-2 !text-sm w-full"
            disabled={disabled}
            value={activeType}
            onChange={(e) => onServiceTypeChange(e.target.value)}
          >
            {CAREGIVER_SERVICE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label} — {t.hint}
              </option>
            ))}
          </select>
        </div>
      )}
      {serviceLocked && (
        <div className={`${registerPanel ? 'shrink-0' : ''} inline-flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-sm text-foreground`}>
          <span className="text-xs font-medium text-brand-400 uppercase tracking-wide">Your service</span>
          <span className="font-semibold">{caregiverServiceLabel(activeType)}</span>
        </div>
      )}

      {showBaseFee && onVisitRateChange && (
        <div className={registerPanel ? 'shrink-0' : ''}>
          <label className="block text-xs font-medium text-muted mb-1">
            Base {caregiverServiceLabel(activeType).toLowerCase()} fee (INR)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            className="input !py-2 !text-sm max-w-[9rem] tabular-nums"
            disabled={disabled}
            value={visitRate}
            onChange={(e) => onVisitRateChange(e.target.value)}
          />
        </div>
      )}

      {optedItems.length > 0 && (
        <div
          className={`rounded-xl border border-brand-500/30 bg-glass/40 p-3 ${
            registerPanel ? 'shrink-0' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-800">
              Your opted sub-services
            </span>
            <span className="text-[10px] font-medium text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
              {optedItems.length} active
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {optedItems.map((item) => (
              <div
                key={item.careServiceOptionId}
                className="inline-flex items-center gap-1.5 max-w-full rounded-lg border border-glass-border/60 bg-glass/50 pl-2.5 pr-1 py-1.5"
              >
                <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" strokeWidth={2.5} aria-hidden />
                <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
                <span className="text-xs font-semibold text-brand-700 tabular-nums shrink-0">
                  {fmtInr(item.rate)}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeOption(item.careServiceOptionId)}
                  className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted/70 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                  aria-label={`Remove ${item.label}`}
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted mt-2">Tap × to remove anytime, or uncheck in the list below.</p>
        </div>
      )}

      <div className={registerPanel ? 'flex-1 min-h-0 flex flex-col' : ''}>
        {sections.map(({ serviceType: st, title, hint }) => {
          const opts = catalog[st] || [];
          const blockClass = registerPanel
            ? 'flex-1 min-h-0 flex flex-col rounded-lg border border-glass-border/60 bg-glass/35 p-3'
            : profilePanel
              ? 'rounded-xl border border-glass-border/60 bg-glass/35 p-4 shadow-sm'
              : 'rounded-lg border border-glass-border/60 bg-glass/35 p-3';

          return (
            <div key={st} className={blockClass}>
              {!singleService && (
                <div className="flex items-baseline justify-between gap-2 shrink-0">
                  <div className="font-medium text-foreground text-sm">{title}</div>
                  {hint ? <span className="text-[10px] text-muted">{hint}</span> : null}
                </div>
              )}
              {singleService && (
                <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 shrink-0">
                  Sub-services for {title}
                </div>
              )}
              {opts.length === 0 ? (
                <p className="text-xs text-muted">
                  No sub-services in the catalog yet — ask your admin to add them for this tab.
                </p>
              ) : (
                <ul className={listClass}>
                  {[...opts]
                    .sort((a, b) => {
                      const ao = offeringMap.has(a.id) ? 0 : 1;
                      const bo = offeringMap.has(b.id) ? 0 : 1;
                      return ao - bo;
                    })
                    .map((opt) => {
                      const on = offeringMap.has(opt.id);
                      return (
                        <li
                          key={opt.id}
                          className={`flex flex-wrap items-center gap-2 text-sm rounded-lg transition-colors ${
                            on
                              ? 'border border-brand-500/50 bg-brand-500/15 px-2 py-2 shadow-sm ring-1 ring-brand-500/25'
                              : 'border border-transparent px-2 py-1.5 hover:bg-glass-elevated/40'
                          } ${registerPanel ? '' : 'flex-wrap'}`}
                        >
                          <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded border-glass-border/70 text-brand-400 shrink-0"
                              disabled={disabled}
                              checked={on}
                              onChange={(e) => toggleOption(opt.id, opt.rate, e.target.checked)}
                            />
                            <span
                              className={`text-xs sm:text-sm leading-tight ${
                                on ? 'font-semibold text-brand-900' : 'text-foreground/90'
                              }`}
                            >
                              {opt.label}
                            </span>
                            {on && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded">
                                Opted in
                              </span>
                            )}
                          </label>
                          {on ? (
                            <>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-muted">Your ₹</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  className="input !py-1 !text-xs w-[4.5rem] tabular-nums border-brand-200"
                                  disabled={disabled}
                                  value={offeringMap.get(opt.id) ?? 0}
                                  onChange={(e) => setOfferingRate(opt.id, e.target.value)}
                                />
                              </div>
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => removeOption(opt.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline shrink-0"
                              >
                                <X className="w-3 h-3" strokeWidth={2} aria-hidden />
                                Remove
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted/70 shrink-0">
                              List {fmtInr(opt.rate)}
                            </span>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className={`text-xs text-muted ${registerPanel ? 'shrink-0' : ''}`}>
        Selected: <strong>{careOfferings.length}</strong> sub-service(s)
        {singleService ? ` for ${caregiverServiceLabel(activeType)}` : ''}. At least one is required.
      </p>
    </div>
  );
};

export default NurseServiceOfferingsForm;
