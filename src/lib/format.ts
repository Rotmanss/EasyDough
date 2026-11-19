/** Display formatting. Rounding happens ONLY here, never in calculations. */

const cache = new Map<string, Intl.NumberFormat>();

function formatter(maxDecimals: number, minDecimals: number): Intl.NumberFormat {
  const key = `${maxDecimals}:${minDecimals}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: minDecimals,
    });
    cache.set(key, f);
  }
  return f;
}

export function formatNumber(n: number, maxDecimals = 1, minDecimals = 0): string {
  if (!Number.isFinite(n)) return '—';
  const out = formatter(maxDecimals, minDecimals).format(n);
  // Avoid "-0" after rounding tiny negatives.
  return /^-0([.,]0*)?$/.test(out) ? out.slice(1) : out;
}

/** Ingredient grams for cards and tables (1 decimal). */
export const grams = (n: number) => `${formatNumber(n, 1)} g`;

/** Percentages for cards and tables (1 decimal). */
export const percent = (n: number | null) => (n === null ? '—' : `${formatNumber(n, 1)}%`);

/** Higher-precision variants used inside formula explanations. */
export const gramsPrecise = (n: number) => `${formatNumber(n, 3)} g`;
export const percentPrecise = (n: number | null) => (n === null ? '—' : `${formatNumber(n, 2)}%`);
export const num = (n: number, decimals = 3) => formatNumber(n, decimals);

/** Fine sea / table salt; coarse or kosher salt is lighter per spoon. */
export const SALT_GRAMS_PER_TSP = 6;

const QUARTERS = ['', '¼', '½', '¾'] as const;

/** Kitchen-spoon approximation rounded to the nearest ¼ tsp, e.g. "1¾ tsp". */
export function teaspoons(g: number, gramsPerTsp = SALT_GRAMS_PER_TSP): string {
  if (!Number.isFinite(g) || g <= 0) return '0 tsp';
  const quarters = Math.round((g / gramsPerTsp) * 4);
  if (quarters === 0) return '< ¼ tsp';
  const whole = Math.floor(quarters / 4);
  return `${whole > 0 ? whole : ''}${QUARTERS[quarters % 4]} tsp`;
}

/** Value placed into an <input>: dot decimal, no grouping, up to 4 decimals. */
export function toInputText(n: number): string {
  if (!Number.isFinite(n)) return '';
  return String(Math.round(n * 10000) / 10000);
}

/** Accepts "62.5", "62,5" and surrounding spaces. Returns NaN for empty/invalid. */
export function parseDecimal(text: string): number {
  const t = text.trim().replace(',', '.');
  if (t === '' || !/^-?\d*\.?\d*$/.test(t) || t === '.' || t === '-') return NaN;
  return Number(t);
}
