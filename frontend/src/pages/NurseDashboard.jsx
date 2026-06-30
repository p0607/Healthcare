import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Briefcase,
  Bell,
  CheckCircle2,
  History,
  LayoutDashboard,
  MapPin,
  Settings,
  UserCircle2,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import MapView from '../components/MapView.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { getRoute, formatEta, haversineKm } from '../lib/route';
import { useAuth } from '../context/AuthContext.jsx';
import { startCaregiverLocationWatch } from '../lib/caregiverLocationTracking';

const ACTIVE_STATUSES = ['accepted', 'on_the_way', 'in_progress'];
const GPS_TRACKING_STATUSES = ['on_the_way', 'in_progress'];
const NURSE_MENU_ITEMS = [
  { id: 'profile', label: 'Profile', Icon: UserCircle2 },
  { id: 'active_jobs', label: 'Active Jobs', Icon: Briefcase },
  { id: 'alerts', label: 'Safety alerts', Icon: Bell, path: '/nurse/alerts' },
  { id: 'history', label: 'History', Icon: History },
  { id: 'settings', label: 'Settings', Icon: Settings },
  { id: 'payment', label: 'Payment', Icon: Wallet },
];

const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

const fmtJobDate = (r) => {
  const d = r.updatedAt || r.createdAt;
  return d ? new Date(d).toLocaleDateString() : '—';
};

const servicePurposeLabel = (request) => request?.serviceType?.replace(/_/g, ' ') || 'Service visit';

