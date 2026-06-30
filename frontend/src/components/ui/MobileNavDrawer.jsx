import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Slide-in panel for phone navigation. Hidden from md breakpoint up (pass breakpointClass to override).
 */
const MobileNavDrawer = ({
  open,
  onClose,
  title = 'Menu',
  children,
  className = '',
  breakpointClass = 'md:hidden',
}) => {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={cn(breakpointClass, className)} aria-hidden={!open}>
      <div
        className={cn(
          'fixed inset-0 z-[190] bg-black/55 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed top-0 right-0 z-[200] flex h-full w-[min(100vw,20rem)] flex-col border-l border-glass-border/60 bg-[rgb(var(--glass)/0.98)] backdrop-blur-2xl shadow-2xl transition-transform duration-300 ease-out pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3 border-b border-glass-border/50 px-4 py-3 shrink-0">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-glass-border/60 text-muted hover:text-foreground hover:bg-glass/50 transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3">{children}</div>
      </aside>
    </div>
  );
};

export default MobileNavDrawer;
