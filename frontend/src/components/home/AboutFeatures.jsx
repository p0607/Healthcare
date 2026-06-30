import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ScrollReveal from './ScrollReveal.jsx';
import { SERVICE_SECTIONS } from '../../lib/serviceSections';
import { cn } from '../../lib/utils';

const AUTO_ADVANCE_MS = 4000;

const AboutFeatures = ({ scrollRoot = null, className = '', activeSectionId, serviceSections = SERVICE_SECTIONS }) => {
  const [activeSection, setActiveSection] = useState(0);
  const [activeService, setActiveService] = useState(0);
  const pausedRef = useRef(false);

  const section = serviceSections[activeSection] || serviceSections[0];
  const visibleServices = section?.services ?? [];
  const totalSections = serviceSections.length;
  const cardCount = visibleServices.length;
  const useScrollRow = cardCount > 4;

  const cardWidthClass =
    cardCount <= 1
      ? 'w-[min(100%,280px)]'
      : cardCount === 2
        ? 'w-[min(100%,260px)] sm:w-[240px]'
        : cardCount === 3
          ? 'w-[min(100%,220px)] sm:w-[200px]'
          : cardCount === 4
            ? 'w-[min(100%,220px)] sm:w-[calc((100%-3*0.75rem)/4)] lg:max-w-[240px]'
            : 'w-[152px] sm:w-[168px]';

  const goToSection = useCallback(
    (index) => {
      setActiveSection(((index % totalSections) + totalSections) % totalSections);
      setActiveService(0);
    },
    [totalSections]
  );

  useEffect(() => {
    if (!activeSectionId) return;
    const idx = serviceSections.findIndex((s) => s.id === activeSectionId);
    if (idx !== -1) {
      setActiveSection(idx);
      setActiveService(0);
      pausedRef.current = true;
    }
  }, [activeSectionId, serviceSections]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      setActiveSection((s) => (s + 1) % totalSections);
      setActiveService(0);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [totalSections]);

  return (
    <section
      id="about"
      className={cn(
        'home-snap-section relative z-10 border-b border-glass-border/40 snap-start snap-always flex flex-col justify-center min-h-dvh',
        className
      )}
    >
      <div className="home-snap-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-2 sm:py-0">
        <ScrollReveal root={scrollRoot}>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            Services explained
          </h2>
        </ScrollReveal>

        <div
          className="mt-4 lg:mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2"
          role="tablist"
          aria-label="Service categories"
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
        >
          {serviceSections.map((s, index) => {
            const Icon = s.Icon;
            const isActive = index === activeSection;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => goToSection(index)}
                onFocus={() => goToSection(index)}
                className={cn(
                  'group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-300 border',
                  isActive
                    ? 'border-glass-border/80 bg-glass/40 shadow-[0_8px_24px_-14px_rgba(0,0,0,0.5)]'
                    : 'border-transparent text-muted hover:text-foreground/85 hover:bg-glass/25'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                    isActive
                      ? 'bg-foreground text-[rgb(var(--canvas))] border-transparent'
                      : 'bg-glass/50 border-glass-border/50 text-muted group-hover:text-foreground/85'
                  )}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} aria-hidden />
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm font-semibold truncate',
                    isActive ? 'text-foreground' : 'text-foreground/85'
                  )}
                >
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>

        <ScrollReveal
          root={scrollRoot}
          className="mt-4 lg:mt-6 min-w-0"
          key={`${section?.id || 'section'}-cards`}
        >
          <div
            className={cn(
              'service-explained-cards-row flex flex-nowrap items-stretch gap-3 sm:gap-4 w-full',
              useScrollRow ? 'justify-start overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-2' : 'justify-center',
              cardCount === 4 && !useScrollRow && 'lg:px-2'
            )}
            role="tablist"
            aria-label={`${section.title} services`}
            onMouseEnter={() => {
              pausedRef.current = true;
            }}
            onMouseLeave={() => {
              pausedRef.current = false;
            }}
          >
            {visibleServices.map((svc, idx) => {
              const isActive = idx === activeService;
              return (
                <Link
                  key={svc.id}
                  to="/login"
                  role="tab"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveService(idx)}
                  onFocus={() => setActiveService(idx)}
                  onClick={() => setActiveService(idx)}
                  className={cn(
                    'service-explained-card group relative shrink-0 snap-start snap-always',
                    'block aspect-[5/4] max-h-[220px] rounded-2xl overflow-hidden shadow-lg transition-all duration-300',
                    'hover:scale-[1.02] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                    cardWidthClass,
                    isActive && 'ring-2 ring-brand-500 ring-offset-2'
                  )}
                >
                  {svc.imageSrc ? (
                    <img
                      src={svc.imageSrc}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    <span className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-400" aria-hidden />
                  )}

                  <span
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/15"
                    aria-hidden
                  />

                  <span className="service-explained-card__caption absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-3.5">
                    <span className="min-w-0">
                      <span className="block text-xs sm:text-sm font-bold leading-tight line-clamp-2">
                        {svc.laymanName}
                      </span>
                      <span className="service-explained-card__subtitle block text-[10px] sm:text-[11px] mt-0.5 line-clamp-1">
                        {svc.legacyName}
                      </span>
                    </span>
                    <ChevronRight
                      className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              );
            })}
          </div>

          {visibleServices.length > 1 ? (
            <div
              className="mt-4 flex gap-1.5 justify-center"
              role="group"
              aria-label={`${section.title} progress`}
            >
              {visibleServices.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveService(idx)}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300 touch-target !min-h-0 !min-w-0 px-0',
                    idx === activeService ? 'w-6 bg-brand-400' : 'w-1.5 bg-glass-border/80 hover:bg-muted/60'
                  )}
                  aria-label={`Go to ${s.laymanName}`}
                />
              ))}
            </div>
          ) : null}
        </ScrollReveal>
      </div>
    </section>
  );
};

export default AboutFeatures;
