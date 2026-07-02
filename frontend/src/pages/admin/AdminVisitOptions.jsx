import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminServiceImageField from '../../components/admin/AdminServiceImageField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api';
import { mergeServiceCategoryCards } from '../../lib/serviceCategoryCards.js';

const TAB_FILTERS = [
  { value: 'all', label: 'All tabs' },
  { value: 'nurse_visit', label: 'Nurse visit' },
  { value: 'doctor_consult', label: 'Doctor' },
  { value: 'physiotherapy', label: 'Physio' },
  { value: 'emergency', label: 'Emergency' },
];

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

const MAX_IMAGE_BYTES = 450_000;

const AdminVisitOptions = () => {
  const { user, sessionReady } = useAuth();
  const [careOpts, setCareOpts] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [categoryCards, setCategoryCards] = useState(() => mergeServiceCategoryCards());
  const [listTabFilter, setListTabFilter] = useState('nurse_visit');
  const [newCareLabel, setNewCareLabel] = useState('');
  const [newCareDesc, setNewCareDesc] = useState('');
  const [newCareImageUrl, setNewCareImageUrl] = useState('');
  const [newCareServiceType, setNewCareServiceType] = useState('nurse_visit');
  const [newCareRate, setNewCareRate] = useState('499');

  const readImageDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read image file'));
      reader.readAsDataURL(file);
    });

  const loadCareOpts = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const { data } = await api.get('/care-services/admin/all', {
        params: listTabFilter === 'all' ? {} : { serviceType: listTabFilter },
      });
      setCareOpts(data.options || []);
    } catch (err) {
      setCareOpts([]);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not load visit options. Sign out, then sign in again from Admin login.';
      setListError(msg);
      toast.error(msg);
    } finally {
      setListLoading(false);
    }
  }, [listTabFilter]);

  useEffect(() => {
    if (!sessionReady) return;
    if (user?.role !== 'admin') {
      setListLoading(false);
      setCareOpts([]);
      setListError('Admin access required. Sign out, then sign in from Admin login.');
      return;
    }
    loadCareOpts();
  }, [sessionReady, user?.role, loadCareOpts]);

  const loadCategoryCards = useCallback(async () => {
    try {
      const { data } = await api.get('/booking-categories/admin/all');
      setCategoryCards(mergeServiceCategoryCards(data.categories));
    } catch {
      toast.error('Could not load care type images');
    }
  }, []);

  useEffect(() => {
    loadCategoryCards();
  }, [loadCategoryCards]);

  const updateCategoryImage = async (serviceType, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be under 450 KB');
      return;
    }
    try {
      const imageUrl = await readImageDataUrl(file);
      const { data } = await api.patch(`/booking-categories/admin/${serviceType}`, { imageUrl });
      setCategoryCards((prev) =>
        prev.map((row) => (row.serviceType === serviceType ? { ...row, imageSrc: data.category.imageUrl || '' } : row))
      );
      toast.success('Care type image saved');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not upload image');
    }
  };

  const removeCategoryImage = async (serviceType) => {
    try {
      await api.patch(`/booking-categories/admin/${serviceType}`, { imageUrl: null });
      setCategoryCards((prev) =>
        prev.map((row) => (row.serviceType === serviceType ? { ...row, imageSrc: '' } : row))
      );
      toast.success('Image removed');
    } catch {
      toast.error('Could not remove image');
    }
  };

  const addCareOpt = async (e) => {
    e.preventDefault();
    if (!sessionReady || user?.role !== 'admin') {
      toast.error('Admin session required. Sign in from Admin login.');
      return;
    }
    const t = newCareLabel.trim();
    if (!t) {
      toast.error('Enter a service label');
      return;
    }
    const rate = Math.max(0, Math.round(Number(newCareRate)) || 0);
    try {
      await api.post('/care-services', {
        label: t,
        description: newCareDesc.trim() || undefined,
        imageUrl: newCareImageUrl || undefined,
        serviceType: newCareServiceType,
        rate,
      });
      setNewCareLabel('');
      setNewCareDesc('');
      setNewCareImageUrl('');
      setNewCareRate('499');
      setListTabFilter(newCareServiceType);
      toast.success('Service added');
      loadCareOpts();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not add');
    }
  };

  const updateCareImage = async (option, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be under 450 KB');
      return;
    }
    try {
      const imageUrl = await readImageDataUrl(file);
      await api.patch(`/care-services/${option.id}`, { imageUrl });
      toast.success('Image updated');
      loadCareOpts();
    } catch {
      toast.error('Could not upload image');
    }
  };

  const toggleCareActive = async (o) => {
    try {
      await api.patch(`/care-services/${o.id}`, { active: !o.active });
      loadCareOpts();
    } catch {
      toast.error('Could not update');
    }
  };

  const saveRate = async (id, currentRate, raw) => {
    const next = Math.max(0, Math.round(Number(raw)) || 0);
    if (next === (Number(currentRate) || 0)) return;
    try {
      await api.patch(`/care-services/${id}`, { rate: next });
      toast.success('Rate updated');
      loadCareOpts();
    } catch {
      toast.error('Could not save rate');
    }
  };

  const deleteCareOpt = async (id) => {
    try {
      await api.delete(`/care-services/${id}`);
      toast.success('Removed');
      loadCareOpts();
    } catch {
      toast.error('Could not remove');
    }
  };

  return (
    <>
      <div className="card mb-4 space-y-3">
        <div>
          <h2 className="font-semibold text-base text-foreground">Care type card images</h2>
          <p className="text-xs text-muted mt-0.5">
            Photos shown on the patient dashboard for Nurse visit, Doctor, Physio, and Emergency. Use images under
            450 KB.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {categoryCards.map((card) => (
            <div
              key={card.serviceType}
              className="rounded-xl border border-glass-border/60 bg-glass/30 p-3 flex flex-col gap-2"
            >
              <div className="font-semibold text-sm text-foreground">{card.label}</div>
              <AdminServiceImageField
                compact
                imageUrl={card.imageSrc || ''}
                onUpload={(file) => updateCategoryImage(card.serviceType, file)}
                onRemove={() => removeCategoryImage(card.serviceType)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 mb-3">
        <div className="flex items-center gap-2 mr-auto">
          <label className="text-xs font-medium text-muted whitespace-nowrap">Show for tab</label>
          <select
            className="input !py-2 !text-sm min-w-[10.5rem]"
            value={listTabFilter}
            onChange={(e) => {
              const v = e.target.value;
              setListTabFilter(v);
              if (v !== 'all') setNewCareServiceType(v);
            }}
          >
            {TAB_FILTERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => loadCareOpts()} className="btn-outline">
          ↻ Refresh list
        </button>
      </div>

      <div className="card space-y-4">
        <p className="text-xs text-muted leading-relaxed">
          These are the visit-focus add-ons patients pick when booking (e.g. wound dressing, IV fluids).
          If patients already see options you did not create, they came from the initial database seed — you
          can edit rates, deactivate, or remove them here once the list loads.
        </p>
        {listError ? (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
            {listError}{' '}
            <button type="button" className="font-semibold underline" onClick={() => loadCareOpts()}>
              Retry
            </button>
          </div>
        ) : null}
        <form
          onSubmit={addCareOpt}
          className="flex flex-row flex-nowrap items-end gap-2 sm:gap-3 -mx-1 px-1 overflow-x-auto pb-0.5"
        >
          <div className="shrink-0 w-[8rem]">
            <label className="block text-xs font-medium text-muted mb-1">Image</label>
            <label className="input !py-2 !text-sm w-full cursor-pointer text-center text-brand-700">
              {newCareImageUrl ? 'Change image' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith('image/')) {
                    toast.error('Please select an image file');
                    return;
                  }
                  if (file.size > MAX_IMAGE_BYTES) {
                    toast.error('Image must be under 450 KB');
                    return;
                  }
                  try {
                    setNewCareImageUrl(await readImageDataUrl(file));
                  } catch {
                    toast.error('Could not read image');
                  }
                }}
              />
            </label>
          </div>
          <div className="shrink-0 w-[9.25rem] sm:w-[10.5rem]">
            <label className="block text-xs font-medium text-muted mb-1">Booking tab</label>
            <select
              className="input !py-2 !text-sm w-full"
              value={newCareServiceType}
              onChange={(e) => {
                const v = e.target.value;
                setNewCareServiceType(v);
                setListTabFilter(v);
              }}
            >
              <option value="nurse_visit">Nurse visit</option>
              <option value="doctor_consult">Doctor</option>
              <option value="physiotherapy">Physio</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div className="shrink-0 w-[5.5rem] sm:w-24">
            <label className="block text-xs font-medium text-muted mb-1">Rate (INR)</label>
            <input
              type="number"
              min={0}
              step={1}
              className="input !py-2 !text-sm w-full tabular-nums"
              value={newCareRate}
              onChange={(e) => setNewCareRate(e.target.value)}
            />
          </div>
          <div className="min-w-[10rem] flex-1">
            <label className="block text-xs font-medium text-muted mb-1">Service label</label>
            <input
              className="input !py-2 !text-sm w-full min-w-0"
              value={newCareLabel}
              onChange={(e) => setNewCareLabel(e.target.value)}
              placeholder="e.g. Wound dressing at home"
            />
          </div>
          <div className="min-w-[11rem] flex-[1.15]">
            <label className="block text-xs font-medium text-muted mb-1">Short description (optional)</label>
            <input
              className="input !py-2 !text-sm w-full min-w-0"
              value={newCareDesc}
              onChange={(e) => setNewCareDesc(e.target.value)}
              placeholder="Shown as subtitle in suggestions"
            />
          </div>
          <button type="submit" className="btn-primary shrink-0 whitespace-nowrap !py-2">
            Add service
          </button>
        </form>
        {newCareImageUrl && (
          <div className="mt-2 flex items-center gap-2">
            <img src={newCareImageUrl} alt="New service preview" className="h-14 w-14 rounded-lg object-cover border border-glass-border/70" />
            <button type="button" className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => setNewCareImageUrl('')}>
              Remove image
            </button>
          </div>
        )}
        <div className="border-t border-glass-border/60 pt-2 space-y-0 divide-y divide-glass-border/60">
          {(!sessionReady || listLoading) && (
            <p className="text-sm text-muted py-4 text-center">
              {!sessionReady ? 'Verifying admin session…' : 'Loading visit options…'}
            </p>
          )}
          {sessionReady && !listLoading && !listError && careOpts.length === 0 && (
            <p className="text-sm text-muted py-4">
              No options for this tab yet — change the booking tab above, use &quot;Show for tab&quot;, or add one above.
            </p>
          )}
          {careOpts.map((o) => (
            <div key={o.id} className="py-3 flex flex-wrap items-center gap-3 justify-between gap-y-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {o.imageUrl ? (
                    <img
                      src={o.imageUrl}
                      alt={o.label}
                      className="h-10 w-10 rounded-lg object-cover border border-glass-border/70"
                    />
                  ) : (
                    <span className="h-10 w-10 rounded-lg bg-glass/40 border border-glass-border/60 grid place-items-center text-[10px] text-muted">
                      No img
                    </span>
                  )}
                  <div className={`font-medium ${o.active ? 'text-foreground' : 'text-muted/70 line-through'}`}>
                    {o.label}
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-glass-elevated/70 text-muted">
                    {(o.serviceType || 'nurse_visit').replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-semibold text-brand-700 dark:text-brand-300 tabular-nums">{fmtInr(o.rate ?? 0)}</span>
                </div>
                {o.description && <div className="text-xs text-muted mt-0.5">{o.description}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <label className="btn-outline !py-1.5 !px-3 text-xs cursor-pointer">
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => updateCareImage(o, e.target.files?.[0])}
                    />
                  </label>
                  {o.imageUrl && (
                    <button
                      type="button"
                      className="btn-outline !py-1.5 !px-3 text-xs"
                      onClick={async () => {
                        try {
                          await api.patch(`/care-services/${o.id}`, { imageUrl: null });
                          toast.success('Image removed');
                          loadCareOpts();
                        } catch {
                          toast.error('Could not remove image');
                        }
                      }}
                    >
                      Remove image
                    </button>
                  )}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted whitespace-nowrap" htmlFor={`rate-${o.id}`}>
                    Edit ₹
                  </label>
                  <input
                    id={`rate-${o.id}`}
                    type="number"
                    min={0}
                    step={1}
                    className="input !py-1.5 !text-sm w-24"
                    defaultValue={o.rate ?? 0}
                    key={`${o.id}-${o.rate}`}
                    onBlur={(e) => saveRate(o.id, o.rate, e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                    checked={o.active}
                    onChange={() => toggleCareActive(o)}
                  />
                  Active
                </label>
                <button
                  type="button"
                  className="text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200 text-sm font-medium hover:underline"
                  onClick={() => deleteCareOpt(o.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AdminVisitOptions;
