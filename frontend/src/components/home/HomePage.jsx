import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Phone,
  Stethoscope,
} from 'lucide-react';
import ColorBends from '../ColorBends.jsx';
import GlassAccordionSection from '../ui/GlassAccordionSection.jsx';
import AboutFeatures from './AboutFeatures.jsx';
import HomeHeader from './HomeHeader.jsx';
import ScrollReveal from './ScrollReveal.jsx';
import ServiceSectionFan from './ServiceSectionFan.jsx';
import { api } from '../../lib/api';
import { SERVICE_SECTIONS, mergeServiceSections } from '../../lib/serviceSections';
import { cn } from '../../lib/utils';

const glassCard =
  'glass-panel p-5 sm:p-6 transition-all duration-300 hover:border-brand-500/35 hover:bg-glass-elevated/40';

const HOW_IT_WORKS_IMAGE = `${import.meta.env.BASE_URL}images/service-subservices/${encodeURIComponent('how it works.jpg')}`;
const AFTER_DOC_ON_CALL_IMAGE = `${import.meta.env.BASE_URL}images/service-subservices/afterdoconcall.jpg`;

const FAQ_ITEMS = [
  {
    value: 'what',
    title: 'What is Care360?',
    subtitle: 'Platform overview',
    content: (
      <p className="leading-relaxed text-muted">
        Care360 is Alchemy Techsol&apos;s home-health marketplace: patients book verified caregivers,
        professionals receive instant job alerts, and admins monitor city-wide activity on one map.
      </p>
    ),
  },
  {
    value: 'book',
    title: 'How do I book a service?',
    subtitle: 'Patients',
    content: (
      <p className="leading-relaxed text-muted">
        Create a free account, open your dashboard, drop your location pin, and request the service you
        need. You can add insurance details later on your profile timeline.
      </p>
    ),
  },
  {
    value: 'camera',
    title: 'What is camera support?',
    subtitle: 'Remote monitoring',
    content: (
      <p className="leading-relaxed text-muted">
        We help families set up secure video check-ins and optional remote observation for post-discharge
        or elderly care — guided setup from your dashboard.
      </p>
    ),
  },
  {
    value: 'caregiver',
    title: 'I am a nurse or doctor — how do I join?',
    subtitle: 'Service providers',
    content: (
      <p className="leading-relaxed text-muted">
        Use Service login to sign in, stay available on your dashboard, and accept incoming visits with
        live routing to the patient.
      </p>
    ),
  },
];

const SNAP_INNER = 'home-snap-inner w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8';

const snapSection = (id, visibleSnap) =>
  cn(
    'home-snap-section relative z-10 snap-start snap-always min-h-dvh flex flex-col justify-center border-b border-glass-border/40',
    visibleSnap.has(id) && 'is-visible'
  );

/** Full-bleed image sections — no outer card border or side padding */
const imageSnapSection = (id, visibleSnap) =>
  cn(
    'home-snap-section home-image-snap-section relative z-10 snap-start snap-always min-h-dvh flex flex-col justify-center',
    visibleSnap.has(id) && 'is-visible'
  );

