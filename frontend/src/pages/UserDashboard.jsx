import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  Ambulance,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CreditCard,
  Navigation,
  Radar,
  Stethoscope,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import MapView from '../components/MapView.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { getRoute, formatEta } from '../lib/route';
import { useAuth } from '../context/AuthContext.jsx';
import AddAddressModal from '../components/AddAddressModal.jsx';
import DashboardAddressBar from '../components/DashboardAddressBar.jsx';
import { reverseGeocode } from '../lib/geocode';
import { normalizeSavedAddress } from '../lib/addressFormat';
import {
  autoAssignCaregiversForGroups,
  CAREGIVER_SERVICE_TYPES,
  caregiverServiceLabel,
  caregiversForService,
  categoryToKind,
  groupCartItemsByServiceType,
  nearestCaregiverForService,
  resolveCaregiverServiceType,
  visitFocusMatchesSearch,
} from '../lib/caregiverServices';
import { patientProfileCompletion } from '../lib/patientProfile';
import { SeasonalHoverCards } from '../components/SeasonalHoverCards.jsx';
import VisitBookingFlow from '../components/booking/VisitBookingFlow.jsx';
import CaregiverPickerModal from '../components/booking/CaregiverPickerModal.jsx';
import { autoAssignToastMessage, caregiverRecordId } from '../lib/checkout';
import { subscribeSosNavigate, stopSosAlarm } from '../lib/emergencyAlerts';
import PatientDashboardRail from '../components/dashboard/PatientDashboardRail.jsx';
import PatientDashboardSubHeader from '../components/dashboard/PatientDashboardSubHeader.jsx';
import PatientDashboardCareTabs, { BotAvatar } from '../components/dashboard/PatientDashboardCareTabs.jsx';
import BotFloatingPopup from '../components/dashboard/BotFloatingPopup.jsx';
import { useBookingCart } from '../context/BookingCartContext.jsx';
import { SERVICE_ICONS, SERVICE_SECTIONS, mergeServiceSections } from '../lib/serviceSections';
import { VISIT_FOCUS_PREVIEW_COUNT, careOptionToSeasonCard } from '../lib/visitFocusCards.js';

const SIDEBAR_TABS = [
  { id: 'nurse', label: 'Nurse visit', Icon: UserRound, serviceType: 'nurse_visit' },
  { id: 'doctor', label: 'Doctor', Icon: Stethoscope, serviceType: 'doctor_consult' },
  { id: 'physio', label: 'Physio', Icon: Activity, serviceType: 'physiotherapy' },
  { id: 'emergency', label: 'Emergency', Icon: Ambulance, serviceType: 'emergency' },
];

/** Copy for visit-focus + nearby column per care tab */
const SERVICE_BOOKING_COPY = {
  nurse_visit: {
    visitSubtitle: 'Select visit reasons - helps match the right nurse.',
    nearbyTitle: 'Nearby caregivers',
    nearbyEmptyConfirmed: 'No caregivers in range.',
    nearbyEmptyUnconfirmed: 'Confirm location to see caregivers.',
  },
  doctor_consult: {
    visitSubtitle: 'Select consultation focus - helps match the right doctor.',
    nearbyTitle: 'Nearby doctors',
    nearbyEmptyConfirmed: 'No doctors in range.',
    nearbyEmptyUnconfirmed: 'Confirm location to see doctors.',
  },
  physiotherapy: {
    visitSubtitle: 'Select therapy goals - helps match the right physio.',
    nearbyTitle: 'Nearby physiotherapists',
    nearbyEmptyConfirmed: 'No physiotherapists in range.',
    nearbyEmptyUnconfirmed: 'Confirm location to see physiotherapists.',
  },
  emergency: {
    visitSubtitle: 'Select urgency and needs - helps route the fastest responder.',
    nearbyTitle: 'Nearby responders',
    nearbyEmptyConfirmed: 'No responders in range.',
    nearbyEmptyUnconfirmed: 'Confirm location to see responders.',
  },
};

const ACTIVE_STATUSES = ['accepted', 'on_the_way', 'in_progress'];
const TRACKING_STATUSES = ['on_the_way', 'in_progress'];

const savedAddressStorageKey = (user) => `patient:saved-addresses:${user?._id || user?.email || 'guest'}`;

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

const servicePurposeLabel = (request) => request?.serviceType?.replace(/_/g, ' ') || 'Service visit';

