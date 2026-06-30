import { useState } from 'react';
import { SERVICE_SECTIONS } from '../../lib/serviceSections';
import { cn } from '../../lib/utils';
import './CarePillarOrbit.css';

export default function CarePillarOrbit({ onActivateSection, serviceSections = SERVICE_SECTIONS }) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className="care-pillar-orbit">
      <div className="care-pillar-stage" onMouseLeave={() => setHoveredId(null)}>
        <div className="care-pillar-row" role="group" aria-label="Care service areas">
          {serviceSections.map((section) => {
            const Icon = section.Icon;
            const imageSrc = section.imageSrc;
            const isActive = section.id === hoveredId;

            return (
              <div
                key={section.id}
                className={cn('care-pillar-orbit-btn', isActive && 'is-active')}
                onMouseEnter={() => setHoveredId(section.id)}
                onFocus={() => setHoveredId(section.id)}
                tabIndex={0}
                role="button"
                aria-label={`${section.title}. Hover to see services`}
                onClick={() => onActivateSection?.(section.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onActivateSection?.(section.id);
                  }
                }}
              >
                <span
                  className={cn(
                    'care-pillar-orbit-btn__tile',
                    imageSrc ? 'care-pillar-orbit-btn__tile--photo' : cn('bg-gradient-to-br', section.accent)
                  )}
                  style={
                    imageSrc
                      ? {
                          borderColor: section.imageBorderColor || '#e5e7eb',
                          backgroundImage: `url(${imageSrc})`,
                        }
                      : undefined
                  }
                  aria-hidden={Boolean(imageSrc)}
                >
                  {!imageSrc && (
                    <Icon className="care-pillar-orbit-btn__icon w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.75} />
                  )}
                </span>

                {isActive ? (
                  <div className="orbit-hover-panel">
                    <button
                      type="button"
                      className="orbit-hover-explore"
                      onClick={(e) => {
                        e.stopPropagation();
                        onActivateSection?.(section.id);
                      }}
                    >
                      Explore {section.title} →
                    </button>
                    <ul className="orbit-hover-services" aria-label={`${section.title} services`}>
                      {section.services.map((svc) => (
                        <li key={svc.id}>{svc.laymanName}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <span className="care-pillar-orbit-btn__label">{section.title}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
