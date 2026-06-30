import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BotAvatar } from './PatientDashboardCareTabs.jsx';

const POPUP_DELAY_MS = 60_000;

export default function BotFloatingPopup({ onOpen }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return undefined;
    const timer = window.setTimeout(() => setVisible(true), POPUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [dismissed]);

  if (!visible || dismissed) return null;

  return (
    <div className={cn('bot-floating-popup')} role="complementary" aria-label="Care assistant">
      <button
        type="button"
        className="bot-floating-popup__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss assistant"
      >
        <X className="w-3.5 h-3.5" aria-hidden />
      </button>
      <button type="button" className="bot-floating-popup__avatar-btn" onClick={onOpen} aria-label="Open care assistant">
        <BotAvatar className="bot-floating-popup__avatar" alt="" />
      </button>
      <p className="bot-floating-popup__hint">Need help?</p>
    </div>
  );
}
