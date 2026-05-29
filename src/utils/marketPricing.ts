export function toMarketPrice(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return price;
  const rounded = Math.round(price);
  return Math.max(0, rounded % 10 === 0 ? rounded - 1 : rounded);
}

export function applyMarketPricing(prices: number[]): number[] {
  const rounded = prices.map((p) => (Number.isFinite(p) ? Math.round(p) : p));
  const uniqueSorted = Array.from(new Set(rounded)).sort((a, b) => a - b);

  const charmedByOriginal = new Map<number, number>();
  let prevAssigned = -Infinity;

  for (const original of uniqueSorted) {
    let charmed = toMarketPrice(original);
    if (charmed <= prevAssigned) {
      charmed = prevAssigned + 1;
    }
    charmedByOriginal.set(original, charmed);
    prevAssigned = charmed;
  }

  return rounded.map((p) => charmedByOriginal.get(p) ?? p);
}
