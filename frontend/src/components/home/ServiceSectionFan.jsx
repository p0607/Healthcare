import CarePillarOrbit from './CarePillarOrbit.jsx';

/** Hero care-area picker — interactive orbit layout (replaces casino fan deck). */
export default function ServiceSectionFan({ onActivateSection, serviceSections }) {
  return (
    <div className="hero-care-pillars w-full">
      <CarePillarOrbit onActivateSection={onActivateSection} serviceSections={serviceSections} />
    </div>
  );
}
