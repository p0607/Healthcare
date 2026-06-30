import { useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

const THUMB_PAD = 3;
const THUMB_SIZE = 30;
const ACTIVATE_RATIO = 0.88;

/**
 * Neumorphic slide-to-confirm emergency control (red).
 */
export default function EmergencyPillSlider({ onActivate, className }) {
  const trackRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [activated, setActivated] = useState(false);

  const reset = useCallback(() => {
    setDragX(0);
    setDragging(false);
    setActivated(false);
  }, []);

  const getMaxDrag = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(rect.width - THUMB_SIZE - THUMB_PAD * 2, 1);
  }, []);

  const finishDrag = useCallback(
    (clientX) => {
      const track = trackRef.current;
      if (!track) return reset();
      const rect = track.getBoundingClientRect();
      const max = getMaxDrag();
      const x = Math.min(max, Math.max(0, clientX - rect.left - THUMB_PAD - THUMB_SIZE / 2));
      const ratio = x / max;

      if (ratio >= ACTIVATE_RATIO) {
        setActivated(true);
        setDragX(max);
        onActivate?.();
        window.setTimeout(reset, 1400);
        return;
      }
      reset();
    },
    [getMaxDrag, onActivate, reset]
  );

  const startDrag = useCallback(
    (e) => {
      if (activated) return;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const max = getMaxDrag();
      const x = Math.min(max, Math.max(0, e.clientX - rect.left - THUMB_PAD - THUMB_SIZE / 2));
      setDragX(x);
    },
    [activated, getMaxDrag]
  );

  const onPointerMove = (e) => {
    if (!dragging || activated) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const max = getMaxDrag();
    const x = Math.min(max, Math.max(0, e.clientX - rect.left - THUMB_PAD - THUMB_SIZE / 2));
    setDragX(x);
  };

  const onPointerUp = (e) => {
    if (!dragging) return;
    finishDrag(e.clientX);
  };

  return (
    <div className={cn('emergency-slide shrink-0', className)}>
      <div
        ref={trackRef}
        className={cn(
          'emergency-slide__track',
          dragging && 'emergency-slide__track--dragging',
          activated && 'emergency-slide__track--active'
        )}
        onPointerDown={startDrag}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label="Slide right for emergency SOS"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={activated ? 100 : dragX > 0 ? 50 : 0}
      >
        <span className="emergency-slide__label" aria-hidden>
          Emergency
        </span>
        <span
          className="emergency-slide__progress"
          style={{ width: `${dragX + THUMB_SIZE + THUMB_PAD}px` }}
          aria-hidden
        />
        <span
          className={cn('emergency-slide__thumb', dragging && 'emergency-slide__thumb--dragging')}
          style={{ transform: `translateX(${dragX}px)` }}
          aria-hidden
        >
          <AlertTriangle className="emergency-slide__icon" strokeWidth={2.25} aria-hidden />
        </span>
      </div>
    </div>
  );
}
