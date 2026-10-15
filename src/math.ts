export const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));
