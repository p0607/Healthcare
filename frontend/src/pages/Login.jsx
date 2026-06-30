import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { LOGIN_KIND_LABELS, navigateForUser } from '../lib/accountKinds';
import GuestOnly from '../components/GuestOnly.jsx';

const STAFF_ROLES = [
  { id: 'user', label: 'Patient', icon: '🧑', desc: 'Book home care' },
  { id: 'nurse', label: 'Care provider', icon: '👩‍⚕️', desc: 'Nurse, doctor, physio, or emergency' },
  { id: 'admin', label: 'Alchemy Admin', icon: '🛡️', desc: 'See all activity' },
];

const STAFF_QUERY = 'staff=1';
const PROVIDER_QUERY = 'staff=1&provider=1';
const ADMIN_QUERY = 'staff=1&admin=1';

const Login = () => {
  const [params] = useSearchParams();
  const staffMode = params.get('staff') === '1' || params.get('staff') === 'true';
  const providerMode =
    staffMode && (params.get('provider') === '1' || params.get('provider') === 'true');
  const adminMode =
    staffMode && (params.get('admin') === '1' || params.get('admin') === 'true');
  const roleFromUrl = params.get('role');
  const roleFromUrlOk =
    staffMode && !providerMode && roleFromUrl && STAFF_ROLES.some((r) => r.id === roleFromUrl)
      ? roleFromUrl
      : null;

  const [role, setRole] = useState(
    adminMode ? 'admin' : providerMode ? 'nurse' : roleFromUrlOk || 'user'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginOptions, setLoginOptions] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');

  const { login, completeLogin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!staffMode) {
      setRole('user');
      return;
    }
    if (adminMode) {
      setRole('admin');
      return;
    }
    if (providerMode) {
      setRole('nurse');
      return;
    }
    if (roleFromUrlOk) setRole(roleFromUrlOk);
  }, [staffMode, providerMode, adminMode, roleFromUrlOk]);

  const placeholders = useMemo(
    () => ({
      user: 'you@example.com',
      nurse: 'you@example.com',
      admin: 'you@example.com',
    }),
    []
  );

  const effectiveRole = !staffMode ? 'user' : adminMode ? 'admin' : providerMode ? 'nurse' : role;
  const rolePickStep = Boolean(loginOptions?.length);

  const finishLogin = (u) => {
    toast.success(`Welcome back, ${u.name.split(' ')[0]}!`);
    navigateForUser(u, navigate);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await login(email, password, staffMode ? { role: effectiveRole } : {});
      if (result?.needsRolePick) {
        setLoginOptions(result.loginOptions);
        setPendingEmail(result.email || email);
        return;
      }
      finishLogin(result);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    }
  };

  const onPickRole = async (activeKind) => {
    try {
      const u = await completeLogin(pendingEmail || email, password, activeKind);
      if (u?.needsRolePick) return;
      setLoginOptions(null);
      finishLogin(u);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    }
  };

  const pageTitle = rolePickStep
    ? 'How are you signing in?'
    : adminMode
      ? 'Admin login'
      : providerMode
        ? 'Service login'
        : 'Sign in';
  const pageSubtitle = rolePickStep
    ? 'This account has more than one role. Choose how you want to continue.'
    : adminMode
      ? 'Sign in with your Alchemy admin credentials. Admin accounts are provisioned by your super admin.'
      : providerMode
        ? 'Sign in with your caregiver account to receive visit alerts and manage jobs.'
        : staffMode
          ? 'Choose your role and continue with your credentials.'
          : 'Sign in to book home care or manage your account.';

  const submitLabel = loading
    ? 'Signing in…'
    : adminMode
      ? 'Sign in to admin dashboard'
      : providerMode
        ? 'Sign in to service dashboard'
        : staffMode
          ? `Sign in as ${STAFF_ROLES.find((r) => r.id === effectiveRole)?.label ?? 'Staff'}`
          : 'Sign in';

  if (rolePickStep) {
    return (
      <GuestOnly>
      <div className="app-page flex min-h-[calc(100dvh-5rem)] w-full flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
            <p className="mt-2 text-sm sm:text-base text-muted">{pageSubtitle}</p>
          </div>

          <div className="glass-panel p-5 sm:p-6 space-y-3">
            {loginOptions.map((opt) => (
              <button
                key={opt.kind}
                type="button"
                disabled={loading}
                onClick={() => onPickRole(opt.kind)}
                className="w-full text-left rounded-2xl border border-glass-border/60 bg-glass/40 hover:border-brand-500/50 hover:bg-brand-500/10 p-4 transition disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">
                  {opt.label || LOGIN_KIND_LABELS[opt.kind] || opt.kind}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {opt.kind === 'service_provider' && 'Manage visits and your service profile'}
                  {opt.kind === 'patient' && 'Book care and manage your health profile'}
                  {opt.kind === 'guardian' && 'Manage care for your linked patient'}
                  {opt.kind === 'admin' && 'Platform administration'}
                </div>
              </button>
            ))}
            <button
              type="button"
              className="w-full text-sm text-muted hover:text-foreground pt-2"
              onClick={() => {
                setLoginOptions(null);
                setPendingEmail('');
              }}
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
      </GuestOnly>
    );
  }

  return (
    <GuestOnly>
    <div className="app-page flex min-h-[calc(100dvh-5rem)] w-full flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
          <p className="mt-2 text-sm sm:text-base text-muted">{pageSubtitle}</p>
        </div>

        {staffMode && !providerMode && !adminMode && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            {STAFF_ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`text-left rounded-2xl border p-4 transition-all duration-200 ${
                  role === r.id
                    ? 'border-brand-500/70 ring-2 ring-brand-500/30 bg-brand-500/10'
                    : 'border-glass-border/60 bg-glass/40 hover:border-brand-500/40 backdrop-blur-xl'
                }`}
              >
                <div className="text-xl">{r.icon}</div>
                <div className="font-semibold mt-2 text-foreground">{r.label}</div>
                <div className="text-xs text-muted">{r.desc}</div>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="glass-panel p-5 sm:p-6 space-y-4 w-full">
          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-1">Email</label>
            <input
              type="email"
              required
              className="input"
              placeholder={placeholders[effectiveRole]}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3 mb-1">
              <label className="block text-sm font-medium text-foreground/90">Password</label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-brand-400 hover:text-brand-300 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {submitLabel}
          </button>
          <p className="text-sm text-muted text-center">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-brand-400 font-medium hover:text-brand-300 hover:underline">
              Register
            </Link>
          </p>
          {!staffMode && (
            <p className="text-xs text-muted text-center">
              Caregiver or admin?{' '}
              <Link
                to={`/login?${PROVIDER_QUERY}`}
                className="text-brand-400 font-medium hover:text-brand-300 hover:underline"
              >
                Service login
              </Link>
              {' · '}
              <Link
                to={`/login?${STAFF_QUERY}`}
                className="text-brand-400 font-medium hover:text-brand-300 hover:underline"
              >
                Staff login
              </Link>
              {' · '}
              <Link
                to={`/login?${ADMIN_QUERY}`}
                className="text-brand-400 font-medium hover:text-brand-300 hover:underline"
              >
                Admin login
              </Link>
            </p>
          )}
          {adminMode && (
            <p className="text-xs text-muted text-center">
              <Link
                to={`/login?${STAFF_QUERY}`}
                className="text-brand-400 font-medium hover:text-brand-300 hover:underline"
              >
                All staff roles
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
    </GuestOnly>
  );
};

export default Login;