const HomePage = () => {
  const navigate = useNavigate();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [serviceSections, setServiceSections] = useState(SERVICE_SECTIONS);
  const [visibleSnap, setVisibleSnap] = useState(() => new Set(['hero']));
  const [aboutSectionId, setAboutSectionId] = useState(null);
  const servicesRef = useRef(null);
  const homeScrollRef = useRef(null);
  const scrollRoot = homeScrollRef;

  useEffect(() => {
    let cancelled = false;
    api
      .get('/marketing-services')
      .then(({ data }) => {
        if (!cancelled) setServiceSections(mergeServiceSections(data.sections || [], data));
      })
      .catch(() => {
        if (!cancelled) setServiceSections(SERVICE_SECTIONS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const root = homeScrollRef.current;
    if (!root) return;

    const sections = root.querySelectorAll('.home-snap-section');
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleSnap((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const id = entry.target.id;
            if (!id) return;
            if (entry.isIntersecting) {
              next.add(id);
            } else {
              next.delete(id);
            }
          });
          return next;
        });
      },
      { root, threshold: [0, 0.25, 0.5, 0.75] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    setServicesOpen(false);
    const root = homeScrollRef.current;
    const el = document.getElementById(id);
    if (!el) return;

    if (root) {
      root.scrollTo({ top: el.offsetTop - root.offsetTop, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goToUserLogin = () => {
    navigate('/login');
  };

  const showSectionDetails = (sectionId) => {
    setAboutSectionId(sectionId);
    scrollTo('about');
  };

  return (
    <div className="app-page relative h-dvh overflow-hidden flex flex-col">
      <HomeHeader
        servicesOpen={servicesOpen}
        setServicesOpen={setServicesOpen}
        onBookService={goToUserLogin}
        servicesRef={servicesRef}
        scrollTo={scrollTo}
        serviceSections={serviceSections}
      />

      {/* Animated color bends background */}
      <div className="fixed inset-0 z-0 min-h-[100dvh]">
        <ColorBends
          colors={['#ff5c7a', '#8a5cff', '#00ffd1']}
          rotation={90}
          speed={0.2}
          scale={1}
          frequency={1}
          warpStrength={1}
          mouseInfluence={1}
          noise={0.15}
          parallax={0.5}
          iterations={1}
          intensity={1.5}
          bandWidth={6}
          transparent
          autoRotate={0}
          trackWindowMouse
        />
        <div className="pointer-events-none absolute inset-0 bg-white/92" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/80 via-white/92 to-white"
          aria-hidden
        />
      </div>

      <main
        id="home-scroll"
        ref={homeScrollRef}
        className="home-scroll relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth"
      >
      {/* Hero */}
      <section id="hero" className={snapSection('hero', visibleSnap)}>
        <div className="flex flex-1 flex-col items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-3 sm:pt-5 sm:pb-4 w-full min-h-0">
          <div className="flex flex-col items-center text-center w-full min-h-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-md px-3 py-1.5 text-xs font-medium text-foreground/90 animate-fade-in">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/80 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              Live · verified · at home
            </span>

            <h1 className="mt-3 sm:mt-5 max-w-3xl text-[1.45rem] leading-[1.15] sm:text-4xl lg:text-[3.15rem] font-semibold tracking-[-0.03em] text-foreground sm:leading-[1.12] animate-fade-in [animation-delay:80ms]">
              Your family&apos;s health hub{' '}
              <span className="text-gradient-brand">one app, every service.</span>
            </h1>

            <div className="mt-5 sm:mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 w-full max-w-md sm:max-w-none animate-fade-in [animation-delay:160ms]">
              <button
                type="button"
                onClick={goToUserLogin}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600/95 to-violet-600/95 px-5 sm:px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_32px_-12px_rgba(99,102,241,0.5)] hover:brightness-110 transition"
              >
                Book a service
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <aside
              id="hero-services"
              className="mt-3 sm:mt-5 w-full max-w-full animate-fade-in [animation-delay:240ms]"
            >
              <ServiceSectionFan onActivateSection={showSectionDetails} serviceSections={serviceSections} />
            </aside>
          </div>

          <button
            type="button"
            onClick={() => scrollTo('about')}
            className="shrink-0 pt-2 flex flex-col items-center gap-1 text-muted/80 hover:text-foreground/90 transition-colors group"
            aria-label="Scroll to About section"
          >
            <span className="text-[10px] uppercase tracking-[0.22em] font-medium opacity-70 group-hover:opacity-100">
              Scroll
            </span>
            <ChevronDown className="w-5 h-5 animate-scroll-hint" aria-hidden />
          </button>
        </div>
      </section>

      <AboutFeatures
        scrollRoot={scrollRoot}
        className={visibleSnap.has('about') ? 'is-visible' : undefined}
        activeSectionId={aboutSectionId}
        serviceSections={serviceSections}
      />


      {/* Doctor on call */}
      <section id="doctor-on-call" className={imageSnapSection('doctor-on-call', visibleSnap)}>
        <div className="home-image-snap-inner w-full">
          <ScrollReveal root={scrollRoot} className="w-full">
            <div className="home-image-panel">
              <img
                src={`${import.meta.env.BASE_URL}images/service-subservices/Doconcall.jpg`}
                alt="Doctor on call service"
                loading="lazy"
                decoding="async"
              />
              <div className="doctor-on-call-actions">
                <Link to="/login" className="doctor-on-call-btn doctor-on-call-btn--primary">
                  <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  Sign in for doctor on call
                </Link>
                <Link to="/register?service=doctor_consult" className="doctor-on-call-btn doctor-on-call-btn--outline">
                  New user? Register
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* After doctor on call */}
      <section id="after-doctor-on-call" className={imageSnapSection('after-doctor-on-call', visibleSnap)}>
        <div className="home-image-snap-inner w-full">
          <ScrollReveal root={scrollRoot} className="w-full">
            <div className="home-image-panel">
              <img
                src={AFTER_DOC_ON_CALL_IMAGE}
                alt="Doctor on call — continued care"
                loading="lazy"
                decoding="async"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Camera setup */}
      <section id="camera" className={imageSnapSection('camera', visibleSnap)}>
        <div className="home-image-snap-inner w-full">
          <ScrollReveal root={scrollRoot} className="w-full">
            <div className="home-image-panel home-image-panel--mid home-image-panel--cover">
              <img
                src={`${import.meta.env.BASE_URL}images/service-subservices/Setupcamera.jpg`}
                alt="Set up camera support"
                loading="lazy"
                decoding="async"
              />
              <div className="home-image-panel__actions">
                <Link
                  to="/register"
                  className="btn-outline inline-flex px-5 py-2.5 text-sm border-cyan-500/30 bg-white/90 backdrop-blur-sm"
                >
                  Set up camera
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className={imageSnapSection('how', visibleSnap)}>
        <div className="home-image-snap-inner w-full">
          <ScrollReveal root={scrollRoot} className="w-full">
            <div className="home-image-panel home-image-panel--mid">
              <img
                src={HOW_IT_WORKS_IMAGE}
                alt="How it works — three steps from request to care at your door"
                loading="lazy"
                decoding="async"
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={snapSection('faq', visibleSnap)}>
        <div className={cn(SNAP_INNER, 'max-w-6xl')}>
          <ScrollReveal root={scrollRoot}>
            <GlassAccordionSection
              title="Questions & answers"
              description="Learn how Care360 compares to traditional home-care agencies and on-demand health apps."
              items={FAQ_ITEMS}
              defaultValue="what"
            />
          </ScrollReveal>
        </div>
      </section>

      {/* Final CTA */}
      <section id="contact" className={cn(snapSection('contact', visibleSnap), 'border-b-0')}>
        <div className={SNAP_INNER}>
          <ScrollReveal root={scrollRoot}>
            <div
              className={`${glassCard} p-8 lg:p-10 text-center border-brand-500/30 bg-gradient-to-br from-brand-500/10 via-transparent to-violet-500/10`}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Ready when you are</h2>
              <p className="mt-3 text-muted max-w-lg mx-auto text-sm">
                Patients, caregivers, and Alchemy admins each have a dedicated login — one city-wide network
                for trusted home care.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-8 py-3 text-sm font-semibold text-white shadow-[0_0_28px_-6px_rgba(99,102,241,0.55)] hover:opacity-95"
                >
                  Register free
                </Link>
                <Link to="/login" className="btn-outline px-8 py-3 text-sm font-semibold">
                  Sign in
                </Link>
                <Link
                  to="/login?staff=1&provider=1"
                  className="btn-ghost px-6 py-3 text-sm border border-glass-border/50"
                >
                  Service login
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
      </main>
    </div>
  );
};

export default HomePage;
