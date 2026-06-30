import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart } from 'lucide-react';

export default function FloatingContinueToCartBar({
  visible,
  count = 0,
  onContinue,
  label = 'Continue to cart',
}) {
  useEffect(() => {
    if (!visible) return undefined;
    document.body.classList.add('has-floating-cart-cta');
    return () => document.body.classList.remove('has-floating-cart-cta');
  }, [visible]);

  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <div className="floating-continue-cart" role="region" aria-label="Continue to cart">
      <div className="floating-continue-cart__inner">
        <p className="floating-continue-cart__meta">
          <span className="floating-continue-cart__count">{count}</span>
          {count === 1 ? 'service selected' : 'services selected'}
        </p>
        <button type="button" className="floating-continue-cart__btn" onClick={onContinue}>
          <ShoppingCart className="w-4 h-4 shrink-0" aria-hidden />
          <span>{label}</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
