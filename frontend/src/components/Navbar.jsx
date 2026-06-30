import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { LOGIN_KIND_LABELS, navigateForUser } from '../lib/accountKinds';
import { patientProfileCompletion } from '../lib/patientProfile';
import ProfileUploadRing from './dashboard/ProfileUploadRing.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import MobileNavDrawer from './ui/MobileNavDrawer.jsx';
import { cn } from '../lib/utils';

const PUBLIC_NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { href: '/#services', label: 'Services' },
  { href: '/#about', label: 'About' },
  { href: '/#how', label: 'How it works' },
  { href: '/#contact', label: 'Contact' },
];

/** Logged-in header: marketing sections hidden; dashboard link omitted (pages use back links). */
const AUTH_NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { href: '/#services', label: 'Services' },
];

const Navbar = () => {
  const { user, logout, switchActiveKind } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const roleOptions = user?.loginOptions?.length > 1 ? user.loginOptions : [];
  const activeLabel =
    LOGIN_KIND_LABELS[user?.activeKind] ||
    (user?.role === 'nurse' ? 'Care provider' : user?.role === 'admin' ? 'Admin' : 'Patient');

  const onSwitchRole = (kind) => {
    const next = switchActiveKind(kind);
    if (!next) return;
    closeMenu();
    navigateForUser(next, navigate);
  };

  const navLinks = user ? AUTH_NAV_LINKS : PUBLIC_NAV_LINKS;

  const profileCompletion = user ? patientProfileCompletion(user) : null;
  const showProfileRing =
    user?.role === 'user' &&
    user?.activeKind !== 'guardian' &&
    (profileCompletion?.percent ?? 0) < 100;
  const showProfileLink = user?.role === 'user' && !showProfileRing;

  const navLinkClass = ({ isActive }) =>
    cn(
      'transition-colors duration-200',
      isActive ? 'text-brand-400' : 'text-muted hover:text-foreground'
    );

  const closeMenu = () => setMenuOpen(false);

  const mobileLinkClass =
    'flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-glass/50 transition';

  return (
    <header className="nav-glass">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 z-10 group shrink-0" onClick={closeMenu}>
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 via-brand-600 to-violet-600 grid place-items-center text-white text-xs font-black shadow-[0_0_20px_-4px_rgba(239,68,68,0.45)]">
            911
          </span>
          <span className="font-bold text-base tracking-tight text-gradient-brand">911</span>
        </Link>

        <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-5 lg:gap-6 text-sm font-medium">
          {navLinks.map((item) =>
            item.to ? (
              <NavLink key={item.label} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="text-muted hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            )
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 z-10 shrink-0">
          <ThemeToggle />
          {!user ? (
            <>
              <Link
                to="/login"
                className="btn-outline text-sm px-3 py-1.5 hidden sm:inline-flex"
                onClick={closeMenu}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-1.5 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.55)] hover:opacity-95 transition-opacity"
                onClick={closeMenu}
              >
                Get started
              </Link>
            </>
          ) : (
            <>
              {showProfileRing && (
                <ProfileUploadRing
                  completion={profileCompletion}
                  size="header"
                  className="flex"
                  to="/dashboard/profile"
                  onClick={closeMenu}
                />
              )}
              {showProfileLink && (
                <Link
                  to="/dashboard/profile"
                  className="inline-flex btn-outline text-sm px-2.5 py-1.5 sm:px-3"
                  onClick={closeMenu}
                >
                  Profile
                </Link>
              )}
              {roleOptions.length > 1 && (
                <select
                  className="hidden sm:inline input !py-1 !text-xs !w-auto max-w-[9rem]"
                  value={user.activeKind || roleOptions[0]?.kind}
                  onChange={(e) => onSwitchRole(e.target.value)}
                  aria-label="Switch account role"
                >
                  {roleOptions.map((o) => (
                    <option key={o.kind} value={o.kind}>
                      {o.label || LOGIN_KIND_LABELS[o.kind]}
                    </option>
                  ))}
                </select>
              )}
              <span className="hidden lg:inline text-xs text-muted max-w-[8rem] truncate">
                {user.name}{' '}
                <span className="badge bg-brand-500/20 text-brand-300 ml-1 border border-brand-500/30">
                  {activeLabel}
                </span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-primary text-sm px-3 py-1.5 hidden sm:inline-flex"
              >
                Logout
              </button>
            </>
          )}
          <button
            type="button"
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-glass-border/60 text-foreground hover:bg-glass/50 transition touch-target"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" aria-hidden />
          </button>
        </div>
      </div>

      <MobileNavDrawer open={menuOpen} onClose={closeMenu} title="911 menu">
        <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
          {navLinks.map((item) =>
            item.to ? (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(mobileLinkClass, isActive && 'bg-brand-500/15 text-brand-300')
                }
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ) : (
              <a key={item.label} href={item.href} className={mobileLinkClass} onClick={closeMenu}>
                {item.label}
              </a>
            )
          )}
        </nav>
        <div className="mt-4 pt-4 border-t border-glass-border/50 flex flex-col gap-2">
          {!user ? (
            <>
              <Link to="/login" className="btn-outline w-full justify-center" onClick={closeMenu}>
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white"
                onClick={closeMenu}
              >
                Get started
              </Link>
            </>
          ) : (
            <>
              {showProfileLink && (
                <Link to="/dashboard/profile" className="btn-outline w-full justify-center" onClick={closeMenu}>
                  Profile
                </Link>
              )}
              {roleOptions.length > 1 && (
                <select
                  className="input !py-2 !text-sm w-full"
                  value={user.activeKind || roleOptions[0]?.kind}
                  onChange={(e) => onSwitchRole(e.target.value)}
                  aria-label="Switch account role"
                >
                  {roleOptions.map((o) => (
                    <option key={o.kind} value={o.kind}>
                      {o.label || LOGIN_KIND_LABELS[o.kind]}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-muted text-center px-2">
                {user.name} · {activeLabel}
              </p>
              <button type="button" onClick={handleLogout} className="btn-primary w-full">
                Logout
              </button>
            </>
          )}
        </div>
      </MobileNavDrawer>
    </header>
  );
};

export default Navbar;
