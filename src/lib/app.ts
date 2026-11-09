export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Split";

export function appUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return base + path;
}

export function splitUrl(shortCode: string): string {
  return appUrl(`/s/${shortCode}`);
}

/** Display-friendly link without the protocol, e.g. split.app/s/x7k2 */
export function splitUrlShort(shortCode: string): string {
  return splitUrl(shortCode).replace(/^https?:\/\//, "");
}
