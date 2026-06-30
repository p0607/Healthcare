import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { ArrowLeft, CalendarClock, CreditCard, Plus, ShoppingCart, Trash2 } from 'lucide-react';

import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext.jsx';

import { useBookingCart } from '../context/BookingCartContext.jsx';

import { api } from '../lib/api';

import {
  autoAssignCaregiversForGroups,
  caregiverServiceLabel,
  groupCartItemsByServiceType,
} from '../lib/caregiverServices';
import {
  autoAssignToastMessage,
  caregiverRecordId,
  resolveCheckoutAddress,
  resolveCheckoutPin,
  resolvePrimaryCaregiver,
} from '../lib/checkout';

import CaregiverPickerModal from '../components/booking/CaregiverPickerModal.jsx';



const fmtInr = (n) =>

  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(

    Number(n || 0)

  );



export default function CartPage() {

  const navigate = useNavigate();

  const { user } = useAuth();

  const {

    items,

    removeItem,

    total,

    itemCount,

    caregiversByType,

    setCaregiverForType,

    checkoutMeta,
    setCheckoutMeta,

  } = useBookingCart();

  const [pickerOpen, setPickerOpen] = useState(false);

  const [pickerServiceType, setPickerServiceType] = useState(null);

  const [nurses, setNurses] = useState([]);

  const [loadingNurses, setLoadingNurses] = useState(false);

  const [scheduleOpen, setScheduleOpen] = useState(false);

  const [scheduleInput, setScheduleInput] = useState('');

  const [scheduledAt, setScheduledAt] = useState(null);



  const groupedItems = useMemo(() => groupCartItemsByServiceType(items), [items]);



  const pickerItems = useMemo(() => {

    if (!pickerServiceType) return items;

    return items.filter((i) => (i.serviceType || 'nurse_visit') === pickerServiceType);

  }, [items, pickerServiceType]);



  const minSchedule = useMemo(() => {

    const d = new Date();

    d.setMinutes(d.getMinutes() + 30);

    return d.toISOString().slice(0, 16);

  }, []);



  const loadNurses = useCallback(async () => {

    setLoadingNurses(true);

    try {

      const lng =

        checkoutMeta?.pin?.[0] ?? user?.lng ?? user?.location?.coordinates?.[0] ?? 77.5946;

      const lat =

        checkoutMeta?.pin?.[1] ?? user?.lat ?? user?.location?.coordinates?.[1] ?? 12.9716;

      const { data } = await api.get('/nurses', { params: { lng, lat, maxKm: 25 } });

      const list = data.nurses ?? [];

      setNurses(list);

      return list;

    } catch {

      setNurses([]);

      return [];

    } finally {

      setLoadingNurses(false);

    }

  }, [user, checkoutMeta]);



  useEffect(() => {

    loadNurses();

  }, [loadNurses]);



  useEffect(() => {

    if (pickerOpen) loadNurses();

  }, [pickerOpen, loadNurses]);



  useEffect(() => {

    const address = resolveCheckoutAddress(null, user);

    const pin = resolveCheckoutPin(null, user);

    if (!address) return;

    setCheckoutMeta((prev) => {

      const next = { ...(prev || {}) };

      let changed = false;

      if (!prev?.address?.trim()) {

        next.address = address;

        changed = true;

      }

      if (!Array.isArray(prev?.pin) || prev.pin.length !== 2) {

        next.pin = pin;

        changed = true;

      }

      return changed ? next : prev;

    });

  }, [user?.id, user?.location?.address, user?.location?.coordinates, setCheckoutMeta]);



  const openPickerFor = (serviceType) => {

    setPickerServiceType(serviceType);

    setPickerOpen(true);

  };



  const handleSelectCaregiver = (person) => {

    if (!pickerServiceType) return;

    setCaregiverForType(pickerServiceType, person);

    setPickerOpen(false);

    toast.success(`${caregiverServiceLabel(pickerServiceType)}: ${person.name} selected`);

  };



  const buildCheckoutState = useCallback(

    (scheduledAtIso = null, caregiversOverride = null) => {

      const groups = groupCartItemsByServiceType(items);

      const caregivers = caregiversOverride ?? caregiversByType;

      const { caregiver: primaryCaregiver, serviceType: primaryType } = resolvePrimaryCaregiver(

        groups,

        caregivers

      );

      const pin = resolveCheckoutPin(checkoutMeta, user);

      const address = resolveCheckoutAddress(checkoutMeta, user);

      const visitNotes =

        checkoutMeta?.visitNotes || items.map((i) => i.label).filter(Boolean).join('; ');



      return {

        nurse: primaryCaregiver,

        caregiversByType: caregivers,

        pin,

        address,

        visitNotes,

        serviceType: primaryType,

        scheduledAt: scheduledAtIso,

        selectedCareOptionIds: items.map((i) => i.id),

        selectedCareOptions: items.map((i) => ({

          id: i.id,

          label: i.label,

          rate: i.rate,

          serviceType: i.serviceType,

        })),

      };

    },

    [caregiversByType, checkoutMeta, user, items]

  );



  const continueToPayment = useCallback(async () => {

    if (items.length === 0) {

      toast.error('Add at least one service');

      return;

    }

    const address = resolveCheckoutAddress(checkoutMeta, user);

    if (!address) {

      toast.error('Choose an exact address on the dashboard before checkout');

      return;

    }

    let nurseList = nurses;

    if (!nurseList.length) nurseList = await loadNurses();

    const { caregiversByType: mergedCaregivers, assigned, stillMissing } =
      autoAssignCaregiversForGroups(groupedItems, nurseList, caregiversByType);

    for (const row of assigned) {

      setCaregiverForType(row.serviceType, row.caregiver);

    }

    if (stillMissing.length > 0) {

      toast.error(`No ${stillMissing[0].label.toLowerCase()} available nearby`);

      return;

    }

    const assignMsg = autoAssignToastMessage(assigned);

    if (assignMsg) toast.success(assignMsg);

    const checkout = buildCheckoutState(scheduledAt, mergedCaregivers);

    if (!caregiverRecordId(checkout.nurse)) {

      toast.error('No caregiver available near your location');

      return;

    }

    navigate('/dashboard/payment', { state: { checkout } });

  }, [
    items.length,
    groupedItems,
    caregiversByType,
    checkoutMeta,
    user,
    navigate,
    buildCheckoutState,
    scheduledAt,
    nurses,
    loadNurses,
    setCaregiverForType,
  ]);



  const confirmSchedule = (e) => {

    e.preventDefault();

    if (!scheduleInput) {

      toast.error('Pick a date and time');

      return;

    }

    setScheduledAt(new Date(scheduleInput).toISOString());

    setScheduleOpen(false);

    toast.success('Visit time saved — continue to payment when ready');

  };



  return (

    <div className="app-page min-h-full">

      <div className="page-shell-wide max-w-2xl mx-auto py-6 sm:py-8 px-4">

        <Link

          to="/dashboard"

          state={{ resumeBooking: true }}

          className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground mb-6"

        >

          <ArrowLeft className="w-4 h-4" aria-hidden />

          Back to dashboard

        </Link>



        <div className="flex items-center gap-3 mb-6">

          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">

            <ShoppingCart className="w-5 h-5" aria-hidden />

          </span>

          <div>

            <h1 className="text-xl font-bold text-foreground">Your cart</h1>

            <p className="text-sm text-muted">

              {itemCount === 0

                ? 'No services selected yet'

                : `${itemCount} item${itemCount === 1 ? '' : 's'} selected`}

            </p>

          </div>

        </div>



        {items.length === 0 ? (

          <div className="glass-panel p-8 text-center">

            <p className="text-muted text-sm mb-4">Add visit services from the booking flow to see them here.</p>

            <Link to="/dashboard" className="btn-primary inline-flex">

              Book care

            </Link>

          </div>

        ) : (

          <>

            <div className="flex items-center justify-between gap-2 mb-3">

              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your care plan</p>

              <Link

                to="/dashboard"

                state={{ resumeBooking: true }}

                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"

              >

                <Plus className="w-3.5 h-3.5" aria-hidden />

                Add service

              </Link>

            </div>



            <div className="space-y-4">

              {groupedItems.map((group) => {

                const assigned = caregiversByType[group.serviceType];

                return (

                  <section

                    key={group.serviceType}

                    className="glass-panel overflow-hidden"

                    aria-label={`${group.label} services`}

                  >

                    <div className="flex items-start justify-between gap-3 p-4 border-b border-glass-border/50 bg-glass-elevated/25">

                      <div className="min-w-0">

                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">

                          {group.label}

                        </p>

                        {assigned ? (

                          <>

                            <p className="font-medium text-foreground mt-0.5">{assigned.name}</p>

                            <p className="text-xs text-muted mt-0.5">

                              {assigned.specialization || 'Home care professional'}

                            </p>

                          </>

                        ) : (

                          <p className="text-sm text-muted mt-1">

                            No {group.label.toLowerCase()} selected yet

                          </p>

                        )}

                      </div>

                      <button

                        type="button"

                        onClick={() => openPickerFor(group.serviceType)}

                        className="shrink-0 text-xs font-semibold text-brand-700 hover:underline"

                      >

                        {assigned ? 'Change' : 'Select'}

                      </button>

                    </div>



                    <ul className="divide-y divide-glass-border/50">

                      {group.items.map((item) => (

                        <li key={item.id} className="flex items-start gap-3 p-4">

                          <div className="min-w-0 flex-1">

                            <p className="font-medium text-foreground">{item.label}</p>

                          </div>

                          <p className="text-sm font-semibold text-foreground tabular-nums shrink-0">

                            {fmtInr(item.rate)}

                          </p>

                          <button

                            type="button"

                            onClick={() => removeItem(item.id)}

                            className="shrink-0 p-2 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"

                            aria-label={`Remove ${item.label}`}

                          >

                            <Trash2 className="w-4 h-4" aria-hidden />

                          </button>

                        </li>

                      ))}

                    </ul>

                  </section>

                );

              })}

            </div>



            <div className="mt-4 glass-panel p-4 flex items-center justify-between gap-4">

              <span className="text-sm font-medium text-muted">Total</span>

              <span className="text-lg font-bold text-foreground tabular-nums">{fmtInr(total)}</span>

            </div>



            {scheduledAt && (

              <div className="mt-4 glass-panel p-4 flex items-start justify-between gap-3">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Scheduled visit</p>

                  <p className="text-sm font-medium text-foreground mt-1">

                    {new Date(scheduledAt).toLocaleString(undefined, {

                      dateStyle: 'medium',

                      timeStyle: 'short',

                    })}

                  </p>

                </div>

                <button

                  type="button"

                  onClick={() => {

                    setScheduledAt(null);

                    setScheduleInput('');

                    setScheduleOpen(true);

                  }}

                  className="text-xs font-semibold text-brand-700 hover:underline shrink-0"

                >

                  Change

                </button>

              </div>

            )}



            {scheduleOpen && (

              <form onSubmit={confirmSchedule} className="mt-4 glass-panel p-4 space-y-3">

                <p className="text-sm font-semibold text-foreground">Schedule for later</p>

                <p className="text-xs text-muted">Pick when you would like the caregiver to visit.</p>

                <label className="block text-xs font-semibold text-foreground">

                  Preferred visit time

                  <input

                    type="datetime-local"

                    className="input mt-1.5 w-full text-sm"

                    value={scheduleInput}

                    min={minSchedule}

                    onChange={(e) => setScheduleInput(e.target.value)}

                    required

                  />

                </label>

                <div className="flex flex-wrap gap-2 pt-1">

                  <button type="submit" className="btn-primary text-sm px-4 py-2">

                    Save time

                  </button>

                  <button

                    type="button"

                    className="btn-outline text-sm px-4 py-2"

                    onClick={() => setScheduleOpen(false)}

                  >

                    Cancel

                  </button>

                </div>

              </form>

            )}



            {!scheduleOpen && (

              <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">

                {!scheduledAt && (

                  <button

                    type="button"

                    className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-glass-border/70 bg-glass/50 px-4 py-3 text-sm font-semibold text-foreground hover:bg-glass-elevated/60 transition-colors"

                    onClick={() => setScheduleOpen(true)}

                  >

                    <CalendarClock className="w-4 h-4 text-brand-600" strokeWidth={2} aria-hidden />

                    Schedule later

                  </button>

                )}

                <button

                  type="button"

                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:from-brand-700 hover:to-brand-800"

                  onClick={continueToPayment}

                >

                  <CreditCard className="w-4 h-4" strokeWidth={2} aria-hidden />

                  Continue payment

                </button>

              </div>

            )}

          </>

        )}

      </div>



      <CaregiverPickerModal

        open={pickerOpen}

        onClose={() => {

          setPickerOpen(false);

          setPickerServiceType(null);

        }}

        nurses={nurses}

        loading={loadingNurses}

        serviceType={pickerServiceType || 'nurse_visit'}

        cartItems={pickerItems}

        selectedId={pickerServiceType ? caregiversByType[pickerServiceType]?._id : undefined}

        onSelect={handleSelectCaregiver}

        emptyMessage="No caregivers available near your location for this service type."

      />

    </div>

  );

}

