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

// Kitchen fractions: [value, display, plain text].
const SPOON_FRACTIONS = [
  [0, '', ''],
  [1 / 4, '¼', '1/4'],
  [1 / 3, '⅓', '1/3'],
  [1 / 2, '½', '1/2'],
  [2 / 3, '⅔', '2/3'],
  [3 / 4, '¾', '3/4'],
  [1, '', ''],
] as const;

/** Nearest whole + kitchen fraction (¼ ⅓ ½ ⅔ ¾); null when too small for ¼ tsp. */
function spoonParts(g: number, gramsPerTsp: number): { whole: number; frac: number } | null {
  const x = g / gramsPerTsp;
  let whole = Math.floor(x);
  let best = 0;
  SPOON_FRACTIONS.forEach(([v], i) => {
    if (Math.abs(x - whole - v) < Math.abs(x - whole - SPOON_FRACTIONS[best]![0])) best = i;
  });
  if (best === SPOON_FRACTIONS.length - 1) {
    whole += 1;
    best = 0;
  }
  return whole === 0 && best === 0 ? null : { whole, frac: best };
}

/** Kitchen-spoon approximation, e.g. "1⅔ tsp". */
export function teaspoons(g: number, gramsPerTsp = SALT_GRAMS_PER_TSP): string {
  if (!Number.isFinite(g) || g <= 0) return '0 tsp';
  const parts = spoonParts(g, gramsPerTsp);
  if (!parts) return '< ¼ tsp';
  return `${parts.whole > 0 ? parts.whole : ''}${SPOON_FRACTIONS[parts.frac]![1]} tsp`;
}

/** Same as teaspoons() in plain text, without the unit: "1 2/3". */
export function teaspoonsPlain(g: number, gramsPerTsp = SALT_GRAMS_PER_TSP): string {
  if (!Number.isFinite(g) || g <= 0) return '0';
  const parts = spoonParts(g, gramsPerTsp);
  if (!parts) return 'less than 1/4';
  const frac = SPOON_FRACTIONS[parts.frac]![2];
  return [parts.whole > 0 ? String(parts.whole) : '', frac].filter(Boolean).join(' ');
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
