"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

type BlurTextProps = {
  text: string;
  className?: string;
  id?: string;
  /** stagger delay between words (s) */
  stagger?: number;
  /** initial delay before the first word (s) */
  delay?: number;
};

/**
 * Hero headline reveal in the spirit of react-bits' BlurText: words resolve
 * from optical blur into crisp focus, staggered. Hand-built on `motion` so
 * the demo ships without the react-bits registry dependency; the motion
 * language stays single-library per the design contract.
 * Honors prefers-reduced-motion via useReducedMotion (renders final state).
 */
export default function BlurText({ text, className, id, stagger = 0.06, delay = 0.1 }: BlurTextProps) {
  const reduceMotion = useReducedMotion();
  const words = useMemo(() => text.split(" "), [text]);

  if (reduceMotion) {
    return <h1 className={className} id={id}>{text}</h1>;
  }

  return (
    <h1 className={className} id={id} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          <motion.span
            style={{ display: "inline-block", willChange: "transform, filter" }}
            initial={{ opacity: 0, filter: "blur(12px)", y: 10 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{
              delay: delay + i * stagger,
              duration: 0.55,
              ease: [0.32, 0.72, 0, 1],
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </h1>
  );
}
