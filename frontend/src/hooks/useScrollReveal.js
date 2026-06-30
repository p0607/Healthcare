import { useEffect, useRef, useState } from 'react';

/**
 * Fires once when the element enters the viewport (for scroll-in animations).
 */
export function useScrollReveal({
  threshold = 0.12,
  rootMargin = '0px 0px -8% 0px',
  root = null,
  once = true,
} = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (once && visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (once) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        } else {
          setVisible(entry.isIntersecting);
        }
      },
      { threshold, rootMargin, root: root?.current ?? null }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, visible, root, once]);

  return [ref, visible];
}

export function scrollRevealClass(visible, delayMs = 0) {
  const delay = delayMs ? `delay-[${delayMs}ms]` : '';
  return visible
    ? `opacity-100 translate-y-0 ${delay}`
    : `opacity-0 translate-y-8 pointer-events-none`;
}
