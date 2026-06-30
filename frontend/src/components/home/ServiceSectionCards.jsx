import { ChevronRight } from 'lucide-react';
import { SERVICE_SECTIONS } from '../../lib/serviceSections';
import { cn } from '../../lib/utils';
import './ServiceSectionCards.css';

export default function ServiceSectionCards({ className, variant = 'section', onActivate, serviceSections = SERVICE_SECTIONS }) {
  const isHero = variant === 'hero';

  return (
    <div
      className={cn(
        'service-section-grid',
        isHero ? 'service-section-grid--hero' : 'service-section-grid--section',
        className
      )}
    >
      {serviceSections.map((section) => {
        const Icon = section.Icon;

        return (
          <button
            key={section.id}
            type="button"
            className={cn(
              'service-section-card glass-panel border bg-gradient-to-br text-left',
              section.accent
            )}
            onClick={() => onActivate?.(section.id)}
          >
            <header className="service-section-head">
              <span className="service-section-icon" aria-hidden>
                <Icon className="w-5 h-5" strokeWidth={1.8} />
              </span>
              <h3 className="service-section-title">{section.title}</h3>
            </header>

            <ul className="service-section-list">
              {section.services.map((service) => (
                <li key={service.id} className="service-section-item">
                  {service.laymanName}
                </li>
              ))}
            </ul>

            <span className="service-section-cta">
              Explore
              <ChevronRight className="w-3.5 h-3.5" aria-hidden />
            </span>
          </button>
        );
      })}
    </div>
  );
}
