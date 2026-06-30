import { useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

const THRESHOLD = 0.88;

/**
 * Red slide-to-confirm SOS control.
 * @param {{ onActivate: () => void, compact?: boolean }} props
 */
export default function SosSlideControl({
  onActivate,
  compact = false,
  className,
  slideLabel,
  thumbClassName,
}) {
  const trackRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [activated, setActivated] = useState(false);

  const reset = useCallback(() => {
    setDragX(0);
    setDragging(false);
    setActivated(false);
  }, []);

  const finishDrag = useCallback(
    (clientX) => {
      const track = trackRef.current;
      if (!track) return reset();
      const rect = track.getBoundingClientRect();
      const max = Math.max(rect.width - 36, 1);
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left - 18) / max));
      if (ratio >= THRESHOLD) {
        setActivated(true);
        setDragX(max);
        onActivate?.();
        window.setTimeout(reset, 1200);
        return;
      }
      reset();
    },
    [onActivate, reset]
  );

  const onPointerDown = (e) => {
    if (activated) return;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    finishDrag(e.clientX);
  };

  const onPointerMove = (e) => {
    if (!dragging || activated) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const max = Math.max(rect.width - 36, 1);
    const x = Math.min(max, Math.max(0, e.clientX - rect.left - 18));
    setDragX(x);
  };

  const onPointerUp = (e) => {
    if (!dragging) return;
    finishDrag(e.clientX);
  };

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative flex-1 min-w-0 h-9 rounded-lg border border-rose-300 bg-rose-50 overflow-hidden select-none touch-none',
        compact && 'h-8',
        className
      )}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-rose-700">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
        {slideLabel || (compact ? 'SOS' : 'Slide for SOS')}
      </span>
      <button
        type="button"
        className={cn(
          'absolute top-0.5 left-0.5 z-10 flex h-8 w-9 items-center justify-center rounded-md bg-rose-600 text-white shadow-md transition-colors',
          dragging && 'cursor-grabbing',
          activated && 'bg-rose-800',
          thumbClassName
        )}
        style={{ transform: `translateX(${dragX}px)` }}
        onPointerDown={onPointerDown}
        aria-label="Slide for SOS emergency"
      >
        <AlertTriangle className="w-4 h-4" aria-hidden />
      </button>
      <div
        className="absolute inset-y-0 left-0 bg-rose-200/80 pointer-events-none transition-[width]"
        style={{ width: `${dragX + 36}px` }}
        aria-hidden
      />
    </div>
  );
}
