import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, Phone } from 'lucide-react';
import { APP_NAME } from '@nursecare/shared';
import ThemeToggle from '../ThemeToggle.jsx';
import MobileNavDrawer from '../ui/MobileNavDrawer.jsx';
import BrandLogo from '../BrandLogo.jsx';
import {
  buildServiceLink,
  SERVICE_ICONS,
  SERVICE_SECTIONS,
} from '../../lib/serviceSections';
import { cn } from '../../lib/utils';

const HomeHeader = ({
  servicesOpen,
  setServicesOpen,
  onBookService,
  servicesRef,
  scrollTo,
  serviceSections = SERVICE_SECTIONS,
}) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const go = (id) => {
    scrollTo(id);
    setServicesOpen(false);
    closeMenu();
  };

  const mobileBtn =
    'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground hover:bg-glass/50 transition text-left';

  return (
    <header className="nav-glass sticky top-0 z-[100] isolate border-b border-glass-border/50 pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        {/* Phone: logo + menu | Tablet+: full bar */}
        <div className="flex items-center justify-between gap-3">
          <BrandLogo to="/" size="md" onClick={closeMenu} />

          {/* Desktop / large tablet nav */}
          <nav
            className="hidden lg:flex flex-wrap items-center justify-end gap-2"
            aria-label="Main navigation"
          >
            <Link to="/login" className="btn-outline text-sm px-3 py-2 whitespace-nowrap">
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.55)] hover:opacity-95 transition whitespace-nowrap"
            >
              Register
            </Link>
            <span className="w-px h-6 bg-glass-border/60 shrink-0" aria-hidden />
            <Link to="/register" className="btn-ghost text-sm px-3 py-2 whitespace-nowrap">
              Book post care
            </Link>
            <div className="relative z-[110]" ref={servicesRef}>
              <button
                type="button"
                onClick={() => setServicesOpen((o) => !o)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium border transition-all whitespace-nowrap',
                  servicesOpen
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                    : 'border-glass-border/60 bg-glass/40 text-foreground hover:border-brand-500/40'
                )}
                aria-expanded={servicesOpen}
                aria-haspopup="true"
              >
                Services
                <ChevronDown
                  className={cn('w-4 h-4 transition-transform', servicesOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>
              {servicesOpen && (
                <div
                  className="nav-services-dropdown absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] max-h-[min(70vh,32rem)] overflow-y-auto rounded-2xl border border-glass-border/80 p-2 z-[120] animate-slide-down"
                  role="menu"
                >
                  {serviceSections.map((section) => (
                    <div key={section.id} className="mb-2 last:mb-0">
                      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                        {section.title}
                      </p>
                      {section.services.map((service) => {
                        const Icon = SERVICE_ICONS[service.id] || section.Icon;
                        return (
                          <button
                            key={service.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              navigate(buildServiceLink(service));
                              setServicesOpen(false);
                              closeMenu();
                            }}
                            className="w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.08] transition"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 border border-brand-500/25 text-brand-300">
                              <Icon className="w-4 h-4" strokeWidth={2} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-foreground">
                                {service.laymanName}
                              </span>
                              <span className="block text-xs text-muted leading-snug mt-0.5">
                                {service.legacyName}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => go('about')} className="btn-ghost text-sm px-3 py-2 whitespace-nowrap">
              About
            </button>
            <button type="button" onClick={() => go('camera')} className="btn-ghost text-sm px-3 py-2 whitespace-nowrap">
              Set up camera
            </button>
            <button
              type="button"
              onClick={() => {
                onBookService();
                closeMenu();
              }}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-[0_0_20px_-6px_rgba(99,102,241,0.5)] hover:opacity-95 whitespace-nowrap"
            >
              Book a service
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn-outline text-sm px-3 py-2 border-brand-500/30 text-brand-700 hover:bg-brand-500/10 whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5 inline mr-1 -mt-0.5" aria-hidden />
              Doctor on call
            </button>
            <ThemeToggle />
          </nav>

          {/* Tablet: compact CTAs */}
          <nav className="hidden md:flex lg:hidden items-center gap-2 shrink-0" aria-label="Compact navigation">
            <Link to="/login" className="btn-outline text-xs px-2.5 py-1.5">
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              Register
            </Link>
            <button
              type="button"
              onClick={() => {
                onBookService();
              }}
              className="inline-flex rounded-xl px-2.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-brand-600 to-violet-600 text-white"
            >
              Book
            </button>
            <ThemeToggle />
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-glass-border/60 hover:bg-glass/50 touch-target"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </nav>

          {/* Phone */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <Link
              to="/register"
              className="inline-flex rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Register
            </Link>
            <ThemeToggle />
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-glass-border/60 hover:bg-glass/50 touch-target"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <MobileNavDrawer open={menuOpen} onClose={closeMenu} title={APP_NAME} breakpointClass="lg:hidden">
        <div className="flex flex-col gap-1">
          <Link to="/login" className={mobileBtn} onClick={closeMenu}>
            Sign in
          </Link>
          <Link to="/register" className={mobileBtn} onClick={closeMenu}>
            Register
          </Link>
          <Link to="/register" className={mobileBtn} onClick={closeMenu}>
            Book post care
          </Link>
          <button type="button" className={mobileBtn} onClick={() => go('about')}>
            About
          </button>
          <button type="button" className={mobileBtn} onClick={() => go('camera')}>
            Set up camera
          </button>
          <button
            type="button"
            className={cn(mobileBtn, 'bg-gradient-to-r from-brand-600/20 to-violet-600/20 border border-brand-500/30')}
            onClick={() => {
              onBookService();
              closeMenu();
            }}
          >
            Book a service
          </button>
          <button
            type="button"
            className={cn(mobileBtn, 'text-brand-700')}
            onClick={() => {
              navigate('/login');
              closeMenu();
            }}
          >
            <Phone className="w-4 h-4 shrink-0" />
            Doctor on call
          </button>
        </div>
        <p className="mt-4 mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Our services</p>
        <div className="flex flex-col gap-3">
          {serviceSections.map((section) => (
            <div key={section.id}>
              <p className="px-1 mb-1 text-xs font-semibold text-foreground/90">{section.title}</p>
              <div className="flex flex-col gap-1">
                {section.services.map((service) => {
                  const Icon = SERVICE_ICONS[service.id] || section.Icon;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      className={mobileBtn}
                      onClick={() => {
                        navigate(buildServiceLink(service));
                        closeMenu();
                      }}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 border border-brand-500/25 text-brand-300">
                        <Icon className="w-4 h-4" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 text-left">
                        <span className="block font-medium">{service.laymanName}</span>
                        <span className="block text-xs text-muted leading-snug">{service.legacyName}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </MobileNavDrawer>
    </header>
  );
};

export default HomeHeader;
