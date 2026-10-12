"use client";

import { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";

/** Lenis smooth scroll, disabled entirely under prefers-reduced-motion. */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setEnabled(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (!enabled) return <>{children}</>;

  return (
    <ReactLenis root options={{ duration: 1.1, easing: (t: number) => 1 - Math.pow(1 - t, 3) }}>
      {children}
    </ReactLenis>
  );
}