const visitDurationLabel = (request) => {
  if (!request?.startedAt || !request?.completedAt) return null;
  const start = new Date(request.startedAt).getTime();
  const end = new Date(request.completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const totalMinutes = Math.max(1, Math.round((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

function serviceTypeForMarketingService(service) {
  if (service?.serviceType) return service.serviceType;
  const text = `${service?.laymanName || ''} ${service?.legacyName || ''}`.toLowerCase();
  if (/doctor|physician|consult/.test(text)) return 'doctor_consult';
  if (/physio|therapy|mobility|rehab/.test(text)) return 'physiotherapy';
  if (/emergency|ambulance|rapid|er\b/.test(text)) return 'emergency';
  return 'nurse_visit';
}

function kindBadge(kind) {
  switch (kind) {
    case 'doctor':
      return { label: 'Doctor', className: 'bg-sky-100 text-sky-900' };
    case 'physio':
      return { label: 'Physio', className: 'bg-amber-100 text-amber-950' };
    case 'ambulance':
      return { label: 'Emergency', className: 'bg-rose-100 text-rose-900' };
    default:
      return { label: 'Nurse', className: 'bg-emerald-100 text-emerald-900' };
  }
}

function initialsFromName(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const profileComplete = useMemo(() => patientProfileCompletion(user), [user]);
  const {
    setItems: setCartItems,
    registerRemoveListener,
    clearCart,
    setCaregiverForType,
    setCheckoutMeta,
    items: cartItems,
    caregiversByType,
    caregiver: cartCaregiver,
  } = useBookingCart();
  const cartServiceType = cartItems.find((i) => i.serviceType)?.serviceType;
  const [bookingCategory, setBookingCategory] = useState(() => cartServiceType || null);
  const [serviceType, setServiceType] = useState(() => cartServiceType || 'nurse_visit');
  const [serviceSections, setServiceSections] = useState(SERVICE_SECTIONS);
  const [expandedServiceSectionId, setExpandedServiceSectionId] = useState(
    SERVICE_SECTIONS[0]?.id || null
  );
  /** Booking vs live map vs request history (sidebar) */
  const [mainPanel, setMainPanel] = useState('book');
  /** Homecare / Services / Wellness / Health monitor / Bot — under sub-header */
  const [careTab, setCareTab] = useState('homecare');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [pin, setPin] = useState(user?.location?.coordinates || [77.5946, 12.9716]);
  const [address, setAddress] = useState(user?.location?.address || '');
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState(() => {
    const initial = user?.location?.address?.trim()
      ? [
          {
            id: 'profile-location',
            label: user.location.address,
            coordinates: user.location.coordinates || [77.5946, 12.9716],
          },
        ]
      : [];
    try {
      const stored = JSON.parse(localStorage.getItem(savedAddressStorageKey(user)) || '[]');
      const merged = [...initial, ...(Array.isArray(stored) ? stored : [])];
      return merged.filter(
        (item, index, arr) => item?.label && arr.findIndex((x) => x.label === item.label) === index
      );
    } catch {
      return initial;
    }
  });
  const [requests, setRequests] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [locationConfirmed, setLocationConfirmed] = useState(Boolean(user?.location?.address?.trim()));
  const [reasonQuery, setReasonQuery] = useState('');
  /** Visit-focus selections — option ids (rates come from `careOptions`). */
  const [selectedCareIds, setSelectedCareIds] = useState(() => cartItems.map((i) => i.id));
  /** Visit-focus checklist labels â€” loaded from admin-managed `/care-services` */
  const [careOptions, setCareOptions] = useState([]);
  /** All service catalogs merged when searching (each option tagged with `serviceType`). */
  const [allCareCatalog, setAllCareCatalog] = useState([]);
  const skipCareResetRef = useRef(false);
  const prevServiceTypeRef = useRef(serviceType);

  const [selectedNurse, setSelectedNurse] = useState(() => cartCaregiver ?? null);
  const [caregiverPickerOpen, setCaregiverPickerOpen] = useState(false);

  const [routes, setRoutes] = useState({});
  const [liveNurseLoc, setLiveNurseLoc] = useState({});
  const lastRouteFetch = useRef({});
  const [showLiveTrackingGraph, setShowLiveTrackingGraph] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [otpPopup, setOtpPopup] = useState(null);
  /** After paid booking â€” open Your requests and location detail */
  const [postBookingRequestId, setPostBookingRequestId] = useState(null);
  /** Booking quick-view popup on Your requests */
  const [locationOverlayRequest, setLocationOverlayRequest] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/marketing-services')
      .then(({ data }) => {
        if (cancelled) return;
        const merged = mergeServiceSections(data.sections || [], data);
        setServiceSections(merged);
        setExpandedServiceSectionId((current) => current || merged[0]?.id || null);
      })
      .catch(() => {
        if (!cancelled) setServiceSections(SERVICE_SECTIONS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openOtpPopup = (pendingOtp, requestId) => {
    if (!pendingOtp?.otp) return;
    setOtpPopup({
      purpose: pendingOtp.purpose,
      otp: pendingOtp.otp,
      requestId,
    });
  };

  useEffect(() => {
    if (prevServiceTypeRef.current === serviceType) return;
    prevServiceTypeRef.current = serviceType;
    if (skipCareResetRef.current) {
      skipCareResetRef.current = false;
    }
  }, [serviceType]);

  const catalogForBooking = useMemo(() => {
    const co = selectedNurse?.careOfferings;
    if (!Array.isArray(co) || co.length === 0) return careOptions;
    const allowed = new Set(
      co.filter((x) => x.serviceType === serviceType).map((x) => x.careServiceOptionId)
    );
    if (allowed.size === 0) return careOptions;
    return careOptions.filter((o) => allowed.has(o.id));
  }, [serviceType, selectedNurse, careOptions]);

  const rateForCareOption = useCallback(
    (optId) => {
      const row = selectedNurse?.careOfferings?.find((x) => x.careServiceOptionId === optId);
      if (row) return Number(row.rate) || 0;
      const c =
        careOptions.find((x) => x.id === optId) || allCareCatalog.find((x) => x.id === optId);
      return Number(c?.rate) || 0;
    },
    [selectedNurse, careOptions, allCareCatalog]
  );

  useEffect(() => {
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
        if (cancelled) return;
        setAllCareCatalog(
          results.flatMap(({ st, options }) =>
            options.map((o) => ({ ...o, serviceType: st }))
          )
        );
      } catch {
        if (!cancelled) setAllCareCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCaregivers = useMemo(
    () => caregiversForService(nurses, serviceType),
    [nurses, serviceType]
  );

  const bookingCopy = useMemo(
    () => SERVICE_BOOKING_COPY[serviceType] ?? SERVICE_BOOKING_COPY.nurse_visit,
    [serviceType]
  );

  const dashboardActiveBookings = useMemo(
    () =>
      [...requests]
        .filter((r) => !['completed', 'cancelled'].includes(r.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [requests]
  );

  const activeRequestCount = dashboardActiveBookings.length;

  const closeLocationOverlay = () => setLocationOverlayRequest(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/care-services', { params: { serviceType } });
        if (!cancelled) setCareOptions(data.options || []);
      } catch {
        if (!cancelled) setCareOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceType]);


  useEffect(() => {
    if (!locationConfirmed) setSelectedNurse(null);
  }, [locationConfirmed]);

  useEffect(() => {
    try {
      localStorage.setItem(savedAddressStorageKey(user), JSON.stringify(savedAddresses));
    } catch {
      // Local storage is optional; booking still works with the selected address.
    }
  }, [savedAddresses, user]);

  useEffect(() => {
    if (selectedNurse && !filteredCaregivers.some((n) => n._id === selectedNurse._id)) {
      setSelectedNurse(null);
    }
  }, [filteredCaregivers, selectedNurse]);


  const catalogForSearch = useMemo(() => {
    const q = reasonQuery.trim();
    if (!q) return catalogForBooking;

    const pool =
      allCareCatalog.length > 0
        ? allCareCatalog
        : careOptions.map((o) => ({ ...o, serviceType }));

    if (serviceType === 'nurse_visit' && selectedNurse?.careOfferings?.length) {
      const allowed = new Set(
        selectedNurse.careOfferings
          .filter((x) => x.serviceType === 'nurse_visit')
          .map((x) => x.careServiceOptionId)
      );
      if (allowed.size > 0) {
        return pool.filter((o) => o.serviceType !== 'nurse_visit' || allowed.has(o.id));
      }
    }
    return pool;
  }, [reasonQuery, catalogForBooking, allCareCatalog, careOptions, serviceType, selectedNurse]);

  const resolveCareOption = useCallback(
    (id) =>
      allCareCatalog.find((o) => o.id === id) ||
      catalogForBooking.find((o) => o.id === id) ||
      catalogForSearch.find((o) => o.id === id) ||
      careOptions.find((o) => o.id === id),
    [catalogForBooking, catalogForSearch, allCareCatalog, careOptions]
  );

  useEffect(() => {
    return registerRemoveListener((id) => {
      if (id == null) {
        setSelectedCareIds([]);
        return;
      }
      setSelectedCareIds((prev) => prev.filter((x) => x !== id));
    });
  }, [registerRemoveListener]);

  const cartItemsEqual = useCallback((a, b) => {
    if (a.length !== b.length) return false;
    return a.every(
      (item, i) =>
        item.id === b[i]?.id &&
        item.label === b[i]?.label &&
        item.rate === b[i]?.rate &&
        item.serviceType === b[i]?.serviceType
    );
  }, []);

  useEffect(() => {
    const cartIds = new Set(cartItems.map((i) => i.id));
    const hasNewSelection = selectedCareIds.some((id) => !cartIds.has(id));
    if (
      !hasNewSelection &&
      selectedCareIds.length > cartItems.length &&
      cartItems.every((item) => selectedCareIds.includes(item.id))
    ) {
      return;
    }

    if (selectedCareIds.length === 0) {
      setCartItems((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const items = selectedCareIds
      .map((id) => {
        const opt = resolveCareOption(id);
        if (!opt) return null;
        return {
          id,
          label: opt.label,
          rate: rateForCareOption(id),
          serviceType: opt.serviceType || serviceType,
        };
      })
      .filter(Boolean);
    if (items.length !== selectedCareIds.length) return;
    setCartItems((prev) => (cartItemsEqual(prev, items) ? prev : items));
  }, [
    selectedCareIds,
    cartItems,
    resolveCareOption,
    rateForCareOption,
    serviceType,
    setCartItems,
    cartItemsEqual,
  ]);

  /** Keep visit-focus picks aligned with cart before other effects can restore stale selections. */
  useLayoutEffect(() => {
    setSelectedCareIds((prev) => {
      const next = cartItems.map((i) => i.id);
      const prevKey = [...prev].sort().join(',');
      const nextKey = [...next].sort().join(',');
      return prevKey === nextKey ? prev : next;
    });
  }, [cartItems]);

  const caregiverForActiveTab = caregiversByType[serviceType] ?? null;

  useEffect(() => {
    const cg = caregiversByType[serviceType] || cartCaregiver;
    if (!cg) return;
    setSelectedNurse((prev) => (prev?._id === cg._id ? prev : cg));
  }, [caregiversByType, serviceType, cartCaregiver]);

  const filteredReasonOptions = useMemo(
    () => catalogForSearch.filter((o) => visitFocusMatchesSearch(o, reasonQuery)),
    [catalogForSearch, reasonQuery]
  );

  const isCrossServiceSearch = Boolean(reasonQuery.trim());

  const visibleReasonOptions = useMemo(
    () => filteredReasonOptions.slice(0, VISIT_FOCUS_PREVIEW_COUNT),
    [filteredReasonOptions]
  );

  const suggestionCards = useMemo(
    () =>
      visibleReasonOptions.map((opt) =>
        careOptionToSeasonCard(opt, fmtInr(rateForCareOption(opt.id)))
      ),
    [visibleReasonOptions, rateForCareOption]
  );

  const allSuggestionCards = useMemo(
    () =>
      filteredReasonOptions.map((opt) =>
        careOptionToSeasonCard(opt, fmtInr(rateForCareOption(opt.id)))
      ),
    [filteredReasonOptions, rateForCareOption]
  );

  const hasChosenVisitFocus = selectedCareIds.length > 0;

  const visitNotes = useMemo(() => {
    const labels = selectedCareIds
      .map((id) => resolveCareOption(id)?.label)
      .filter(Boolean);
    return labels.length ? labels.join('; ') : '';
  }, [selectedCareIds, resolveCareOption]);

  const toggleCareId = useCallback(
    (id, optServiceType) => {
      if (optServiceType && optServiceType !== serviceType) {
        skipCareResetRef.current = true;
        setServiceType(optServiceType);
        setBookingCategory(optServiceType);
      }
      setSelectedCareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    },
    [serviceType]
  );

  const onSuggestionCardSelect = useCallback(
    (card) => {
      const opt =
        filteredReasonOptions.find((o) => o.id === card.id) ||
        catalogForBooking.find((o) => o.id === card.id);
      if (opt) toggleCareId(opt.id, opt.serviceType);
    },
    [filteredReasonOptions, catalogForBooking, toggleCareId]
  );

  const loadRequests = async () => {
    const { data } = await api.get('/requests/mine', {
      params: { _ts: Date.now() },
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    setRequests(data.requests);
    return data.requests;
  };

  useEffect(() => {
    const st = location.state;
    if (!st || typeof st !== 'object') return;
    let cleared = false;
    if (st.resumeBooking) {
      setMainPanel('book');
      setCareTab('homecare');
      if (cartItems.length > 0) {
        setSelectedCareIds(cartItems.map((i) => i.id));
        const types = [...new Set(cartItems.map((i) => i.serviceType).filter(Boolean))];
        if (types.length === 1) {
          setServiceType(types[0]);
          setBookingCategory(types[0]);
        }
      }
      if (cartCaregiver) setSelectedNurse(cartCaregiver);
      cleared = true;
    }
    if (st.mainPanel === 'book' || st.mainPanel === 'requests' || st.mainPanel === 'tracking') {
      setMainPanel(st.mainPanel);
      if (st.mainPanel === 'book') setCareTab('homecare');
      cleared = true;
    }
    if (st.mainPanel === 'services') {
      setMainPanel('book');
      setCareTab('services');
      cleared = true;
    }
    if (Array.isArray(st.selectedCareIds)) {
      setSelectedCareIds(st.selectedCareIds);
      cleared = true;
    }
    if (st.serviceType && SIDEBAR_TABS.some((t) => t.serviceType === st.serviceType)) {
      setServiceType(st.serviceType);
      setBookingCategory(st.serviceType);
      cleared = true;
    }
    if (st.bookingComplete) {
      setNotes('');
      setSelectedCareIds([]);
      setSelectedNurse(null);
      clearCart();
      cleared = true;
      loadRequests().catch(() => {});
    }
    if (st.postBookingRequestId) {
      setPostBookingRequestId(st.postBookingRequestId);
      setMainPanel('requests');
      cleared = true;
    }
    if (cleared) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, cartItems, cartCaregiver, clearCart]);

  useEffect(() => {
    if (!postBookingRequestId || requests.length === 0) return;
    const r = requests.find((x) => x._id === postBookingRequestId);
    if (r) {
      setLocationOverlayRequest(r);
      setPostBookingRequestId(null);
    }
  }, [postBookingRequestId, requests]);

  const loadNurses = useCallback(async (coords) => {
    try {
      const [lng, lat] = coords;
      const { data } = await api.get('/nurses', { params: { lng, lat, maxKm: 25 } });
      const list = data.nurses ?? [];
      setNurses(list);
      return list;
    } catch {
      setNurses([]);
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const reqs = await loadRequests();
      const s = getSocket();
      reqs.forEach((r) => {
        if (ACTIVE_STATUSES.includes(r.status) && s) s.emit('request:join', r._id);
      });
    })();
    loadNurses(pin);

    const profileHasAddress = Boolean(user?.location?.address?.trim());

    const applyResolvedAddress = (label) => {
      const t = label?.trim();
      if (cancelled || !t) return;
      setAddress(t);
      setLocationConfirmed(true);
    };

    const resolveAddressFromCoordinates = async (lng, lat) => {
      try {
        const label = await reverseGeocode(lng, lat);
        applyResolvedAddress(label);
      } catch {
        /* network / rate limit */
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const c = [pos.coords.longitude, pos.coords.latitude];
          if (cancelled) return;
          setPin(c);
          loadNurses(c);
          await resolveAddressFromCoordinates(c[0], c[1]);
        },
        async () => {
          if (cancelled || profileHasAddress) return;
          await resolveAddressFromCoordinates(pin[0], pin[1]);
        }
      );
    } else if (!profileHasAddress) {
      resolveAddressFromCoordinates(pin[0], pin[1]);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (locationConfirmed) loadNurses(pin);
  }, [serviceType, locationConfirmed, loadNurses, pin]);

  useEffect(() => {
    const refresh = () => {
      if (locationConfirmed) loadNurses(pin);
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [locationConfirmed, loadNurses, pin]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadRequests().catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const onUpdate = (req) => {
      setRequests((rs) => {
        const exists = rs.some((r) => r._id === req._id);
        if (!exists) return [req, ...rs];
        return rs.map((r) =>
          r._id === req._id
            ? {
                ...req,
                pendingOtp:
                  req.pendingOtp !== undefined
                    ? req.pendingOtp
                    : ['in_progress', 'completed', 'cancelled'].includes(req.status)
                      ? null
                      : r.pendingOtp ?? null,
              }
            : r
        );
      });
      if (['in_progress', 'completed', 'cancelled'].includes(req.status)) {
        setOtpPopup((current) => (current?.requestId === req._id ? null : current));
      }
      if (ACTIVE_STATUSES.includes(req.status)) {
        s.emit('request:join', req._id);
      }
      const label =
        req.status === 'accepted'
          ? `${req.nurse?.name || 'A nurse'} accepted your request`
          : req.status === 'on_the_way'
            ? `${req.nurse?.name || 'Your nurse'} is on the way`
            : req.status === 'in_progress'
              ? 'Visit started'
              : req.status === 'completed'
                ? 'Visit completed'
                : `Status: ${req.status.replace('_', ' ')}`;
      toast(label);
    };

    const onNurseLoc = ({ requestId, coordinates }) => {
      if (!coordinates) return;
      setLiveNurseLoc((m) => ({ ...m, [requestId]: coordinates }));
    };

    const onOtpGenerated = ({ purpose, otpPreview, requestId }) => {
      const title = purpose === 'start_visit' ? 'Start-visit OTP' : 'Completion OTP';
      if (otpPreview) {
        toast.success(`${title}: ${otpPreview}`);
        setOtpPopup({
          purpose,
          otp: otpPreview,
          requestId,
        });
      } else if (purpose === 'start_visit') {
        toast('Start-visit OTP sent to your number');
      } else if (purpose === 'complete_visit') {
        toast('Completion OTP sent to your number');
      }
      loadRequests().catch(() => {});
    };

    const onOtpSync = ({ requestId, pendingOtp }) => {
      if (!requestId) return;
      setRequests((rs) =>
        rs.map((r) => {
          if (r._id !== requestId) return r;
          const next = pendingOtp || null;
          if (next && !next.otp && r.pendingOtp?.otp && r.pendingOtp.purpose === next.purpose) {
            return { ...r, pendingOtp: { ...next, otp: r.pendingOtp.otp } };
          }
          return { ...r, pendingOtp: next };
        })
      );
      if (!pendingOtp) {
        setOtpPopup((current) => (current?.requestId === requestId ? null : current));
        return;
      }
      openOtpPopup(pendingOtp, requestId);
    };

    s.on('request:updated', onUpdate);
    s.on('nurse:location', onNurseLoc);
    s.on('request:otp-generated', onOtpGenerated);
    s.on('request:otp-sync', onOtpSync);
    return () => {
      s.off('request:updated', onUpdate);
      s.off('nurse:location', onNurseLoc);
      s.off('request:otp-generated', onOtpGenerated);
      s.off('request:otp-sync', onOtpSync);
    };
  }, []);

  useEffect(() => {
    const active = requests.filter((r) => TRACKING_STATUSES.includes(r.status) && r.nurse);
    active.forEach((r) => {
      const nurseCoords = liveNurseLoc[r._id] || r.nurse?.location?.coordinates;
      const patientCoords = r.location.coordinates;
      if (!nurseCoords || !patientCoords) return;

      const last = lastRouteFetch.current[r._id] || 0;
      if (Date.now() - last < 15000 && routes[r._id]) return;
      lastRouteFetch.current[r._id] = Date.now();

      getRoute(nurseCoords, patientCoords).then((route) => {
        if (!route) return;
        setRoutes((m) => ({ ...m, [r._id]: route }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, liveNurseLoc]);

  const trackableRequests = useMemo(
    () => requests.filter((r) => TRACKING_STATUSES.includes(r.status) && r.nurse),
    [requests]
  );

  useEffect(() => {
    if (!selectedRequest) return;
    const latest = requests.find((r) => r._id === selectedRequest._id);
    if (latest) setSelectedRequest(latest);
  }, [requests, selectedRequest]);

  useEffect(() => {
    if (otpPopup) return;
    const withOtp = requests.find((r) => r.pendingOtp?.otp);
    if (withOtp) openOtpPopup(withOtp.pendingOtp, withOtp._id);
  }, [requests, otpPopup]);

  useEffect(() => {
    if (!selectedRequest) {
      setSelectedRoute(null);
      return;
    }
    const existingRoute = routes[selectedRequest._id];
    if (existingRoute) {
      setSelectedRoute(existingRoute);
      return;
    }
    const patientCoords = selectedRequest.location?.coordinates;
    const nurseCoords =
      liveNurseLoc[selectedRequest._id] || selectedRequest.nurse?.location?.coordinates || null;
    if (!patientCoords || !nurseCoords) {
      setSelectedRoute(null);
      return;
    }
    let cancelled = false;
    getRoute(nurseCoords, patientCoords).then((route) => {
      if (cancelled) return;
      setSelectedRoute(route || null);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedRequest, routes, liveNurseLoc]);

  /** Newest first â€” matches API order; re-sort after socket merges */
  const requestsByLatest = useMemo(
    () =>
      [...requests].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [requests]
  );

  const { trackingMarkers, trackingPolylines, trackingCenter } = useMemo(() => {
    const mks = [];
    const lines = [];
    let center = [77.5946, 12.9716];

    trackableRequests.forEach((r) => {
      const patientCoords = r.location?.coordinates;
      if (!patientCoords) return;

      mks.push({
        id: `patient-${r._id}`,
        type: 'user',
        coordinates: patientCoords,
        popup: (
          <div>
            <b>You</b>
            <div className="text-xs truncate max-w-[200px]">{r.location?.address}</div>
          </div>
        ),
      });

      const nurseCoords = liveNurseLoc[r._id] || r.nurse?.location?.coordinates;
      if (nurseCoords) {
        mks.push({
          id: `nurse-live-${r._id}`,
          type: 'nurse',
          coordinates: nurseCoords,
          popup: (
            <div>
              <b>{r.nurse.name}</b>
              <div className="text-xs">{r.status.replace('_', ' ')}</div>
            </div>
          ),
        });
        const route = routes[r._id];
        if (route) {
          lines.push({
            id: `route-${r._id}`,
            coords: route.coords,
            color: r.status === 'on_the_way' ? '#0a9bf0' : '#13c296',
            dashed: r.status === 'in_progress',
          });
        } else {
          lines.push({
            id: `route-fallback-${r._id}`,
            coords: [nurseCoords, patientCoords],
            color: '#94a3b8',
            dashed: true,
            opacity: 0.6,
          });
        }
        center = [
          (nurseCoords[0] + patientCoords[0]) / 2,
          (nurseCoords[1] + patientCoords[1]) / 2,
        ];
      } else {
        center = patientCoords;
      }
    });

    return {
      trackingMarkers: mks,
      trackingPolylines: lines,
      trackingCenter: center,
    };
  }, [trackableRequests, liveNurseLoc, routes]);

  const fetchAvailableCaregivers = useCallback(
    async (scheduledAt) => {
      if (!locationConfirmed || !pin) return [];
      const [lng, lat] = pin;
      const { data } = await api.get('/nurses/available', {
        params: { lng, lat, maxKm: 25, scheduledAt },
      });
      return caregiversForService(data.nurses || [], serviceType);
    },
    [locationConfirmed, pin, serviceType]
  );

  const goToPayment = (e, { scheduledAt, nurse: nurseOverride } = {}) => {
    e?.preventDefault?.();
    let nurse = nurseOverride || selectedNurse || caregiversByType[serviceType];
    if (!locationConfirmed || !address.trim()) {
      toast.error('Choose an exact address from search');
      return;
    }
    if (!caregiverRecordId(nurse)) {
      const nearest = nearestCaregiverForService(nurses, serviceType);
      if (!nearest) {
        toast.error('No caregivers near this location');
        return;
      }
      nurse = nearest;
      setSelectedNurse(nearest);
      const assignType =
        resolveCaregiverServiceType(
          nearest.careOfferings,
          nearest.specialization,
          nearest.caregiverCategory
        ) || serviceType;
      setCaregiverForType(assignType, nearest);
      toast.success(`${nearest.name} assigned (nearest available)`);
    }
    if (selectedCareIds.length === 0) {
      toast.error('Select at least one visit focus');
      return;
    }
    navigate('/dashboard/payment', {
      state: {
        checkout: {
          nurse,
          pin: [...pin],
          address,
          visitNotes,
          serviceType,
          scheduledAt: scheduledAt || null,
          selectedCareOptionIds: [...selectedCareIds],
          selectedCareOptions: selectedCareIds
            .map((id) => {
              const opt = resolveCareOption(id);
              if (!opt) return null;
              return {
                id,
                label: opt.label,
                rate: rateForCareOption(id),
                serviceType: opt.serviceType,
              };
            })
            .filter(Boolean),
        },
      },
    });
  };

  const handleServiceTypeChange = useCallback((st, { openCategory = false, resetCart = false } = {}) => {
    skipCareResetRef.current = true;
    setServiceType(st);
    setReasonQuery('');
    if (openCategory) setBookingCategory(st);
    if (resetCart) {
      setSelectedCareIds([]);
      setSelectedNurse(null);
      clearCart();
    }
  }, [clearCart]);

  useEffect(() => {
    if (user?.role === 'admin') return undefined;
    return subscribeSosNavigate(() => {
      stopSosAlarm();
      setMainPanel('book');
      setCareTab('homecare');
      handleServiceTypeChange('emergency', { openCategory: true });
    });
  }, [handleServiceTypeChange, user?.role]);

  const handleScheduleLater = useCallback(
    (scheduledAt, nurse) => {
      if (nurse) setSelectedNurse(nurse);
      goToPayment(null, { scheduledAt, nurse: nurse || selectedNurse });
    },
    [goToPayment, selectedNurse]
  );

  const applyCaregiverToCart = useCallback(
    (nurse) => {
      if (!locationConfirmed || !address.trim()) {
        toast.error('Choose an exact address from search');
        return false;
      }
      if (selectedCareIds.length === 0) {
        toast.error('Select at least one service');
        return false;
      }
      setSelectedNurse(nurse);
      const assignType =
        resolveCaregiverServiceType(
          nurse.careOfferings,
          nurse.specialization,
          nurse.caregiverCategory
        ) || serviceType;
      setCaregiverForType(assignType, nurse);
      const cartTypes = [
        ...new Set(
          selectedCareIds.map((id) => resolveCareOption(id)?.serviceType).filter(Boolean)
        ),
      ];
      setCheckoutMeta({
        pin: [...pin],
        address,
        visitNotes,
        serviceType: cartTypes[0] || serviceType,
      });
      return true;
    },
    [
      locationConfirmed,
      address,
      pin,
      visitNotes,
      serviceType,
      selectedCareIds,
      resolveCareOption,
      setCaregiverForType,
      setCheckoutMeta,
    ]
  );

  const handlePickerSelectCaregiver = useCallback(
    (nurse) => {
      if (!applyCaregiverToCart(nurse)) return;
      toast.success(`${nurse.name} selected`);
    },
    [applyCaregiverToCart]
  );

  const handleContinueToCartFromPicker = useCallback(async () => {
    if (!locationConfirmed || !address.trim()) {
      toast.error('Choose an exact address from search');
      return;
    }
    if (selectedCareIds.length === 0) {
      toast.error('Select at least one service first');
      return;
    }

    let list = nurses;
    if (!list.length) list = await loadNurses(pin);

    const grouped = groupCartItemsByServiceType(
      cartItems.length > 0
        ? cartItems
        : selectedCareIds.map((id) => ({
            id,
            serviceType: resolveCareOption(id)?.serviceType || serviceType,
          }))
    );

    const { assigned, stillMissing } = autoAssignCaregiversForGroups(
      grouped,
      list,
      caregiversByType
    );

    for (const row of assigned) {
      setCaregiverForType(row.serviceType, row.caregiver);
    }

    if (stillMissing.length > 0) {
      toast.error(`No ${stillMissing[0].label.toLowerCase()} available nearby`);
      return;
    }

    const assignMsg = autoAssignToastMessage(assigned);
    if (assignMsg) toast.success(assignMsg);

    const cartTypes = [
      ...new Set(
        selectedCareIds.map((id) => resolveCareOption(id)?.serviceType).filter(Boolean)
      ),
    ];
    setCheckoutMeta({
      pin: [...pin],
      address,
      visitNotes,
      serviceType: cartTypes[0] || serviceType,
    });

    setCaregiverPickerOpen(false);
    navigate('/dashboard/cart', { state: { fromBooking: true } });
  }, [
    locationConfirmed,
    address,
    selectedCareIds,
    nurses,
    loadNurses,
    pin,
    cartItems,
    caregiversByType,
    serviceType,
    resolveCareOption,
    visitNotes,
    setCaregiverForType,
    setCheckoutMeta,
    navigate,
  ]);

  const handleNurseContinueToCart = useCallback(
    (nurse) => {
      if (!applyCaregiverToCart(nurse)) return;
      navigate('/dashboard/cart', { state: { fromBooking: true } });
    },
    [applyCaregiverToCart, navigate]
  );

  const openCaregiverPicker = useCallback(() => {
    if (selectedCareIds.length === 0) {
      toast.error('Select at least one service first');
      return;
    }
    if (!locationConfirmed || !address.trim()) {
      toast.error('Choose an exact address from search');
      return;
    }
    loadNurses(pin);
    setCaregiverPickerOpen(true);
  }, [selectedCareIds.length, locationConfirmed, address, loadNurses, pin]);

  const cancelReq = async (id) => {
    try {
      await api.post(`/requests/${id}/cancel`);
      toast('Request cancelled');
      loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    }
  };

  const primaryCtaClass =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:from-brand-700 hover:to-brand-800 hover:shadow-xl hover:shadow-brand-700/25 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-45';

  const sectionLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-400/90';
  const mainPanelClass = 'rounded-3xl glass-panel p-5 sm:p-7 space-y-6';
  const columnCardClass =
    'rounded-2xl border border-glass-border/60 bg-glass/50 backdrop-blur-xl shadow-glass overflow-hidden min-w-0 flex flex-col min-h-[11rem] lg:min-h-[min(360px,52vh)]';
  const columnHeaderClass =
    'flex items-start gap-3 px-4 py-3.5 bg-glass-elevated/35 border-b border-glass-border/50 shrink-0';
  const modalShellClass =
    'w-full rounded-3xl border border-glass-border/60 bg-glass-elevated/95 backdrop-blur-xl shadow-glass overflow-hidden';

  const closeRequestDetails = () => setSelectedRequest(null);
  const closeOtpPopup = () => setOtpPopup(null);
  const chooseServiceType = (st) => {
    setMainPanel('book');
    setCareTab('homecare');
    handleServiceTypeChange(st, { openCategory: true });
  };
  const chooseMarketingService = (service) => {
    setMainPanel('book');
    setCareTab('homecare');
    const st = serviceTypeForMarketingService(service);
    handleServiceTypeChange(st, { openCategory: true });
    setReasonQuery(service.laymanName);
  };
  const handleCareTabChange = useCallback((tab) => {
    setMainPanel('book');
    setCareTab(tab);
  }, []);

  const openBotAssistant = useCallback(() => {
    setMainPanel('book');
    setCareTab('bot');
  }, []);

  const handleEmergencyActivate = useCallback(async () => {
    try {
      const { data } = await api.post('/auth/me/emergency-alert');
      const parts = [];
      if (data?.guardians?.length) parts.push(`${data.guardians.length} guardian(s)`);
      if (data?.admins?.length) parts.push(`${data.admins.length} admin(s)`);
      if (data?.registeredContacts?.length) {
        parts.push(`${data.registeredContacts.length} emergency contact(s)`);
      }
      const summary = parts.length ? parts.join(', ') : 'your care team';
      if (data.notified) {
        toast.success(`SOS alert sent to ${summary}`);
      } else {
        toast.success('Emergency alert recorded');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not send emergency alert');
    } finally {
      setMainPanel('book');
      setCareTab('homecare');
      handleServiceTypeChange('emergency', { openCategory: true });
    }
  }, [handleServiceTypeChange]);
  const handleNavPanel = useCallback((panel) => {
    if (panel === 'services') {
      setMainPanel('book');
      setCareTab('services');
      return;
    }
    setMainPanel(panel);
    if (panel === 'book') setCareTab('homecare');
  }, []);
  const selectSavedAddress = (item) => {
    if (!item?.coordinates) return;
    setPin([...item.coordinates]);
    setAddress(item.label);
    setLocationConfirmed(true);
    setSelectedNurse(null);
    loadNurses(item.coordinates);
  };
  const saveAddressFromModal = (payload) => {
    const normalized = normalizeSavedAddress({
      id: `${Date.now()}`,
      ...payload,
    });
    if (!normalized?.label) {
      toast.error('Complete the address details');
      return;
    }
    const existing = savedAddresses.find((item) => item.label === normalized.label);
    if (existing) {
      toast('Address already saved');
      selectSavedAddress(existing);
    } else {
      setSavedAddresses((prev) => [...prev, normalized]);
      selectSavedAddress(normalized);
      toast.success('Address saved');
    }
    setAddressModalOpen(false);
  };
  const rescheduleVisit = (request) => {
    if (!request) return;
    const st = request.serviceType || 'nurse_visit';
    setServiceType(st);
    setBookingCategory(st);
    setMainPanel('book');
    setSelectedCareIds([]);
    setReasonQuery('');
    if (request.location?.coordinates) {
      setPin([...request.location.coordinates]);
      setAddress(request.location.address || '');
      setLocationConfirmed(Boolean(request.location.address));
      loadNurses(request.location.coordinates);
    }
    if (request.nurse) {
      setSelectedNurse(request.nurse);
    }
    closeRequestDetails();
    toast.success('Service and provider selected for rescheduling');
  };

  const selectedRequestMap = useMemo(() => {
    if (!selectedRequest) return null;
    const patientCoords = selectedRequest.location?.coordinates;
    if (!patientCoords) return null;
    const nurseCoords =
      liveNurseLoc[selectedRequest._id] || selectedRequest.nurse?.location?.coordinates || null;
    const markers = [
      {
        id: `selected-patient-${selectedRequest._id}`,
        type: 'user',
        coordinates: patientCoords,
        popup: (
          <div>
            <b>Service location</b>
            <div className="text-xs truncate max-w-[220px]">{selectedRequest.location?.address}</div>
          </div>
        ),
      },
    ];
    if (nurseCoords && selectedRequest.nurse) {
      markers.push({
        id: `selected-nurse-${selectedRequest._id}`,
        type: 'nurse',
        coordinates: nurseCoords,
        popup: (
          <div>
            <b>{selectedRequest.nurse.name}</b>
            <div className="text-xs capitalize">
              {selectedRequest.serviceType === 'emergency' ? 'Ambulance / emergency provider' : selectedRequest.status.replace('_', ' ')}
            </div>
          </div>
        ),
      });
    }
    const lines =
      nurseCoords && selectedRoute
        ? [
            {
              id: `selected-route-${selectedRequest._id}`,
              coords: selectedRoute.coords,
              color: selectedRequest.status === 'on_the_way' ? '#0a9bf0' : '#13c296',
              dashed: selectedRequest.status === 'in_progress',
            },
          ]
        : nurseCoords
          ? [
              {
                id: `selected-route-fallback-${selectedRequest._id}`,
                coords: [nurseCoords, patientCoords],
                color: '#94a3b8',
                dashed: true,
                opacity: 0.6,
              },
            ]
          : [];
    const center = nurseCoords
      ? [(nurseCoords[0] + patientCoords[0]) / 2, (nurseCoords[1] + patientCoords[1]) / 2]
      : patientCoords;
    return { markers, lines, center };
  }, [selectedRequest, liveNurseLoc, selectedRoute]);

  const overlayRequestMap = useMemo(() => {
    if (!locationOverlayRequest) return null;
    const patientCoords = locationOverlayRequest.location?.coordinates;
    if (!patientCoords) return null;
    const nurseCoords =
      liveNurseLoc[locationOverlayRequest._id] || locationOverlayRequest.nurse?.location?.coordinates || null;
    const route = routes[locationOverlayRequest._id];
    const markers = [
      {
        id: `overlay-patient-${locationOverlayRequest._id}`,
        type: 'user',
        coordinates: patientCoords,
        popup: <b>You</b>,
      },
    ];
    if (nurseCoords && locationOverlayRequest.nurse) {
      markers.push({
        id: `overlay-nurse-${locationOverlayRequest._id}`,
        type: 'nurse',
        coordinates: nurseCoords,
        popup: <b>{locationOverlayRequest.nurse.name}</b>,
      });
    }
    const lines =
      nurseCoords && route
        ? [
            {
              id: `overlay-route-${locationOverlayRequest._id}`,
              coords: route.coords,
              color: locationOverlayRequest.status === 'on_the_way' ? '#0a9bf0' : '#13c296',
              dashed: locationOverlayRequest.status === 'in_progress',
            },
          ]
        : nurseCoords
          ? [
              {
                id: `overlay-fallback-${locationOverlayRequest._id}`,
                coords: [nurseCoords, patientCoords],
                color: '#94a3b8',
                dashed: true,
                opacity: 0.6,
              },
            ]
          : [];
    const center = nurseCoords
      ? [(nurseCoords[0] + patientCoords[0]) / 2, (nurseCoords[1] + patientCoords[1]) / 2]
      : patientCoords;
    return { markers, lines, center, route };
  }, [locationOverlayRequest, liveNurseLoc, routes]);

  const addressControl = (
    <DashboardAddressBar
      compact
      narrow
      userName={user?.name}
      displayAddress={
        locationConfirmed && address ? address : 'Add a delivery address for this visit'
      }
      savedAddresses={savedAddresses}
      selectedLabel={locationConfirmed ? address : ''}
      onSelectAddress={selectSavedAddress}
      onAddClick={() => setAddressModalOpen(true)}
      pickerOpen={addressPickerOpen}
      onPickerOpenChange={setAddressPickerOpen}
    />
  );

  return (
    <div className="app-page min-h-full">
      <BotFloatingPopup onOpen={openBotAssistant} />
      <div className="page-shell-wide">
        <PatientDashboardSubHeader
          addressControl={addressControl}
          onEmergencyActivate={handleEmergencyActivate}
        />

        <PatientDashboardCareTabs
          activeTab={mainPanel === 'book' ? careTab : null}
          onTabChange={handleCareTabChange}
        />

        <div className="dashboard-layout">
          <PatientDashboardRail
            sidebarExpanded={sidebarExpanded}
            onToggleSidebar={() => setSidebarExpanded((open) => !open)}
            mainPanel={mainPanel}
            careTab={careTab}
            onNavPanel={handleNavPanel}
            location={location}
            profileComplete={profileComplete}
            activeRequestCount={activeRequestCount}
          />

        <div className="dashboard-main max-w-7xl">
          {mainPanel === 'book' && careTab === 'services' && (
            <div className={mainPanelClass}>
              <div>
                <p className={sectionLabelClass}>Services</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Choose the care you want to book
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted leading-relaxed">
                  Open a care group, choose a sub-service, then continue with visit focus, caregiver, and location.
                </p>
              </div>

              <div className="space-y-3">
                {serviceSections.map((section) => {
                  const SectionIcon = section.Icon;
                  const open = expandedServiceSectionId === section.id;
                  return (
                    <div
                      key={section.id}
                      className={`rounded-2xl border transition-all duration-200 ${
                        open
                          ? 'border-brand-500/45 bg-brand-500/10 shadow-lg shadow-brand-600/10'
                          : 'border-glass-border/60 bg-glass/45'
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedServiceSectionId(open ? null : section.id)}
                        className="flex w-full items-center gap-3 p-4 text-left"
                        aria-expanded={open}
                      >
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${section.accent}`}>
                          <SectionIcon className="w-5 h-5" strokeWidth={2} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-foreground">{section.title}</span>
                          <span className="mt-1 block text-sm text-muted leading-relaxed">{section.tagline}</span>
                        </span>
                        <ChevronDown
                          className={`w-5 h-5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </button>

                      {open && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-3 pb-3">
                          {section.services.map((service) => {
                            const ServiceIcon = SERVICE_ICONS[service.id] || SectionIcon;
                            const selected = reasonQuery === service.laymanName;
                            return (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => chooseMarketingService(service)}
                                className={`group flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                                  selected
                                    ? 'border-brand-500/60 bg-brand-500/15 text-foreground'
                                    : 'border-glass-border/50 bg-glass/35 hover:border-brand-500/40 hover:bg-glass-elevated/45'
                                }`}
                              >
                                {service.imageSrc ? (
                                  <img
                                    src={service.imageSrc}
                                    alt=""
                                    className="mt-0.5 h-11 w-11 shrink-0 rounded-xl border border-glass-border/60 object-cover"
                                  />
                                ) : (
                                  <span
                                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                                      selected
                                        ? 'border-brand-500/40 bg-brand-600 text-white'
                                        : 'border-glass-border/60 bg-glass/50 text-muted group-hover:text-foreground'
                                    }`}
                                  >
                                    <ServiceIcon className="w-4 h-4" strokeWidth={2} aria-hidden />
                                  </span>
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-2 font-semibold text-foreground">
                                    {service.laymanName}
                                    {selected && <Check className="w-3.5 h-3.5 text-brand-300" aria-hidden />}
                                  </span>
                                  <span className="mt-1 block text-xs text-muted leading-relaxed">
                                    {service.tagline}
                                  </span>
                                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-300">
                                    Select sub-service
                                    <ChevronRight className="w-3.5 h-3.5" aria-hidden />
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {mainPanel === 'book' && careTab === 'homecare' && (
            <div className="min-w-0">
              <VisitBookingFlow
                serviceType={serviceType}
                activeCategory={bookingCategory}
                onActiveCategoryChange={setBookingCategory}
                onServiceTypeChange={handleServiceTypeChange}
                bookingCopy={bookingCopy}
                sectionLabelClass={sectionLabelClass}
                catalogForBooking={catalogForBooking}
                filteredReasonOptions={filteredReasonOptions}
                allSuggestionCards={allSuggestionCards}
                selectedCareIds={selectedCareIds}
                onSuggestionCardSelect={onSuggestionCardSelect}
                hasChosenVisitFocus={hasChosenVisitFocus}
                filteredCaregivers={filteredCaregivers}
                locationConfirmed={locationConfirmed}
                kindBadge={kindBadge}
                initialsFromName={initialsFromName}
                onContinueToCart={handleNurseContinueToCart}
                onFloatingContinueToCart={handleContinueToCartFromPicker}
                selectedCaregiver={caregiverForActiveTab || selectedNurse}
                onOpenCaregiverPicker={openCaregiverPicker}
              />
              <CaregiverPickerModal
                open={caregiverPickerOpen}
                onClose={() => setCaregiverPickerOpen(false)}
                nurses={nurses}
                cartItems={cartItems.filter(
                  (i) => (i.serviceType || 'nurse_visit') === serviceType
                )}
                serviceType={serviceType}
                selectedId={caregiverForActiveTab?._id ?? selectedNurse?._id}
                onSelect={handlePickerSelectCaregiver}
                closeOnSelect={false}
                footerLabel="Continue to cart"
                onFooterAction={handleContinueToCartFromPicker}
                emptyMessage={
                  locationConfirmed
                    ? bookingCopy.nearbyEmptyConfirmed
                    : bookingCopy.nearbyEmptyUnconfirmed
                }
              />
            </div>
          )}

          {mainPanel === 'book' && careTab === 'wellness' && (
            <div className={mainPanelClass}>
              <div>
                <p className={sectionLabelClass}>Wellness</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  Body, mind, and lifestyle care
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted leading-relaxed">
                  Preventive check-ins, mental wellness, nutrition, and recovery programs tailored for home and clinic.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {serviceSections
                  .filter((s) => s.id === 'thrive-well' || s.formerName === 'Wellness')
                  .flatMap((section) =>
                    section.services.map((service) => (
                      <button
                        key={`${section.id}-${service.id}`}
                        type="button"
                        onClick={() => chooseMarketingService(service)}
                        className="rounded-2xl border border-glass-border/60 bg-glass/45 p-4 text-left hover:border-brand-500/45 hover:bg-brand-500/10 transition-all"
                      >
                        <p className="text-sm font-semibold text-foreground">{service.laymanName}</p>
                        <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">{service.description}</p>
                      </button>
                    ))
                  )}
              </div>
            </div>
          )}

          {mainPanel === 'book' && careTab === 'health_monitor' && (
            <div className={mainPanelClass}>
              <div>
                <p className={sectionLabelClass}>Health monitor</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Home safety monitoring</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted leading-relaxed">
                  Fall detection, wellness alerts, and live monitoring status from your connected devices.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/dashboard/alerts" className="btn-primary">
                  View safety alerts
                </Link>
                <button type="button" className="btn-outline" onClick={() => setCareTab('homecare')}>
                  Book a home visit
                </button>
              </div>
            </div>
          )}

          {mainPanel === 'book' && careTab === 'bot' && (
            <div className={mainPanelClass}>
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white border-2 border-brand-600 shadow-lg shadow-brand-600/20 overflow-hidden p-1">
                  <BotAvatar className="w-full h-full" />
                </span>
                <div>
                  <p className={sectionLabelClass}>Care assistant</p>
                  <h1 className="mt-1 text-xl font-semibold text-foreground">How can I help today?</h1>
                  <p className="mt-1 text-sm text-muted">Ask about bookings, services, or your upcoming visits.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-glass-border/60 bg-glass/30 p-4 min-h-[12rem] text-sm text-muted">
                Chat assistant coming soon. Use Homecare to book nurse, doctor, physio, or emergency visits.
              </div>
            </div>
          )}

          {mainPanel === 'tracking' && (
            <div className={mainPanelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={sectionLabelClass}>Live tracking</p>
                  <h2 className="text-lg font-semibold text-foreground mt-1">Route map</h2>
                </div>
                {trackableRequests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowLiveTrackingGraph((v) => !v)}
                    className="btn-outline text-sm px-4 py-2"
                  >
                    {showLiveTrackingGraph ? 'Hide graph' : 'View graph'}
                  </button>
                )}
              </div>
              {trackableRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-glass-border/60 bg-glass/25 px-6 py-12 text-center text-sm text-muted leading-relaxed">
                  Nothing to track yet. When a caregiver accepts your booking and is on the way, use View graph here to
                  follow the live map.
                </div>
              ) : showLiveTrackingGraph ? (
                <div className="rounded-2xl border border-glass-border/60 bg-glass/30 overflow-hidden p-2">
                  <MapView
                    center={trackingCenter}
                    markers={trackingMarkers}
                    routes={trackingPolylines}
                    height="280px"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Tap <span className="font-medium text-foreground">View graph</span> to load the map.
                </p>
              )}
            </div>
          )}

          {mainPanel === 'requests' && (
            <div className="rounded-3xl border border-glass-border/60 bg-slate-950/35 p-4 sm:p-5 space-y-4 shadow-glass">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className={sectionLabelClass}>History</p>
                  <h2 className="text-base font-semibold text-foreground mt-1">Your requests</h2>
                </div>
                <span className="text-[11px] text-muted tabular-nums">
                  {requests.length} request{requests.length === 1 ? '' : 's'}
                </span>
              </div>
              {requests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-glass-border/60 bg-glass/25 px-6 py-12 text-center text-muted text-sm">
                  No requests yet. Book care from the Visit focus section on your dashboard.
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5 list-none p-0 m-0" aria-label="Requests newest first">
                  {requestsByLatest.map((r) => {
                    const route = routes[r._id];
                    const isActive = ACTIVE_STATUSES.includes(r.status);
                    const duration = visitDurationLabel(r);
                    return (
                      <li
                        key={r._id}
                        className="rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 shadow-sm shadow-black/10 hover:border-brand-500/30 hover:bg-white/[0.07] transition-all cursor-pointer"
                        onClick={() => setSelectedRequest(r)}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold capitalize text-foreground">
                              Purpose: {servicePurposeLabel(r)}
                            </div>
                            {r.feeAmount != null && (
                              <div className="mt-1 text-[11px] text-emerald-300 font-semibold">
                                Paid {fmtInr(r.feeAmount)} (demo)
                              </div>
                            )}
                            {duration && (
                              <div className="mt-1 text-[11px] text-brand-300 font-semibold">
                                Service time: {duration}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-muted/70 tabular-nums shrink-0">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted mt-2 leading-relaxed line-clamp-2">
                          <span className="font-semibold text-foreground/80">Location:</span>{' '}
                          {r.location?.address || 'Service location'}
                        </div>
                        {r.nurse && (
                          <div className="text-xs mt-2 text-foreground/85 truncate">
                            With <span className="font-semibold">{r.nurse.name}</span> Â· {r.nurse.specialization}
                            {r.nurse.phone && <> Â· {r.nurse.phone}</>}
                          </div>
                        )}

                        {isActive && r.nurse && (
                          <div className="mt-3 rounded-xl bg-brand-500/10 border border-brand-500/25 p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-9 h-9 rounded-xl bg-brand-600 grid place-items-center text-white shrink-0 shadow-inner">
                                {r.status === 'on_the_way' ? (
                                  <Car className="w-4 h-4" strokeWidth={2} aria-hidden />
                                ) : r.status === 'in_progress' ? (
                                  <Stethoscope className="w-4 h-4" strokeWidth={2} aria-hidden />
                                ) : (
                                  <CircleCheck className="w-4 h-4" strokeWidth={2} aria-hidden />
                                )}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-foreground">
                                  {r.status === 'on_the_way'
                                    ? 'On the way'
                                    : r.status === 'in_progress'
                                      ? 'Visit in progress'
                                      : 'Accepted'}
                                </div>
                                <div className="text-[11px] text-muted mt-0.5">
                                  {r.status === 'in_progress'
                                    ? 'Nurse has reached your location'
                                    : route
                                      ? `${route.distanceKm.toFixed(1)} km Â· ETA ${formatEta(route.durationMin)}`
                                      : 'Calculating route...'}
                                </div>
                              </div>
                            </div>
                            {route && r.status !== 'in_progress' && (
                              <div className="text-right shrink-0">
                                <div className="text-xl font-bold text-brand-300 leading-none tabular-nums">
                                  {Math.round(route.durationMin)}
                                </div>
                                <div className="text-[9px] uppercase tracking-wide text-brand-300/70 font-semibold mt-1">
                                  min
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {r.notes && (
                          <div className="text-xs text-muted mt-2 italic leading-relaxed line-clamp-2">&quot;{r.notes}&quot;</div>
                        )}
                        {(r.pendingOtp?.otp || r.pendingOtp?.active) && (
                          <div className="mt-3 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-300">
                              {r.pendingOtp.purpose === 'start_visit' ? 'Start visit OTP' : 'Complete visit OTP'}
                            </p>
                            {r.pendingOtp.otp ? (
                              <p className="text-base font-bold tracking-[0.24em] text-foreground tabular-nums mt-1">
                                {r.pendingOtp.otp}
                              </p>
                            ) : (
                              <p className="text-xs text-muted mt-1">
                                OTP pending — share the code from your notification with the nurse, or ask them to resend.
                              </p>
                            )}
                          </div>
                        )}
                        <div className="mt-3 flex justify-end items-center gap-3 pt-2.5 border-t border-white/10">
                          {!['completed', 'cancelled'].includes(r.status) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelReq(r._id);
                              }}
                              className="mr-auto text-rose-300 text-xs font-medium hover:text-rose-200 hover:underline"
                            >
                              Cancel
                            </button>
                          )}
                          <StatusBadge status={r.status} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
      {locationOverlayRequest && (
        <div className="fixed inset-0 z-[75] bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <p className={sectionLabelClass}>Live tracking</p>
                <h3 className="text-base font-semibold text-foreground mt-1">Assigned caregiver</h3>
              </div>
              <button
                type="button"
                onClick={closeLocationOverlay}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 text-muted hover:text-foreground hover:bg-slate-50"
                aria-label="Close location"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                {locationOverlayRequest.nurse ? (
                  <p className="text-sm text-foreground/90">
                    <span className="font-semibold">{locationOverlayRequest.nurse.name}</span>
                    {locationOverlayRequest.nurse.specialization
                      ? ` Â· ${locationOverlayRequest.nurse.specialization}`
                      : ''}
                    {locationOverlayRequest.nurse.phone ? ` Â· ${locationOverlayRequest.nurse.phone}` : ''}
                  </p>
                ) : (
                  <p className="text-sm text-muted">Caregiver not assigned yet.</p>
                )}
                {locationOverlayRequest.status === 'in_progress' ? (
                  <p className="text-xs text-emerald-700 mt-1 font-semibold">
                    Nurse has reached your location
                  </p>
                ) : overlayRequestMap?.route ? (
                  <p className="text-xs text-muted mt-1">
                    {overlayRequestMap.route.distanceKm.toFixed(1)} km Â· ETA{' '}
                    {formatEta(overlayRequestMap.route.durationMin)}
                  </p>
                ) : (
                  <p className="text-xs text-muted mt-1">Calculating route...</p>
                )}
              </div>
              {overlayRequestMap && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <MapView
                    center={overlayRequestMap.center}
                    markers={overlayRequestMap.markers}
                    routes={overlayRequestMap.lines}
                    height="300px"
                  />
                </div>
              )}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={closeLocationOverlay} className="btn-outline text-sm px-4 py-2">
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(locationOverlayRequest);
                    closeLocationOverlay();
                  }}
                  className="btn-primary text-sm px-4 py-2"
                >
                  View full visit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <p className={sectionLabelClass}>Visit details</p>
                <h3 className="text-base font-semibold text-white mt-0.5 capitalize">
                  {servicePurposeLabel(selectedRequest)}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeRequestDetails}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                aria-label="Close visit details"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <div className="px-4 sm:px-5 py-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedRequest.status} />
                {selectedRequest.feeAmount != null && (
                  <span className="text-xs text-emerald-300 font-semibold">
                    Paid {fmtInr(selectedRequest.feeAmount)} (demo)
                  </span>
                )}
                {visitDurationLabel(selectedRequest) && (
                  <span className="text-xs text-brand-300 font-semibold">
                    Service time: {visitDurationLabel(selectedRequest)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-3">
                <div className="space-y-2 text-sm text-white/90">
                  {selectedRequest.nurse && (
                    <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 p-3">
                      <p className={sectionLabelClass}>
                        {selectedRequest.serviceType === 'emergency' ? 'Ambulance / emergency details' : 'Assigned provider'}
                      </p>
                      <div className="mt-2 flex items-start gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white text-xs font-bold">
                          {initialsFromName(selectedRequest.nurse.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">{selectedRequest.nurse.name}</p>
                          <p className="mt-0.5 text-xs text-white/65">
                            {selectedRequest.nurse.specialization || 'Home care professional'}
                          </p>
                          <div className="mt-1.5 grid gap-0.5 text-xs text-white/75">
                            {selectedRequest.nurse.phone && (
                              <span>
                                {selectedRequest.serviceType === 'emergency' ? 'Ambulance number' : 'Phone'}:{' '}
                                <span className="font-semibold text-white">{selectedRequest.nurse.phone}</span>
                              </span>
                            )}
                            {selectedRequest.nurse.email && (
                              <span>
                                Email: <span className="font-semibold text-white">{selectedRequest.nurse.email}</span>
                              </span>
                            )}
                            {selectedRequest.nurse.rating != null && (
                              <span>
                                Rating:{' '}
                                <span className="font-semibold text-white">
                                  {Number(selectedRequest.nurse.rating).toFixed(1)}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedRequest.notes && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <p className={sectionLabelClass}>Purpose note</p>
                      <p className="mt-1 italic text-white/65 line-clamp-2">&quot;{selectedRequest.notes}&quot;</p>
                    </div>
                  )}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className={sectionLabelClass}>Visit location</p>
                    <p className="mt-1 text-white/75 line-clamp-3">
                      {selectedRequest.location?.address || 'Service location'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className={sectionLabelClass}>Requested at</p>
                    <p className="mt-1 text-white/75">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  </div>
                  {visitDurationLabel(selectedRequest) && (
                    <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 p-3">
                      <p className={sectionLabelClass}>Service duration</p>
                      <p className="mt-1 text-white/80">
                        {visitDurationLabel(selectedRequest)}
                        <span className="block text-xs text-white/50 mt-0.5">
                          From start OTP to completion OTP
                        </span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 space-y-2.5">
                  <p className={sectionLabelClass}>
                    {selectedRequest.status === 'in_progress' ? 'Visit status' : 'Distance and ETA'}
                  </p>
                  {selectedRequest.status === 'in_progress' ? (
                    <p className="text-sm font-semibold text-emerald-300">
                      Nurse has reached your location
                    </p>
                  ) : selectedRoute ? (
                    <p className="text-sm text-white/80">
                      <span className="font-semibold text-brand-300">{selectedRoute.distanceKm.toFixed(1)} km</span>
                      {' '}away Â· ETA <span className="font-semibold">{formatEta(selectedRoute.durationMin)}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted">
                      {selectedRequest.nurse ? 'Calculating route...' : 'Provider not assigned yet.'}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                      <p className="font-semibold text-brand-300">From</p>
                      <p className="mt-1 text-white/70 line-clamp-2">
                        {selectedRequest.nurse?.location?.address ||
                          selectedRequest.nurse?.specialization ||
                          'Provider location'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2">
                      <p className="font-semibold text-emerald-300">To</p>
                      <p className="mt-1 text-white/70 line-clamp-2">
                        {selectedRequest.location?.address || 'Service location'}
                      </p>
                    </div>
                  </div>
                  {selectedRequestMap && (
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-900">
                      <MapView
                        center={selectedRequestMap.center}
                        markers={selectedRequestMap.markers}
                        routes={selectedRequestMap.lines}
                        height="210px"
                      />
                    </div>
                  )}
                  {(selectedRequest?.pendingOtp?.otp || selectedRequest?.pendingOtp?.active) && (
                    <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-300">
                        {selectedRequest.pendingOtp.purpose === 'start_visit'
                          ? 'Start visit OTP'
                          : 'Complete visit OTP'}
                      </p>
                      {selectedRequest.pendingOtp.otp ? (
                        <p className="text-xl font-bold tracking-[0.24em] text-white tabular-nums mt-1">
                          {selectedRequest.pendingOtp.otp}
                        </p>
                      ) : (
                        <p className="text-sm text-muted mt-1">
                          OTP pending — check your notification or ask the nurse to resend.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => rescheduleVisit(selectedRequest)}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Reschedule visit
                </button>
                <button type="button" onClick={closeRequestDetails} className="btn-outline text-sm px-4 py-2">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {otpPopup && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-md rounded-3xl border border-brand-200/80 bg-white shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <p className={sectionLabelClass}>OTP verification</p>
                <h3 className="text-lg font-semibold text-foreground mt-1">
                  {otpPopup.purpose === 'start_visit' ? 'Start visit OTP' : 'Complete visit OTP'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeOtpPopup}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 text-muted hover:text-foreground hover:bg-slate-50"
                aria-label="Close OTP popup"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-muted leading-relaxed">
                Share this OTP with the assigned service provider to continue.
              </p>
              <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-4 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">
                  One-time password
                </div>
                <div className="mt-2 text-3xl font-bold tracking-[0.3em] text-brand-900 tabular-nums">
                  {otpPopup.otp}
                </div>
              </div>
              {otpPopup.requestId && (
                <p className="text-[11px] text-muted/70 break-all">Request ID: {otpPopup.requestId}</p>
              )}
              <div className="flex justify-end">
                <button type="button" onClick={closeOtpPopup} className="btn-outline text-sm px-4 py-2">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <AddAddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSave={saveAddressFromModal}
        initialPin={pin}
      />
  </div>
  );
};

export default UserDashboard;
