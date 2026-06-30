import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './BounceCards.css';

function buildCasinoTransform(deg, lift = 0, scale = 1) {
  const y = lift ? ` translateY(${lift}px)` : '';
  const s = scale !== 1 ? ` scale(${scale})` : '';
  return `translateX(-50%) rotate(${deg}deg)${y}${s}`;
}

function useResponsiveFanSpread(baseSpread) {
  const [spread, setSpread] = useState(baseSpread);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setSpread(baseSpread * 0.78);
      else if (w < 1024) setSpread(baseSpread * 0.9);
      else setSpread(baseSpread);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [baseSpread]);

  return spread;
}

export default function BounceCards({
  className = '',
  images = [],
  items,
  renderItem,
  containerWidth = 400,
  containerHeight = 400,
  animationDelay = 0.5,
  animationStagger = 0.06,
  easeType = 'elastic.out(1, 0.8)',
  transformStyles,
  enableHover = true,
  casinoFan = false,
  fanSpread = 42,
  /** "center" stacks middle cards on top; "leftFirst" puts idx 0 on top reading left→right */
  fanStack = 'center',
}) {
  const containerRef = useRef(null);
  const hoveredIdxRef = useRef(null);
  const activeSpread = useResponsiveFanSpread(fanSpread);
  const cardEntries = items ?? images;
  const count = cardEntries.length;
  const isCustomContent = Boolean(renderItem && items);

  const casinoRotations = useMemo(() => {
    if (!casinoFan || count === 0) return [];
    if (count === 1) return [0];
    return Array.from(
      { length: count },
      (_, i) => -activeSpread + (2 * activeSpread * i) / (count - 1)
    );
  }, [casinoFan, count, activeSpread]);

  const casinoCenterIdx = useMemo(() => (count - 1) / 2, [count]);

  const casinoZIndex = (idx) => {
    if (fanStack === 'leftFirst') return count - idx + 1;
    if (fanStack === 'rightFirst') return idx + 1;
    return count - Math.abs(idx - casinoCenterIdx) + 1;
  };

  const baseTransforms = useMemo(() => {
    if (casinoFan) {
      return casinoRotations.map((deg) => buildCasinoTransform(deg));
    }
    return transformStyles;
  }, [casinoFan, casinoRotations, transformStyles]);

  useEffect(() => {
    if (!containerRef.current || count === 0) return undefined;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.card',
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          stagger: animationStagger,
          ease: easeType,
          delay: animationDelay,
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [animationStagger, easeType, animationDelay, count]);

  const pushSiblings = (hoveredIdx) => {
    if (!enableHover || !containerRef.current) return;
    if (hoveredIdxRef.current === hoveredIdx) return;
    hoveredIdxRef.current = hoveredIdx;

    const q = gsap.utils.selector(containerRef);

    cardEntries.forEach((_, i) => {
      const target = q(`.card-${i}`);
      gsap.killTweensOf(target);

      if (casinoFan) {
        const baseDeg = casinoRotations[i] ?? 0;
        if (i === hoveredIdx) {
          gsap.to(target, {
            transform: buildCasinoTransform(baseDeg, -18, 1.04),
            zIndex: count + 2,
            duration: 0.32,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        } else {
          gsap.to(target, {
            transform: buildCasinoTransform(baseDeg),
            zIndex: casinoZIndex(i),
            duration: 0.32,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        }
        return;
      }

      const baseTransform = baseTransforms[i] || 'none';

      if (i === hoveredIdx) {
        const noRotationTransform = baseTransform.replace(/rotate\([\s\S]*?\)/, 'rotate(0deg)');
        gsap.to(target, {
          transform: noRotationTransform,
          duration: 0.4,
          ease: 'back.out(1.4)',
          overwrite: 'auto',
        });
      } else {
        const translateRegex = /translate\(([-0-9.]+)px\)/;
        const match = baseTransform.match(translateRegex);
        const offsetX = i < hoveredIdx ? -160 : 160;
        let pushedTransform = baseTransform;
        if (match) {
          const newX = parseFloat(match[1]) + offsetX;
          pushedTransform = baseTransform.replace(translateRegex, `translate(${newX}px)`);
        } else if (baseTransform === 'none') {
          pushedTransform = `translate(${offsetX}px)`;
        } else {
          pushedTransform = `${baseTransform} translate(${offsetX}px)`;
        }
        gsap.to(target, {
          transform: pushedTransform,
          duration: 0.4,
          ease: 'back.out(1.4)',
          delay: Math.abs(hoveredIdx - i) * 0.05,
          overwrite: 'auto',
        });
      }
    });
  };

  const resetSiblings = () => {
    if (!enableHover || !containerRef.current) return;
    hoveredIdxRef.current = null;

    const q = gsap.utils.selector(containerRef);

    cardEntries.forEach((_, i) => {
      const target = q(`.card-${i}`);
      gsap.killTweensOf(target);
      gsap.to(target, {
        transform: baseTransforms[i] || 'none',
        zIndex: casinoFan ? casinoZIndex(i) : i + 1,
        duration: casinoFan ? 0.32 : 0.4,
        ease: casinoFan ? 'power2.out' : 'back.out(1.4)',
        overwrite: 'auto',
      });
    });
  };

  if (count === 0) return null;

  return (
    <div
      className={`bounceCardsContainer${casinoFan ? ' casino-fan' : ''} ${className}`}
      ref={containerRef}
      onMouseLeave={casinoFan ? resetSiblings : undefined}
      style={{
        position: 'relative',
        width: containerWidth,
        height: containerHeight,
        maxWidth: '100%',
      }}
    >
      {cardEntries.map((entry, idx) => (
        <div
          key={items?.[idx]?.id ?? `card-${idx}`}
          className={`card card-${idx}${isCustomContent ? ' service-card' : ''}`}
          style={{
            transform: baseTransforms[idx] ?? 'none',
            zIndex: casinoFan ? casinoZIndex(idx) : idx + 1,
          }}
          onMouseEnter={() => pushSiblings(idx)}
          onMouseLeave={casinoFan ? undefined : resetSiblings}
          onFocus={() => pushSiblings(idx)}
          onBlur={casinoFan ? undefined : resetSiblings}
        >
          {isCustomContent ? (
            renderItem(entry, idx)
          ) : (
            <img className="image" src={entry} alt={`card-${idx}`} />
          )}
        </div>
      ))}
    </div>
  );
}