const visitDurationLabel = (request) => {
  if (!request?.startedAt || !request?.completedAt) return '—';
  const start = new Date(request.startedAt).getTime();
  const end = new Date(request.completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return '—';
  const totalMinutes = Math.max(1, Math.round((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const STAT_MODAL_META = {
  completed: { title: 'Completed jobs', empty: 'No completed jobs yet.' },
  cancelled: { title: 'Cancelled jobs', empty: 'No cancelled jobs yet.' },
  payment: { title: 'Payment generated', empty: 'No payments from completed jobs yet.' },
};

const beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.05;
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 250);
  } catch {}
};

const NurseDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const [pending, setPending] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [available, setAvailable] = useState(user?.available !== false);
  const [nursePanel, setNursePanel] = useState('dashboard');

  const [myPos, setMyPos] = useState(user?.location?.coordinates || null);
  const [routes, setRoutes] = useState({});
  const lastRouteFetch = useRef({});
  const assignedRef = useRef(assigned);
  const [showRouteGraph, setShowRouteGraph] = useState(false);
  const [statsModal, setStatsModal] = useState(null);

  const [incomingMapRequest, setIncomingMapRequest] = useState(null);
  const [incomingPreviewRoute, setIncomingPreviewRoute] = useState(null);
  const [incomingLiveKm, setIncomingLiveKm] = useState(null);
  const [modalNursePos, setModalNursePos] = useState(null);
  const incomingMapWatchRef = useRef(null);
  const lastIncomingRouteFetchRef = useRef({ at: 0, lng: null, lat: null });

  const load = async () => {
    const [{ data: p }, { data: a }] = await Promise.all([
      api.get('/requests/pending'),
      api.get('/requests/assigned'),
    ]);
    setPending(p.requests);
    setAssigned(a.requests);
    return a.requests;
  };

  useEffect(() => {
    (async () => {
      const a = await load();
      const s = getSocket();
      a.forEach((r) => {
        if (ACTIVE_STATUSES.includes(r.status) && s) s.emit('request:join', r._id);
      });
    })();
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onNew = (req) => {
      setPending((arr) => [req, ...arr.filter((r) => r._id !== req._id)]);
      beep();
      toast(`📞 New ${req.serviceType.replace('_', ' ')} request from ${req.user?.name || 'patient'}`, {
        icon: '📞',
      });
    };
    const onTaken = ({ id }) => setPending((arr) => arr.filter((r) => r._id !== id));
    const onDirectBooking = (req) => {
      const sock = getSocket();
      if (sock && req?._id) sock.emit('request:join', req._id);
      load();
      toast.success('New paid booking assigned to you');
    };
    s.on('request:new', onNew);
    s.on('request:taken', onTaken);
    s.on('request:assigned-direct', onDirectBooking);
    return () => {
      s.off('request:new', onNew);
      s.off('request:taken', onTaken);
      s.off('request:assigned-direct', onDirectBooking);
    };
  }, []);

  useEffect(() => {
    assignedRef.current = assigned;
  }, [assigned]);

  useEffect(() => {
    return startCaregiverLocationWatch({
      enabled: available,
      getAssigned: () => assignedRef.current,
      gpsTrackingStatuses: GPS_TRACKING_STATUSES,
      getSavedCoordinates: () => user?.location?.coordinates,
      onCoords: setMyPos,
      onPersisted: (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('nc_user', JSON.stringify(updatedUser));
      },
    });
  }, [available, setUser, user?.location?.coordinates]);

  useEffect(() => {
    if (!myPos) return;
    assigned
      .filter((r) => ACTIVE_STATUSES.includes(r.status))
      .forEach((r) => {
        const last = lastRouteFetch.current[r._id] || 0;
        if (Date.now() - last < 15000 && routes[r._id]) return;
        lastRouteFetch.current[r._id] = Date.now();
        getRoute(myPos, r.location.coordinates).then((route) => {
          if (route) setRoutes((m) => ({ ...m, [r._id]: route }));
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPos, assigned]);

  const openIncomingMap = (request) => {
    if (myPos) setModalNursePos(myPos);
    setIncomingMapRequest(request);
    setIncomingPreviewRoute(null);
    lastIncomingRouteFetchRef.current = { at: 0, lng: null, lat: null };
  };

  const closeIncomingMap = () => {
    setIncomingMapRequest(null);
    setIncomingPreviewRoute(null);
    setIncomingLiveKm(null);
    setModalNursePos(null);
    lastIncomingRouteFetchRef.current = { at: 0, lng: null, lat: null };
  };

  const nurseCoords = modalNursePos || myPos;
  const nurseLng = nurseCoords?.[0];
  const nurseLat = nurseCoords?.[1];
  const patientCoords = incomingMapRequest?.location?.coordinates;
  const patientLng = patientCoords?.[0];
  const patientLat = patientCoords?.[1];

  useEffect(() => {
    if (!incomingMapRequest) {
      if (incomingMapWatchRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(incomingMapWatchRef.current);
        incomingMapWatchRef.current = null;
      }
      return;
    }
    if (myPos) setModalNursePos(myPos);
    if (available && myPos) return undefined;

    if (!navigator.geolocation) return undefined;

    navigator.geolocation.getCurrentPosition(
      (pos) => setModalNursePos([pos.coords.longitude, pos.coords.latitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    incomingMapWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => setModalNursePos([pos.coords.longitude, pos.coords.latitude]),
      (err) => console.warn('incoming map geolocation:', err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );

    return () => {
      if (incomingMapWatchRef.current != null) {
        navigator.geolocation.clearWatch(incomingMapWatchRef.current);
        incomingMapWatchRef.current = null;
      }
    };
  }, [incomingMapRequest, myPos, available]);

  useEffect(() => {
    if (nurseLng == null || nurseLat == null || patientLng == null || patientLat == null) {
      setIncomingLiveKm(null);
      return;
    }
    setIncomingLiveKm(haversineKm([nurseLng, nurseLat], [patientLng, patientLat]));
  }, [nurseLng, nurseLat, patientLng, patientLat]);

  useEffect(() => {
    if (!incomingMapRequest || nurseLng == null || nurseLat == null || patientLng == null || patientLat == null) {
      setIncomingPreviewRoute(null);
      return undefined;
    }

    const from = [nurseLng, nurseLat];
    const to = [patientLng, patientLat];
    let cancelled = false;

    const run = () => {
      const now = Date.now();
      const last = lastIncomingRouteFetchRef.current;
      const movedKm = last.lng == null ? Infinity : haversineKm([last.lng, last.lat], from);
      if (now - last.at < 10_000 && movedKm < 0.08) return;
      lastIncomingRouteFetchRef.current = { at: now, lng: nurseLng, lat: nurseLat };
      getRoute(from, to).then((route) => {
        if (!cancelled && route) setIncomingPreviewRoute(route);
      });
    };

    run();
    const timer = setInterval(run, 12_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [incomingMapRequest, nurseLng, nurseLat, patientLng, patientLat]);

  useEffect(() => {
    if (incomingMapRequest && myPos) setModalNursePos(myPos);
  }, [incomingMapRequest, myPos]);

  const incomingPopupMap = useMemo(() => {
    if (!incomingMapRequest?.location?.coordinates) return null;
    const patient = incomingMapRequest.location.coordinates;
    const mks = [
      {
        id: `incoming-patient-${incomingMapRequest._id}`,
        type: 'request',
        coordinates: patient,
        popup: (
          <div>
            <b>Patient — {incomingMapRequest.user?.name || 'User'}</b>
            <div className="text-xs max-w-[220px] text-muted mt-0.5">{incomingMapRequest.location?.address}</div>
            {incomingLiveKm != null ? (
              <div className="text-xs font-semibold text-brand-400 mt-1">
                {incomingLiveKm.toFixed(1)} km away (live GPS)
              </div>
            ) : null}
          </div>
        ),
      },
    ];
    const lines = [];
    let center = patient;
    if (nurseCoords && incomingPreviewRoute?.coords?.length) {
      mks.push({
        id: 'incoming-me',
        type: 'nurse',
        coordinates: nurseCoords,
        popup: (
          <div>
            <b>You (caregiver)</b>
            {incomingLiveKm != null ? (
              <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                {incomingLiveKm.toFixed(1)} km from patient
              </div>
            ) : null}
          </div>
        ),
      });
      lines.push({ id: 'incoming-route', coords: incomingPreviewRoute.coords, color: '#0a9bf0' });
      center = [(nurseCoords[0] + patient[0]) / 2, (nurseCoords[1] + patient[1]) / 2];
    } else if (nurseCoords) {
      mks.push({
        id: 'incoming-me',
        type: 'nurse',
        coordinates: nurseCoords,
        popup: (
          <div>
            <b>You (caregiver)</b>
            {incomingLiveKm != null ? (
              <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                {incomingLiveKm.toFixed(1)} km from patient
              </div>
            ) : null}
          </div>
        ),
      });
      lines.push({
        id: 'incoming-fallback',
        coords: [nurseCoords, patient],
        color: '#0a9bf0',
        dashed: true,
        opacity: 0.85,
      });
      center = [(nurseCoords[0] + patient[0]) / 2, (nurseCoords[1] + patient[1]) / 2];
    }
    return { markers: mks, polylines: lines, center };
  }, [incomingMapRequest, nurseCoords, incomingPreviewRoute, incomingLiveKm]);

  const accept = async (id) => {
    try {
      const { data } = await api.post(`/requests/${id}/accept`);
      const s = getSocket();
      if (s) s.emit('request:join', data.request._id);
      toast.success('Request accepted · you are on the way');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      if (status === 'in_progress' || status === 'completed') {
        const purpose = status === 'in_progress' ? 'start_visit' : 'complete_visit';
        await api.post(`/requests/${id}/otp/send`, { purpose });
        const entered = window.prompt('Enter OTP shared by the patient');
        if (!entered) {
          toast.error('OTP entry cancelled');
          return;
        }
        await api.post(`/requests/${id}/otp/verify`, { purpose, otp: entered.trim() });
      } else {
        await api.post(`/requests/${id}/status`, { status });
      }
      toast.success(`Marked ${status.replace('_', ' ')}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed');
    }
  };

  const toggleAvailable = async () => {
    const next = !available;
    setAvailable(next);
    try {
      const { data } = await api.put('/nurses/me', { available: next });
      setUser(data.user);
      localStorage.setItem('nc_user', JSON.stringify(data.user));
      toast.success(next ? 'You are now available' : 'You are offline');
    } catch {
      setAvailable(!next);
      toast.error('Failed to update availability');
    }
  };

  const { markers, polylines, mapCenter } = useMemo(() => {
    const mks = [];
    pending.forEach((r) =>
      mks.push({
        id: r._id,
        type: 'request',
        coordinates: r.location.coordinates,
        popup: (
          <div>
            <b className="capitalize">{r.serviceType.replace('_', ' ')}</b>
            <div className="text-xs">{r.user?.name}</div>
          </div>
        ),
      })
    );
    assigned
      .filter((r) => !['completed', 'cancelled'].includes(r.status))
      .forEach((r) =>
        mks.push({
          id: r._id,
          type: 'request',
          coordinates: r.location.coordinates,
          popup: (
            <div>
              <b>{r.user?.name}</b>
              <div className="text-xs capitalize">{r.serviceType.replace('_', ' ')} · {r.status}</div>
            </div>
          ),
        })
      );
    const lines = [];
    let center = myPos || user?.location?.coordinates || [77.5946, 12.9716];
    if (myPos) {
      mks.push({ id: 'me', type: 'nurse', coordinates: myPos, popup: <b>You (live)</b> });
      assigned
        .filter((r) => GPS_TRACKING_STATUSES.includes(r.status))
        .forEach((r) => {
          const route = routes[r._id];
          lines.push(
            route
              ? {
                  id: `route-${r._id}`,
                  coords: route.coords,
                  color: r.status === 'on_the_way' ? '#0a9bf0' : '#13c296',
                  dashed: r.status === 'in_progress',
                }
              : {
                  id: `route-fallback-${r._id}`,
                  coords: [myPos, r.location.coordinates],
                  color: '#94a3b8',
                  dashed: true,
                  opacity: 0.6,
                }
          );
          center = [(myPos[0] + r.location.coordinates[0]) / 2, (myPos[1] + r.location.coordinates[1]) / 2];
        });
    }
    return { markers: mks, polylines: lines, mapCenter: center };
  }, [pending, assigned, myPos, routes, user]);

  const stats = useMemo(() => {
    const completedJobs = assigned.filter((r) => r.status === 'completed');
    const cancelledJobs = assigned.filter((r) => r.status === 'cancelled');
    return {
      completed: completedJobs.length,
      cancelled: cancelledJobs.length,
      payment: completedJobs.reduce((sum, r) => sum + Number(r.feeAmount || 0), 0),
      completedJobs,
      cancelledJobs,
      paymentJobs: completedJobs,
    };
  }, [assigned]);

  const statsModalRows = useMemo(() => {
    if (statsModal === 'completed') return stats.completedJobs;
    if (statsModal === 'cancelled') return stats.cancelledJobs;
    if (statsModal === 'payment') return stats.paymentJobs;
    return [];
  }, [statsModal, stats]);

  const jobsForPanel = useMemo(() => {
    if (nursePanel === 'history') return assigned.filter((r) => ['completed', 'cancelled'].includes(r.status));
    if (nursePanel === 'active_jobs') return assigned.filter((r) => !['completed', 'cancelled'].includes(r.status));
    return assigned;
  }, [assigned, nursePanel]);

  useEffect(() => {
    const panel = location.state?.panel;
    if (!panel) return;
    if (panel === 'settings') {
      navigate('/nurse/settings', { replace: true, state: {} });
      return;
    }
    if (panel === 'payment') {
      navigate('/nurse/payment', { replace: true, state: {} });
      return;
    }
    if (['dashboard', 'active_jobs', 'history'].includes(panel)) {
      setNursePanel(panel);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  return (
    <div className="app-page page-shell-wide">
      <div className="dashboard-layout">
        <aside className="group/sbar dashboard-sidebar">
          <nav className="flex flex-row lg:flex-col py-2 px-2 lg:px-1.5 gap-1 justify-between lg:justify-start overflow-x-auto lg:overflow-x-visible">
            <button
              type="button"
              onClick={() => setNursePanel('dashboard')}
              className={`flex items-center gap-0 mx-0 sm:mx-0.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                nursePanel === 'dashboard'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                  : 'text-muted hover:bg-glass-elevated/50 border border-transparent hover:border-glass-border/60'
              }`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${nursePanel === 'dashboard' ? 'bg-glass/40/15' : 'bg-glass/40 border border-glass-border/50'}`}>
                <LayoutDashboard className="w-[1.1rem] h-[1.1rem]" strokeWidth={2} />
              </span>
              <span className="min-w-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,padding] duration-300 ease-out lg:group-hover/sbar:max-w-[10rem] lg:group-hover/sbar:opacity-100 lg:group-hover/sbar:pr-2.5 max-w-[10rem] opacity-100 px-2 lg:max-w-0 lg:opacity-0 lg:px-0">
                Dashboard
              </span>
            </button>
            {NURSE_MENU_ITEMS.map(({ id, label, Icon, path }) => {
              const active = path ? location.pathname === path : nursePanel === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    if (path) {
                      navigate(path);
                      return;
                    }
                    if (id === 'profile') {
                      navigate('/nurse/profile');
                      return;
                    }
                    if (id === 'settings') {
                      navigate('/nurse/settings');
                      return;
                    }
                    if (id === 'payment') {
                      navigate('/nurse/payment');
                      return;
                    }
                    setNursePanel(id);
                  }}
                  className={`flex items-center gap-0 mx-0 sm:mx-0.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                      : 'text-muted hover:bg-glass-elevated/50 border border-transparent hover:border-glass-border/60'
                  }`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-glass/40/15' : 'bg-glass/40 border border-glass-border/50'}`}>
                    <Icon className="w-[1.1rem] h-[1.1rem]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,padding] duration-300 ease-out lg:group-hover/sbar:max-w-[10rem] lg:group-hover/sbar:opacity-100 lg:group-hover/sbar:pr-2.5 max-w-[10rem] opacity-100 px-2 lg:max-w-0 lg:opacity-0 lg:px-0">
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="dashboard-main">
          <div
            className={`flex items-center flex-wrap gap-3 ${
              ['active_jobs', 'history'].includes(nursePanel) ? 'justify-end' : 'justify-between'
            }`}
          >
            <div>
              {!['active_jobs', 'history'].includes(nursePanel) && (
                <>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome, {user?.name}</h1>
                  <p className="text-muted">{user?.specialization || 'Nurse'} · ★ {user?.rating?.toFixed?.(1) || '4.8'}</p>
                  {user?.location?.address ? (
                    <p className="text-xs text-muted mt-1 line-clamp-2 max-w-xl" title={user.location.address}>
                      📍 {user.location.address}
                    </p>
                  ) : null}
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button type="button" onClick={() => setShowRouteGraph((v) => !v)} className="btn-outline text-sm px-4 py-2">
                {showRouteGraph ? 'Hide graph' : 'View graph'}
              </button>
              {myPos && <span className="badge bg-brand-500/15 text-brand-300 border border-brand-500/30">📍 GPS active</span>}
              <button onClick={toggleAvailable} className={`btn ${available ? 'btn-accent' : 'btn-outline'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${available ? 'bg-glass/40' : 'bg-rose-500'}`} />
                {available ? 'Available' : 'Offline'}
              </button>
            </div>
          </div>

          <div className={`grid gap-6 ${showRouteGraph ? 'lg:grid-cols-5' : ''}`}>
            <div className={`space-y-6 ${showRouteGraph ? 'lg:col-span-2' : ''}`}>
              {nursePanel === 'dashboard' && (
                <div className="card">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Incoming calls</h3>
                    <span className="badge bg-amber-100 text-amber-800">{pending.length}</span>
                  </div>
                  <div className="mt-3 space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {pending.length === 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setStatsModal('completed')}
                          className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-left w-full hover:ring-2 hover:ring-emerald-500/30 hover:border-emerald-500/50 transition-all cursor-pointer"
                        >
                          <p className="text-[11px] text-emerald-400 uppercase tracking-wide font-semibold">Completed jobs</p>
                          <p className="text-2xl font-bold text-emerald-300 mt-1">{stats.completed}</p>
                          <p className="text-[10px] text-emerald-400/80 mt-1">Tap to view details</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatsModal('cancelled')}
                          className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-left w-full hover:ring-2 hover:ring-rose-500/30 hover:border-rose-500/50 transition-all cursor-pointer"
                        >
                          <p className="text-[11px] text-rose-400 uppercase tracking-wide font-semibold">Cancelled</p>
                          <p className="text-2xl font-bold text-rose-300 mt-1">{stats.cancelled}</p>
                          <p className="text-[10px] text-rose-400/80 mt-1">Tap to view details</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatsModal('payment')}
                          className="rounded-xl border border-brand-500/35 bg-brand-500/10 p-3 text-left w-full hover:ring-2 hover:ring-brand-500/30 hover:border-brand-500/50 transition-all cursor-pointer"
                        >
                          <p className="text-[11px] text-brand-400 uppercase tracking-wide font-semibold">Total payment generated</p>
                          <p className="text-xl font-bold text-brand-300 mt-1">{fmtInr(stats.payment)}</p>
                          <p className="text-[10px] text-brand-400/80 mt-1">Tap to view details</p>
                        </button>
                      </div>
                    )}
                    {pending.map((r) => (
                      <div
                        key={r._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openIncomingMap(r)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openIncomingMap(r);
                          }
                        }}
                        className="rounded-xl border border-glass-border/60 bg-glass/30 p-3 hover:border-brand-500/40 hover:bg-brand-500/10 cursor-pointer transition-colors text-left"
                      >
                        <div className="flex justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold capitalize">{r.serviceType.replace('_', ' ')}</div>
                            <div className="text-xs text-muted">{r.user?.name} · {r.location?.address || 'Map pin'}</div>
                            <div className="text-[11px] text-brand-400 mt-1.5 inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" aria-hidden /> Tap to view map & distance
                            </div>
                            {myPos && r.location?.coordinates?.length === 2 && (
                              <div className="text-[11px] font-semibold text-brand-300 mt-1 tabular-nums">
                                {haversineKm(myPos, r.location.coordinates).toFixed(1)} km away (live)
                              </div>
                            )}
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); accept(r._id); }} className="btn-primary text-sm shrink-0">
                            Accept
                          </button>
                        </div>
                        {r.notes && <div className="text-xs italic text-muted mt-2">"{r.notes}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(nursePanel === 'active_jobs' || nursePanel === 'history') && (
              <div className="card">
                <div className="space-y-3">
                  {jobsForPanel.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted">
                      {nursePanel === 'history'
                        ? 'No history records yet.'
                        : 'No active jobs currently.'}
                    </p>
                  )}
                  {jobsForPanel.map((r) => {
                    const route = routes[r._id];
                    const isActive = ACTIVE_STATUSES.includes(r.status);
                    const visitDuration = visitDurationLabel(r);
                    return (
                      <div key={r._id} className="rounded-xl border border-glass-border/60 p-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold">{r.user?.name}</div>
                            <div className="text-xs text-muted capitalize">
                              Purpose: <span className="font-semibold text-foreground">{servicePurposeLabel(r)}</span>
                              {r.user?.phone ? ` · ${r.user.phone}` : ''}
                            </div>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                          <div className="rounded-xl border border-glass-border/50 bg-glass/25 px-3 py-2">
                            <p className="font-semibold text-muted uppercase tracking-wide text-[10px]">Visit location</p>
                            <p className="mt-1 text-foreground/85 line-clamp-2">
                              {r.location?.address || 'Map pin location'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-glass-border/50 bg-glass/25 px-3 py-2">
                            <p className="font-semibold text-muted uppercase tracking-wide text-[10px]">Time taken</p>
                            <p className="mt-1 font-semibold text-brand-300 tabular-nums">
                              {visitDuration}
                            </p>
                            {visitDuration !== '—' && (
                              <p className="mt-0.5 text-[10px] text-muted">Start OTP to completion OTP</p>
                            )}
                          </div>
                        </div>
                        {r.notes && (
                          <div className="mt-2 rounded-xl border border-glass-border/50 bg-glass/20 px-3 py-2 text-xs text-muted">
                            <span className="font-semibold text-foreground">Purpose note:</span> “{r.notes}”
                          </div>
                        )}
                        {isActive && (
                          <div className="mt-2 text-xs text-muted">
                            {route ? (
                              <>
                                <span className="font-semibold text-brand-400">{route.distanceKm.toFixed(1)} km</span> · ETA <b>{formatEta(route.durationMin)}</b> to patient
                              </>
                            ) : myPos ? 'calculating route…' : 'waiting for your GPS…'}
                          </div>
                        )}
                        {!['completed', 'cancelled'].includes(r.status) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(r.status === 'on_the_way' || r.status === 'accepted') && <button onClick={() => updateStatus(r._id, 'in_progress')} className="btn-outline text-xs">Start visit (OTP)</button>}
                            <button onClick={() => updateStatus(r._id, 'completed')} className="btn-accent text-xs">Complete (OTP)</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {nursePanel === 'profile' && (
                <div className="card">
                  <h3 className="font-semibold text-base flex items-center gap-2"><UserCircle2 className="w-4 h-4" /> Profile</h3>
                  <p className="text-sm text-muted mt-2">{user?.name} · {user?.email}</p>
                </div>
              )}
            </div>

            {showRouteGraph && (
              <div className="lg:col-span-3 card !p-2">
                <MapView center={mapCenter} markers={markers} routes={polylines} height="640px" />
              </div>
            )}
          </div>
        </div>
      </div>

      {statsModal && STAT_MODAL_META[statsModal] && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stats-modal-title"
        >
          <div className="w-full max-w-3xl glass-panel border-glass-border/60 shadow-glass overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-glass-border/50 flex items-start justify-between gap-3 shrink-0">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Dashboard summary</p>
                <h3 id="stats-modal-title" className="text-lg font-semibold text-foreground mt-1">
                  {STAT_MODAL_META[statsModal].title}
                </h3>
                <p className="text-xs text-muted mt-1 tabular-nums">
                  {statsModalRows.length} record{statsModalRows.length === 1 ? '' : 's'}
                  {statsModal === 'payment' ? ` · Total ${fmtInr(stats.payment)}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatsModal(null)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-glass-border/60 text-muted hover:text-foreground hover:bg-glass/30 shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-5">
              {statsModalRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">{STAT_MODAL_META[statsModal].empty}</p>
              ) : (
                <table className="w-full text-sm min-w-[760px]">
                  <thead className="bg-glass/30 text-left text-xs font-semibold text-muted uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">Patient</th>
                      <th className="px-3 py-2.5">Purpose</th>
                      <th className="px-3 py-2.5">Time taken</th>
                      <th className="px-3 py-2.5">Visit location</th>
                      <th className="px-3 py-2.5">Date</th>
                      {statsModal === 'payment' && <th className="px-3 py-2.5 text-right">Amount</th>}
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsModalRows.map((r) => (
                      <tr key={r._id} className="border-t border-glass-border/50 hover:bg-glass/30/60">
                        <td className="px-3 py-2.5 font-medium text-foreground">
                          {typeof r.user === 'object' ? r.user?.name : 'Patient'}
                        </td>
                        <td className="px-3 py-2.5 text-muted">
                          <span className="capitalize font-medium text-foreground">{servicePurposeLabel(r)}</span>
                          {r.notes && <span className="block mt-0.5 text-xs line-clamp-2">“{r.notes}”</span>}
                        </td>
                        <td className="px-3 py-2.5 text-brand-300 font-semibold tabular-nums">
                          {visitDurationLabel(r)}
                        </td>
                        <td className="px-3 py-2.5 text-muted max-w-[240px]">
                          <span className="line-clamp-2">{r.location?.address || 'Map pin location'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-muted whitespace-nowrap tabular-nums">{fmtJobDate(r)}</td>
                        {statsModal === 'payment' && (
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">
                            {fmtInr(r.feeAmount)}
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-5 py-4 border-t border-glass-border/50 flex justify-end shrink-0 bg-glass/30/50">
              <button type="button" onClick={() => setStatsModal(null)} className="btn-outline text-sm px-4 py-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {incomingMapRequest && incomingPopupMap && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-3xl glass-panel border-glass-border/60 shadow-glass overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 border-b border-glass-border/50 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Incoming request · map</p>
                <h3 className="text-lg font-semibold text-foreground mt-1 capitalize">{incomingMapRequest.serviceType.replace('_', ' ')}</h3>
                <p className="text-sm text-muted mt-1 leading-relaxed">{incomingMapRequest.user?.name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {incomingLiveKm != null ? (
                    <span className="inline-flex items-center rounded-lg bg-brand-500/15 border border-brand-500/30 px-2.5 py-1 text-sm font-bold text-brand-300 tabular-nums">
                      {incomingLiveKm.toFixed(1)} km · live GPS
                    </span>
                  ) : nurseCoords ? (
                    <span className="text-xs text-muted">Updating GPS distance…</span>
                  ) : (
                    <span className="text-xs text-amber-400">Allow location to see live distance</span>
                  )}
                  {incomingPreviewRoute && nurseCoords ? (
                    <span className="text-xs text-muted tabular-nums">
                      Driving ~{incomingPreviewRoute.distanceKm.toFixed(1)} km · ETA {formatEta(incomingPreviewRoute.durationMin)}
                    </span>
                  ) : nurseCoords ? (
                    <span className="text-xs text-muted/70">Calculating driving route…</span>
                  ) : null}
                </div>
                <p className="text-xs text-muted mt-2 line-clamp-3">{incomingMapRequest.location?.address}</p>
              </div>
              <button type="button" onClick={closeIncomingMap} className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-glass-border/60 text-muted hover:text-foreground hover:bg-glass/30 shrink-0" aria-label="Close map">
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <div className="p-3 sm:p-4 flex-1 min-h-0 relative">
              <div className="rounded-xl overflow-hidden border border-glass-border/60">
                <MapView center={incomingPopupMap.center} markers={incomingPopupMap.markers} routes={incomingPopupMap.polylines} height="400px" />
              </div>
              {incomingLiveKm != null && (
                <div className="absolute top-5 left-5 right-5 sm:left-auto sm:right-7 sm:max-w-xs rounded-xl glass-panel border-brand-500/30 shadow-glass px-3 py-2 text-sm font-semibold text-brand-300 tabular-nums pointer-events-none">
                  {incomingLiveKm.toFixed(1)} km to patient · updates with your GPS
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-glass-border/50 flex flex-wrap justify-end gap-2 shrink-0 bg-glass/30/50">
              <button type="button" onClick={closeIncomingMap} className="btn-outline text-sm px-4 py-2">Close</button>
              <button type="button" onClick={() => { const id = incomingMapRequest._id; closeIncomingMap(); accept(id); }} className="btn-primary text-sm px-4 py-2">Accept job</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurseDashboard;
