import { timelineStepsFromCompletion } from '../lib/patientProfile';

const GREEN = 'bg-emerald-500';
const RED = 'bg-red-500';
const GREEN_TEXT = 'text-emerald-600';
const RED_TEXT = 'text-red-500';

/** Extended blue timeline with forward-flow animation; dots = green/red status. */
const ProfileCompletionTimeline = ({ completion, onStepClick }) => {
  const steps = timelineStepsFromCompletion(completion);

  return (
    <div className="rounded-xl border border-glass-border/50 bg-glass/20 px-1 py-2.5 sm:px-2">
      <div className="relative">
        {/* Full-width blue track — extends before first & after last dot */}
        <div className="profile-timeline-track" aria-hidden>
          <div className="profile-timeline-line" />
          <div className="profile-timeline-flow" />
        </div>

        <ol className="relative z-[1] flex list-none m-0 p-0">
          {steps.map((step) => {
            const complete = step.status === 'complete';

            return (
              <li key={step.id} className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => onStepClick?.(step.id)}
                  className={`group flex w-full flex-col items-center gap-1 ${
                    onStepClick ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  title={`${step.label}: ${complete ? 'Complete' : 'Incomplete'}`}
                  aria-label={`${step.label}: ${complete ? 'complete' : 'incomplete'}`}
                >
                  <span
                    className={`relative z-[2] block h-2.5 w-2.5 shrink-0 rounded-full border border-white shadow-sm transition-transform group-hover:scale-125 ${
                      complete ? GREEN : RED
                    }`}
                  />
                  <span
                    className={`max-w-[44px] text-center text-[7px] font-semibold leading-tight sm:text-[8px] ${
                      complete ? GREEN_TEXT : RED_TEXT
                    }`}
                  >
                    {step.shortLabel}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default ProfileCompletionTimeline;
