"use client";

import { MotionProvider } from "./MotionBits";
import SmoothScroll from "./SmoothScroll";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <SmoothScroll>{children}</SmoothScroll>
    </MotionProvider>
  );
}
