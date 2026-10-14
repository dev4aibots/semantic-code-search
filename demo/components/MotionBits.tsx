"use client";

import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion, useInView, useReducedMotion } from "motion/react";

/** Single motion language for the demo: quiet, cancellable, reduced-motion aware. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Quiet reveal-on-scroll for section furniture. Transform/opacity only. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const reduce = useReducedMotion();
  const Tag = (motion as any)[as] ?? motion.div;
  if (reduce) {
    const Plain = as as any;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.5, delay, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </Tag>
  );
}

type TickerProps = {
  value: number;
  format: (v: number) => string;
  label: string;
  duration?: number;
};

/** Number-ticker: counts up when scrolled into view, then rests.
 *  Renders the final value on first paint so there is no 0-flash
 *  during page load; the accessible name (aria-label) already
 *  carries the final value throughout the animation. */
export function NumberTicker({ value, format, label, duration = 1.1 }: TickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-32px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduce]);

  return (
    <div className="stat" role="listitem" ref={ref}>
      <div className="stat-value tnum" aria-label={`${label}: ${format(value)}`}>
        {format(display)}
      </div>
      <div className="stat-label t-footnote">{label}</div>
    </div>
  );
}
