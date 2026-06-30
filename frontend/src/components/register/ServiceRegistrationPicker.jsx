import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { labelForRegisterServiceType, useAvailableCareTypes } from '../../lib/useAvailableCareTypes';

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

const fieldLabel = 'block text-xs font-medium text-muted mb-1';
const fieldInput = 'input !py-2 !text-sm';

/**
 * Register as care provider: pick a service type that has admin sub-services,
 * then select sub-services and rates.
 */
export default function ServiceRegistrationPicker({
  layout = 'stacked',
  caregiverCategory,
  onCaregiverCategoryChange,
  careOfferings,
  onCareOfferingsChange,
  showLicenseFields = true,
  specialization,
  onSpecializationChange,
  licenseNumber,
  onLicenseNumberChange,
  specializationPlaceholder,
  disabled,
}) {
  const isColumns = layout === 'columns';
  const { types: availableTypes, loading: typesLoading, error: typesError } = useAvailableCareTypes();
  const [catalog, setCatalog] = useState([]);

  const activeCategory = useMemo(() => {
    if (caregiverCategory && availableTypes.some((t) => t.serviceType === caregiverCategory)) {
      return caregiverCategory;
    }
    return availableTypes[0]?.serviceType || '';
  }, [caregiverCategory, availableTypes]);

  useEffect(() => {
    if (!availableTypes.length) return;
    if (!caregiverCategory || !availableTypes.some((t) => t.serviceType === caregiverCategory)) {
      onCaregiverCategoryChange?.(availableTypes[0].serviceType);
    }
  }, [availableTypes, caregiverCategory, onCaregiverCategoryChange]);

  useEffect(() => {
    let cancelled = false;
    if (!activeCategory) {
      setCatalog([]);
      return undefined;
    }
    (async () => {
      try {
        const { data } = await api.get('/care-services', { params: { serviceType: activeCategory } });
        if (!cancelled) setCatalog(data.options || []);
      } catch {
        if (!cancelled) setCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const onCategoryChange = (nextType) => {
    onCaregiverCategoryChange(nextType);
    onCareOfferingsChange([]);
  };

  const offeringMap = useMemo(() => {
    const m = new Map();
    (careOfferings || []).forEach((r) => m.set(r.careServiceOptionId, Number(r.rate) || 0));
    return m;
  }, [careOfferings]);

  const toggleCatalogOption = (optionId, catalogRate, checked) => {
    if (checked) {
      const existing = careOfferings.find((r) => r.careServiceOptionId === optionId);
      if (!existing) {
        onCareOfferingsChange([
          ...careOfferings,
          { careServiceOptionId: optionId, rate: catalogRate || 0 },
        ]);
      }
    } else {
      onCareOfferingsChange(careOfferings.filter((r) => r.careServiceOptionId !== optionId));
    }
  };

  const setOfferingRate = (optionId, rate) => {
    const next = Math.max(0, Math.round(Number(rate)) || 0);
    const arr = careOfferings.filter((r) => r.careServiceOptionId !== optionId);
    arr.push({ careServiceOptionId: optionId, rate: next });
    onCareOfferingsChange(arr);
  };

  const catalogGridClass = isColumns ? 'grid grid-cols-1 sm:grid-cols-2 gap-1.5' : 'space-y-2';

  const wrapperClass = isColumns
    ? 'h-full min-h-0 flex flex-col gap-3'
    : 'space-y-4 rounded-2xl border border-glass-border/50 bg-glass/30 p-4';

  const activeLabel = labelForRegisterServiceType(activeCategory);

  return (
    <div className={wrapperClass}>
      <h3 className="text-sm font-semibold text-foreground shrink-0">Service provider setup</h3>

      {typesError && (
        <p className="text-xs text-rose-400 shrink-0">{typesError}</p>
      )}

      {typesLoading ? (
        <p className="text-xs text-muted shrink-0">Loading available services…</p>
      ) : availableTypes.length === 0 ? (
        <p className="text-xs text-muted shrink-0">
          No services are open for registration yet. An admin must add sub-services in the admin
          catalog first.
        </p>
      ) : (
        <>
          <div className="shrink-0">
            <label className={fieldLabel}>Service</label>
            <select
              className={fieldInput}
              value={activeCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              disabled={disabled}
            >
              {availableTypes.map((t) => (
                <option key={t.serviceType} value={t.serviceType}>
                  {t.label || labelForRegisterServiceType(t.serviceType)}
                </option>
              ))}
            </select>
          </div>

          {showLicenseFields && onSpecializationChange && (
            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className={fieldLabel}>Specialization</label>
                <input
                  className={fieldInput}
                  placeholder={specializationPlaceholder}
                  value={specialization}
                  onChange={onSpecializationChange}
                  disabled={disabled}
                />
              </div>
              <div>
                <label className={fieldLabel}>License number</label>
                <input
                  className={fieldInput}
                  placeholder="RN-XXXX"
                  value={licenseNumber}
                  onChange={onLicenseNumberChange}
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          <div className={isColumns ? 'flex-1 min-h-0 flex flex-col gap-2' : ''}>
            <p className="text-xs font-medium text-muted shrink-0">
              Sub-services for {activeLabel}
              {catalog.length > 0 && (
                <span className="text-muted/80"> · tick each you offer and set your rate (INR)</span>
              )}
            </p>
            {catalog.length === 0 ? (
              <p className="text-xs text-muted">Loading sub-services…</p>
            ) : (
              <ul className={catalogGridClass}>
                {catalog.map((opt) => {
                  const checked = offeringMap.has(opt.id);
                  return (
                    <li
                      key={opt.id}
                      className={`rounded-lg border p-2 ${
                        checked ? 'border-brand-500/40 bg-brand-500/5' : 'border-glass-border/40'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1 rounded shrink-0"
                          checked={checked}
                          onChange={(e) => toggleCatalogOption(opt.id, opt.rate, e.target.checked)}
                          disabled={disabled}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground leading-tight">{opt.label}</span>
                          {opt.description && (
                            <span className="block text-[10px] text-muted leading-tight">{opt.description}</span>
                          )}
                          <span className="block text-[10px] text-muted mt-0.5">Suggested {fmtInr(opt.rate)}</span>
                        </div>
                        <div className="shrink-0 text-right">
                          <label className="block text-[10px] font-medium text-muted mb-0.5">Your rate</label>
                          <input
                            type="number"
                            min={0}
                            className="input !py-1 !text-xs w-24"
                            value={offeringMap.get(opt.id) ?? opt.rate ?? 0}
                            onChange={(e) => {
                              const val = Math.max(0, Math.round(Number(e.target.value)) || 0);
                              if (!checked) {
                                onCareOfferingsChange([
                                  ...careOfferings,
                                  { careServiceOptionId: opt.id, rate: val },
                                ]);
                              } else {
                                setOfferingRate(opt.id, val);
                              }
                            }}
                            disabled={disabled}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
