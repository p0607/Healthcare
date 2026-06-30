import { useEffect, useState } from 'react';



/** Thin radial progress ring — light track, red (or green) arc, percent in center. */

const ProfileCompletionPie = ({ completion, size = 96, className = '' }) => {

  const { percent = 0 } = completion || {};

  const isComplete = percent >= 100;

  const clamped = Math.min(100, Math.max(0, Math.round(percent)));

  const [animated, setAnimated] = useState(0);



  useEffect(() => {

    setAnimated(0);

    const id = requestAnimationFrame(() => setAnimated(clamped));

    return () => cancelAnimationFrame(id);

  }, [clamped]);



  const stroke = Math.max(3, Math.round(size * 0.055));

  const center = size / 2;

  const radius = (size - stroke) / 2;

  const circumference = 2 * Math.PI * radius;

  const dashOffset = circumference - (animated / 100) * circumference;



  const progressColor = isComplete ? '#22c55e' : '#ef4444';

  return (

    <div

      className={`relative shrink-0 text-muted/35 ${className}`}

      style={{ width: size, height: size }}

      role="img"

      aria-label={`Profile ${clamped} percent complete`}

    >

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" aria-hidden>

        <circle

          cx={center}

          cy={center}

          r={radius}

          fill="none"

          stroke="currentColor"

          strokeWidth={stroke}

        />

        {animated > 0 && (

          <circle

            cx={center}

            cy={center}

            r={radius}

            fill="none"

            stroke={progressColor}

            strokeWidth={stroke}

            strokeLinecap="butt"

            strokeDasharray={circumference}

            strokeDashoffset={dashOffset}

            transform={`rotate(-90 ${center} ${center})`}

            className="transition-[stroke-dashoffset] duration-[650ms] ease-out"

          />

        )}

        <text

          x={center}

          y={center}

          textAnchor="middle"

          dominantBaseline="central"

          className="fill-foreground font-semibold tabular-nums"

          style={{ fontSize: size * 0.22, fontFamily: 'inherit' }}

        >

          {clamped}%

        </text>

      </svg>

    </div>

  );

};



export default ProfileCompletionPie;


