import { cn } from '../../lib/utils';

export const BOT_AVATAR_SRC = '/images/bot-avatar.png';

const CARE_TABS = [
  { id: 'homecare', label: 'Homecare' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'health_monitor', label: 'Health monitor', shortLabel: 'Monitor' },
];

export function BotAvatar({ className, alt = 'Care assistant bot' }) {
  return <img src={BOT_AVATAR_SRC} alt={alt} className={cn('object-contain', className)} draggable={false} />;
}

export default function PatientDashboardCareTabs({ activeTab, onTabChange }) {
  return (
    <div className="dashboard-care-tabs" role="tablist" aria-label="Care categories">
      <div className="dashboard-care-tabs__pills">
        {CARE_TABS.map(({ id, label, shortLabel }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(id)}
              className={cn('dashboard-care-tab', active && 'dashboard-care-tab--active')}
            >
              {shortLabel ? (
                <>
                  <span className="dashboard-care-tab__label dashboard-care-tab__label--short">{shortLabel}</span>
                  <span className="dashboard-care-tab__label dashboard-care-tab__label--full">{label}</span>
                </>
              ) : (
                <span className="dashboard-care-tab__label">{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
