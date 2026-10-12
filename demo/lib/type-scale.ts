/* Vendored from AleksandrHovhannisyan/fluid-type-scale-calculator (MIT).
 * Source: src/lib/schema/schema.utils.ts (getTypeScale) + src/lib/utils.ts
 * (clamp, toCommaSeparatedList). Copied 2026-10-12; only the pure,
 * dependency-free math is kept. LICENSE: MIT (see repo).
 *
 * Usage: call generateScale() below to emit the demo's :root custom
 * properties as clamp() values (ratio 1.200-1.333, 5 steps max per the
 * design-overhaul anti-slop rules). The generated output is committed in
 * app/globals.css under "Fluid type scale".
 */

export type ScaleConfig = {
  minFontSize: number;
  maxFontSize: number;
  minWidth: number;
  maxWidth: number;
  minRatio: number;
  maxRatio: number;
  steps: string; // comma-separated, e.g. "body,md,lg,xl,hero"
  baseStep: string; // name of the step that stays at minFontSize/maxFontSize
  decimals?: number;
};

export type ScaleStep = {
  min: string;
  max: string;
  preferred: string;
};

const clampNum = ({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}) => Math.max(Math.min(value, max), min);

const toCommaSeparatedList = (rawValue: string): string[] =>
  rawValue
    .split(",")
    .map((el) => el.trim())
    .filter((el) => !!el);

/** Vendored getTypeScale: returns a Map of step name -> fluid font-size parts. */
export const getTypeScale = (state: ScaleConfig): Map<string, ScaleStep> => {
  const decimals = state.decimals ?? 2;
  const withUnit = (unitlessValue: number) =>
    `${Number(unitlessValue.toFixed(decimals))}px`;
  const round = (val: number) => Number(val.toFixed(decimals));

  const allSteps = toCommaSeparatedList(state.steps);
  const baseStepIndex = allSteps.indexOf(state.baseStep);

  return allSteps.reduce((steps, step, i) => {
    const min = {
      fontSize: state.minFontSize * Math.pow(state.minRatio, i - baseStepIndex),
      breakpoint: state.minWidth,
    };
    const max = {
      fontSize: state.maxFontSize * Math.pow(state.maxRatio, i - baseStepIndex),
      breakpoint: state.maxWidth,
    };
    const slope = (max.fontSize - min.fontSize) / (max.breakpoint - min.breakpoint);
    const slopeVw = `${round(slope * 100)}vw`;
    const intercept = min.fontSize - slope * min.breakpoint;

    steps.set(step, {
      min: withUnit(round(min.fontSize)),
      max: withUnit(round(max.fontSize)),
      preferred: `${slopeVw} + ${withUnit(round(intercept))}`,
    });
    return steps;
    // NOTE: Map preserves insertion order.
  }, new Map<string, ScaleStep>());
};

/** Demo config: body stays 13px (Apple AppKit ramp); display steps fluid. */
export const DEMO_SCALE_CONFIG: ScaleConfig = {
  minFontSize: 13,
  maxFontSize: 13,
  minWidth: 375,
  maxWidth: 960,
  minRatio: 1.2,
  maxRatio: 1.333,
  steps: "body,md,lg,xl,hero",
  baseStep: "body",
  decimals: 2,
};

/** Emits ":root { --type-<step>: clamp(min, preferred, max); }" lines. */
export const emitCssVars = (config: ScaleConfig = DEMO_SCALE_CONFIG): string => {
  const scale = getTypeScale(config);
  const lines = [":root {"];
  for (const [step, s] of scale) {
    if (step === "body") continue;
    lines.push(`  --type-${step}: clamp(${s.min}, ${s.preferred}, ${s.max});`);
  }
  lines.push("}");
  return lines.join("\n");
};

export const _internals = { clampNum, toCommaSeparatedList };
