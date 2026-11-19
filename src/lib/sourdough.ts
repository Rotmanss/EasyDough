/**
 * Sourdough calculation engine.
 *
 * Pure functions only — no React, no DOM, no rounding. All values are grams or
 * percentages and are kept at full floating-point precision; rounding happens
 * only at display time (see format.ts).
 *
 * Hydration is ALWAYS water / flour × 100, never water / total weight.
 */

export interface Composition {
  readonly flour: number;
  readonly water: number;
}

export type IssueLevel = 'error' | 'warning';

export interface Issue {
  readonly level: IssueLevel;
  /** Input field the issue relates to, if any. */
  readonly field?: string;
  readonly message: string;
}

/** Absolute tolerance (grams / percent) used to absorb floating-point noise. */
export const TOLERANCE = 1e-9;

export const EMPTY: Composition = { flour: 0, water: 0 };

export function isValidAmount(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

function assertAmount(name: string, n: number): void {
  if (!isValidAmount(n)) {
    throw new RangeError(`${name} must be a finite, non-negative number (got ${n})`);
  }
}

/** Snap values within TOLERANCE of zero to exactly 0 (also removes -0). */
export function cleanZero(n: number): number {
  return Math.abs(n) < TOLERANCE ? 0 : n;
}

// ---------------------------------------------------------------------------
// Basic composition maths
// ---------------------------------------------------------------------------

export function weightOf(c: Composition): number {
  return c.flour + c.water;
}

/** Water / flour × 100. Returns null when there is no flour (hydration undefined). */
export function hydrationOf(c: Composition): number | null {
  if (c.flour <= 0) return null;
  return (c.water / c.flour) * 100;
}

/**
 * Split a starter (or any flour + water mix) of known weight and hydration.
 * flour = weight / (1 + hydration/100); water = weight − flour.
 */
export function compositionFromWeight(weight: number, hydrationPct: number): Composition {
  assertAmount('weight', weight);
  assertAmount('hydration', hydrationPct);
  const flour = weight / (1 + hydrationPct / 100);
  return { flour, water: cleanZero(weight - flour) };
}

/** Flour + water mix built from a flour amount at a given hydration. */
export function compositionFromFlour(flour: number, hydrationPct: number): Composition {
  assertAmount('flour', flour);
  assertAmount('hydration', hydrationPct);
  return { flour, water: (flour * hydrationPct) / 100 };
}

/** No-discard feeding: new flour and water are simply added to what is already there. */
export function addFeeding(c: Composition, flour: number, water: number): Composition {
  assertAmount('flour', flour);
  assertAmount('water', water);
  return { flour: c.flour + flour, water: c.water + water };
}

/**
 * Take a portion out of a well-mixed starter. The portion and the remainder both
 * keep the starter's hydration, so flour and water are taken proportionally.
 */
export function takePortion(
  c: Composition,
  amount: number,
): { portion: Composition; remaining: Composition } {
  assertAmount('amount', amount);
  const total = weightOf(c);
  if (amount > total + TOLERANCE) {
    throw new RangeError(`Cannot take ${amount} g from a starter weighing ${total} g`);
  }
  if (amount >= total - TOLERANCE) {
    return { portion: { ...c }, remaining: { ...EMPTY } };
  }
  const fraction = amount / total;
  const portion = { flour: c.flour * fraction, water: c.water * fraction };
  return {
    portion,
    remaining: {
      flour: cleanZero(c.flour - portion.flour),
      water: cleanZero(c.water - portion.water),
    },
  };
}

// ---------------------------------------------------------------------------
// No-discard feeding planner
// ---------------------------------------------------------------------------

export interface FeedingInput {
  /** What is in the jar right now (exact composition). */
  readonly existing: Composition;
  readonly flourToAdd: number;
  /** Desired hydration of the whole starter AFTER feeding. */
  readonly targetHydration: number;
}

export interface FeedingPlan {
  readonly existing: Composition;
  readonly flourToAdd: number;
  readonly waterToAdd: number;
  readonly final: Composition;
  readonly finalWeight: number;
  readonly finalHydration: number;
}

export interface FeedingResult {
  readonly plan: FeedingPlan | null;
  readonly issues: Issue[];
  /** Hydration reached if no water at all is added (useful when the target is too low). */
  readonly lowestReachableHydration: number | null;
  /** Minimum new flour needed to reach the target hydration without removing water. */
  readonly minimumFlourForTarget: number | null;
}

/**
 * Work out how much water to add so the WHOLE starter (old + new) lands exactly
 * on the target hydration. Uses the existing starter's real flour and water.
 *
 *   finalFlour  = existingFlour + newFlour
 *   finalWater  = finalFlour × target/100
 *   waterToAdd  = finalWater − existingWater
 */
export function planFeeding(input: FeedingInput): FeedingResult {
  const { existing, flourToAdd, targetHydration } = input;
  const issues: Issue[] = [];

  if (!isValidAmount(existing.flour) || !isValidAmount(existing.water)) {
    issues.push({ level: 'error', field: 'existing', message: 'Enter a valid starter weight and hydration.' });
  }
  if (!isValidAmount(flourToAdd)) {
    issues.push({ level: 'error', field: 'flourToAdd', message: 'Enter how much flour you will add (0 or more).' });
  }
  if (!isValidAmount(targetHydration)) {
    issues.push({ level: 'error', field: 'targetHydration', message: 'Enter a desired hydration (0% or more).' });
  }
  if (issues.length > 0) {
    return { plan: null, issues, lowestReachableHydration: null, minimumFlourForTarget: null };
  }

  const finalFlour = existing.flour + flourToAdd;
  if (finalFlour <= 0) {
    issues.push({ level: 'error', field: 'flourToAdd', message: 'There is no flour to feed — add some flour.' });
    return { plan: null, issues, lowestReachableHydration: null, minimumFlourForTarget: null };
  }

  const lowestReachableHydration = (existing.water / finalFlour) * 100;
  const minimumFlourForTarget =
    targetHydration > 0
      ? Math.max(0, existing.water / (targetHydration / 100) - existing.flour)
      : existing.water > 0
        ? null
        : 0;

  const waterToAdd = cleanZero(finalFlour * (targetHydration / 100) - existing.water);

  if (waterToAdd < 0) {
    const fix =
      minimumFlourForTarget === null
        ? '0% hydration is impossible while the starter contains water.'
        : `To reach ${round2(targetHydration)}% you need to add at least ${round2(minimumFlourForTarget)} g flour.`;
    issues.push({
      level: 'error',
      field: 'targetHydration',
      message:
        `Your starter already holds ${round2(existing.water)} g water. With ${round2(flourToAdd)} g new flour, ` +
        `the lowest hydration you can reach (adding no water) is ${round2(lowestReachableHydration)}%. ${fix}`,
    });
    return { plan: null, issues, lowestReachableHydration, minimumFlourForTarget };
  }

  const final = { flour: finalFlour, water: existing.water + waterToAdd };
  const finalHydration = hydrationOf(final) ?? 0;

  if (flourToAdd === 0 && waterToAdd === 0) {
    issues.push({ level: 'warning', message: 'Nothing is being added — the starter is already at this hydration.' });
  }

  return {
    plan: {
      existing,
      flourToAdd,
      waterToAdd,
      final,
      finalWeight: weightOf(final),
      finalHydration,
    },
    issues,
    lowestReachableHydration,
    minimumFlourForTarget,
  };
}

// ---------------------------------------------------------------------------
// Levain build: starter (fridge) + flour + water → levain → dough + back to fridge
// ---------------------------------------------------------------------------

export interface LevainInput {
  /** Starter taken out of the fridge jar to seed the levain (exact composition). */
  readonly seed: Composition;
  readonly levainHydration: number;
  /** Levain that goes into the dough. */
  readonly forDough: number;
  /** Levain returned to the fridge — next time's starter. Ignored when `flourRatio` is set. */
  readonly backToFridge: number;
  /** Optional: flour to add per 1 g of starter (1 : 2 → 2). Then "back to the fridge" is whatever is left. */
  readonly flourRatio?: number | null;
}

export interface LevainPlan {
  readonly seed: Composition;
  readonly flourToAdd: number;
  readonly waterToAdd: number;
  readonly levain: Composition;
  readonly levainWeight: number;
  readonly levainHydration: number;
  readonly forDough: Composition;
  readonly backToFridge: Composition;
  /** Feed as starter : flour : water with starter = 1. Null when no starter is used. */
  readonly ratio: readonly [number, number, number] | null;
}

export interface LevainResult {
  readonly plan: LevainPlan | null;
  readonly issues: Issue[];
  /** Smallest levain that can be built from this starter at this hydration (when too small). */
  readonly minimumLevain: number | null;
}

/**
 * The levain must end at weight L = forDough + backToFridge and hydration h:
 *   levain flour = L ÷ (1 + h),  levain water = L − levain flour
 *   flour to add = levain flour − starter flour,  water to add = levain water − starter water
 * The part returned to the fridge has the levain's hydration.
 */
export function planLevain(input: LevainInput): LevainResult {
  const { seed, levainHydration, forDough } = input;
  const byRatio = input.flourRatio !== undefined && input.flourRatio !== null;
  const issues: Issue[] = [];
  const err = (field: string, message: string) => issues.push({ level: 'error', field, message });
  const fail = (minimumLevain: number | null = null) => ({ plan: null, issues, minimumLevain });

  if (!isValidAmount(seed.flour) || !isValidAmount(seed.water)) err('seed', 'Enter how much starter you take and how wet it is.');
  else if (seed.water > seed.flour * (MAX_HYDRATION / 100) + TOLERANCE) {
    err('seed', `Starter hydration must be 0–${MAX_HYDRATION}%.`);
  }
  if (!isValidHydration(levainHydration)) err('levainHydration', `Levain hydration must be 0–${MAX_HYDRATION}%.`);
  if (!isValidAmount(forDough)) err('forDough', 'Enter how much levain the dough needs.');
  if (byRatio) {
    if (!isValidAmount(input.flourRatio)) err('flourRatio', 'Enter the flour ratio.');
    else if (issues.length === 0 && weightOf(seed) <= 0) err('flourRatio', 'A flour ratio needs some starter.');
  } else if (!isValidAmount(input.backToFridge)) {
    err('backToFridge', 'Enter how much goes back to the fridge.');
  }
  if (issues.length > 0) return fail();

  const h = levainHydration / 100;
  let backToFridge = input.backToFridge;
  if (byRatio) {
    const seedWeight = weightOf(seed);
    const ratioTotal = (seed.flour + seedWeight * (input.flourRatio as number)) * (1 + h);
    backToFridge = cleanZero(ratioTotal - forDough);
    if (backToFridge < 0) {
      const minRatio = Math.max(0, (forDough / (1 + h) - seed.flour) / seedWeight);
      err(
        'flourRatio',
        `This makes only ${round2(ratioTotal)} g of levain, but the dough needs ${round2(forDough)} g. ` +
          `Use at least 1 : ${round2(Math.ceil(minRatio * 100) / 100)}.`,
      );
      return fail();
    }
  }

  const total = forDough + backToFridge;
  if (total <= 0) {
    err('forDough', 'Enter how much levain the dough needs.');
    return fail();
  }

  const levainFlour = total / (1 + h);
  const levainWater = total - levainFlour;
  const flourToAdd = cleanZero(levainFlour - seed.flour);
  const waterToAdd = cleanZero(levainWater - seed.water);
  const seedWeight = weightOf(seed);

  if (flourToAdd < 0 || waterToAdd < 0) {
    const minimumLevain = Math.max(
      seed.flour * (1 + h),
      h > 0 ? (seed.water * (1 + h)) / h : seed.water > 0 ? Infinity : 0,
    );
    const what = flourToAdd < 0 ? 'flour' : 'water';
    const fix = Number.isFinite(minimumLevain)
      ? `Take less starter, or make at least ${round2(minimumLevain)} g of levain.`
      : 'Take less starter.';
    err('seed', `${round2(seedWeight)} g of starter has too much ${what} for ${round2(total)} g of ${round2(levainHydration)}% levain. ${fix}`);
    return fail(minimumLevain);
  }

  const levain = { flour: seed.flour + flourToAdd, water: seed.water + waterToAdd };
  const split = takePortion(levain, Math.min(forDough, weightOf(levain)));

  if (seedWeight === 0) {
    issues.push({ level: 'warning', field: 'seed', message: 'Without starter, the levain will not rise.' });
  }

  return {
    plan: {
      seed,
      flourToAdd,
      waterToAdd,
      levain,
      levainWeight: weightOf(levain),
      levainHydration: hydrationOf(levain) ?? 0,
      forDough: split.portion,
      backToFridge: split.remaining,
      ratio: seedWeight > 0 ? [1, flourToAdd / seedWeight, waterToAdd / seedWeight] : null,
    },
    issues,
    minimumLevain: null,
  };
}

// ---------------------------------------------------------------------------
// Recipe calculator — flour you add is the master variable, levain is a % of it
// ---------------------------------------------------------------------------

/** 'dry' (seeds, nuts) adds weight only; 'liquid' (milk, honey, butter) also brings water that counts in hydration. */
export type ExtraKind = 'dry' | 'liquid';

export interface ExtraIngredient {
  readonly id: string;
  readonly name: string;
  /** Baker's percentage (of total flour). */
  readonly percent: number;
  readonly kind: ExtraKind;
  /** For liquids: share of the ingredient that is water (milk ≈ 87%, honey ≈ 17%, butter ≈ 16%). */
  readonly waterPercent: number;
}

/** A named part of the dough flour (e.g. whole wheat, rye). */
export interface FlourType {
  readonly id: string;
  readonly name: string;
  /** % of the dough flour (`RecipeInput.flour`). */
  readonly percent: number;
}

export interface RecipeInput {
  /** Flour you weigh into the dough — NOT counting the flour inside the levain. */
  readonly flour: number;
  /** Optional parts of `flour`; whatever is left is the main flour. */
  readonly flourTypes: readonly FlourType[];
  /** Total water ÷ total flour (levain included). */
  readonly doughHydration: number;
  /** Levain weight as a % of `flour`. */
  readonly levainPercent: number;
  readonly levainHydration: number;
  /** % of total flour. */
  readonly saltPercent: number;
  readonly extras: readonly ExtraIngredient[];
}

export interface RecipeLevain extends Composition {
  readonly weight: number;
  readonly hydration: number;
}

export interface RecipeExtraLine extends ExtraIngredient {
  readonly weight: number;
  /** Water this extra brings into the dough (0 for dry extras). */
  readonly water: number;
}

export interface RecipeFlourLine extends FlourType {
  readonly weight: number;
}

export interface Recipe {
  /** Flour to weigh (excluding levain) = mainFlour + all flour types. */
  readonly flour: number;
  /** Flour left after the flour types are taken out. */
  readonly mainFlour: number;
  readonly flourTypes: readonly RecipeFlourLine[];
  /** Water to weigh (excluding levain and liquid extras). */
  readonly water: number;
  readonly levain: RecipeLevain;
  readonly levainPercent: number;
  readonly totalFlour: number;
  readonly totalWater: number;
  readonly doughHydration: number;
  readonly saltPercent: number;
  readonly salt: number;
  readonly extras: readonly RecipeExtraLine[];
  readonly extrasWeight: number;
  /** Water brought by liquid extras; part of totalWater. */
  readonly extrasWater: number;
  readonly doughWeight: number;
}

export interface RecipeResult {
  readonly recipe: Recipe | null;
  readonly issues: Issue[];
  /** Highest levain % that keeps the water to add ≥ 0 (Infinity when never limited). */
  readonly maxLevainPercent: number | null;
}

/**
 * With p = levain %, a = levain hydration, d = dough hydration (as decimals):
 * water to add ≥ 0  ⇔  p·(a − d) ≤ d·(1 + a). Only a levain wetter than the dough can hit the limit.
 */
export function maxLevainPercent(doughHydration: number, levainHydration: number): number {
  const a = levainHydration / 100;
  const d = doughHydration / 100;
  return a > d ? ((d * (1 + a)) / (a - d)) * 100 : Infinity;
}

/** Above this levain % (of the flour) the recipe gets a gentle warning. */
export const MAX_COMFORTABLE_LEVAIN_PERCENT = 40;

/** Highest hydration allowed for dough, levain and starter. */
export const MAX_HYDRATION = 100;

export function isValidHydration(n: unknown): n is number {
  return isValidAmount(n) && n <= MAX_HYDRATION;
}

export function calculateRecipe(input: RecipeInput): RecipeResult {
  const issues: Issue[] = [];
  const err = (field: string, message: string) => issues.push({ level: 'error', field, message });

  if (!isValidAmount(input.flour) || input.flour <= 0) err('flour', 'Enter the flour weight.');
  if (!isValidHydration(input.doughHydration)) err('doughHydration', `Dough hydration must be 0–${MAX_HYDRATION}%.`);
  if (!isValidAmount(input.levainPercent)) err('levainPercent', 'Enter the levain amount.');
  if (!isValidHydration(input.levainHydration)) err('levainHydration', `Levain hydration must be 0–${MAX_HYDRATION}%.`);
  if (!isValidAmount(input.saltPercent)) err('saltPercent', 'Enter the salt amount.');
  input.flourTypes.forEach((t) => {
    if (!isValidAmount(t.percent)) err(`flourType:${t.id}`, `Enter an amount for “${t.name || 'flour type'}”.`);
  });
  const flourTypesPercent = input.flourTypes.reduce((sum, t) => sum + t.percent, 0);
  if (flourTypesPercent > 100 + TOLERANCE) {
    err('flourTypes', `The flour types add up to ${round2(flourTypesPercent)}% — more than all the flour.`);
  }
  input.extras.forEach((x) => {
    const label = x.name || 'extra ingredient';
    if (!isValidAmount(x.percent)) err(`extra:${x.id}`, `Enter an amount for “${label}”.`);
    if (x.kind === 'liquid' && (!isValidAmount(x.waterPercent) || x.waterPercent > 100)) {
      err(`extra:${x.id}`, `Water in “${label}” must be between 0% and 100%.`);
    }
  });

  if (issues.length > 0) return { recipe: null, issues, maxLevainPercent: null };

  const { flour, doughHydration, levainPercent, levainHydration, saltPercent } = input;
  const maxPercent = maxLevainPercent(doughHydration, levainHydration);

  const flourTypes = input.flourTypes.map((t) => ({ ...t, weight: flour * (t.percent / 100) }));
  const mainFlour = cleanZero(flour - flourTypes.reduce((sum, t) => sum + t.weight, 0));

  const levainWeight = flour * (levainPercent / 100);
  const levainComp = compositionFromWeight(levainWeight, levainHydration);
  const totalFlour = flour + levainComp.flour;
  const totalWater = totalFlour * (doughHydration / 100);

  const extras = input.extras.map((x) => {
    const weight = totalFlour * (x.percent / 100);
    return { ...x, weight, water: x.kind === 'liquid' ? weight * (x.waterPercent / 100) : 0 };
  });
  const extrasWeight = extras.reduce((sum, x) => sum + x.weight, 0);
  const extrasWater = extras.reduce((sum, x) => sum + x.water, 0);
  const water = cleanZero(totalWater - levainComp.water - extrasWater);

  if (water < 0) {
    if (levainComp.water > totalWater + TOLERANCE) {
      err(
        'levainPercent',
        `The levain alone makes the dough wetter than ${round2(doughHydration)}%. ` +
          `Use at most ${round2(maxPercent)}% levain, a drier levain, or a wetter dough.`,
      );
    } else {
      err(
        'extras',
        `Too much liquid: the levain and liquid extras make the dough wetter than ${round2(doughHydration)}%. ` +
          'Use less liquid or a wetter dough.',
      );
    }
    return { recipe: null, issues, maxLevainPercent: maxPercent };
  }

  const salt = totalFlour * (saltPercent / 100);
  // Liquid extras' water is already inside totalWater, so only their non-water part is added on top.
  const doughWeight = totalFlour + totalWater + salt + (extrasWeight - extrasWater);

  if (levainPercent > MAX_COMFORTABLE_LEVAIN_PERCENT) {
    issues.push({
      level: 'warning',
      field: 'levainPercent',
      message: `${round2(levainWeight)} g of levain (${round2(levainPercent)}% of the flour) might be too much.`,
    });
  }

  return {
    recipe: {
      flour,
      mainFlour: Math.max(0, mainFlour),
      flourTypes,
      water,
      levain: { ...levainComp, weight: levainWeight, hydration: levainHydration },
      levainPercent,
      totalFlour,
      totalWater,
      doughHydration: (totalWater / totalFlour) * 100,
      saltPercent,
      salt,
      extras,
      extrasWeight,
      extrasWater,
      doughWeight,
    },
    issues,
    maxLevainPercent: maxPercent,
  };
}

/**
 * Sum of everything you actually put on the scale. Must equal doughWeight —
 * levain flour/water are already part of total flour/water, never double-counted.
 */
export function weighedTotal(r: Recipe): number {
  return r.levain.weight + r.flour + r.water + r.salt + r.extrasWeight;
}

export function recipeReconciles(r: Recipe, tolerance = 1e-6): boolean {
  return (
    Math.abs(r.mainFlour + r.flourTypes.reduce((sum, t) => sum + t.weight, 0) - r.flour) < tolerance &&
    Math.abs(r.levain.flour + r.flour - r.totalFlour) < tolerance &&
    Math.abs(r.levain.water + r.water + r.extrasWater - r.totalWater) < tolerance &&
    Math.abs(weighedTotal(r) - r.doughWeight) < tolerance
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
