/** Amounts are integer PKR (no paisa). */

export function formatPKR(amount: number): string {
  return "Rs " + Math.round(amount).toLocaleString("en-PK");
}

/**
 * Equal split with exact rounding: the remainder rupees go to the first N
 * people so the shares always sum to the total.
 */
export function splitEqual(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function parseAmount(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input) : null;
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/[,\s]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  return parseInt(cleaned, 10);
}

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}
