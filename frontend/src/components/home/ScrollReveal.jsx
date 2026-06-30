import { useScrollReveal } from '../../hooks/useScrollReveal.js';
import { cn } from '../../lib/utils';

const ScrollReveal = ({ children, className = '', delay = 0, as: Tag = 'div', root = null }) => {
  const [ref, visible] = useScrollReveal({ root });
  const Component = Tag;

  return (
    <Component
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out will-change-transform',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
        className
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Component>
  );
};

export default ScrollReveal;
