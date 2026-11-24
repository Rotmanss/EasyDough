import { num } from '../../hooks/usePersistentState';
import { grams } from '../../lib/format';
import {
  type Composition,
  type Issue,
  type LevainPlan,
  MAX_HYDRATION,
  type Recipe,
  TOLERANCE,
  compositionFromWeight,
  hydrationOf,
  isValidAmount,
  isValidHydration,
  planLevain,
  takePortion,
  weightOf,
} from '../../lib/sourdough';

export const LEVAIN_STORAGE_KEY = 'easydough.levain.v1';

export interface LevainPrefs {
  useMyStarter: boolean;
  /** Grams of starter taken from the fridge jar. */
  seed: number;
  manualHydration: number;
  syncWithRecipe: boolean;
  forDough: number;
  levainHydration: number;
  backToFridge: number;
  useFlourRatio: boolean;
  flourRatio: number;
}

export function parseLevainPrefs(raw: unknown): LevainPrefs {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    useMyStarter: r.useMyStarter !== false,
    seed: num(r.seed, 50),
    manualHydration: num(r.manualHydration, 70),
    syncWithRecipe: r.syncWithRecipe !== false,
    forDough: num(r.forDough, 120),
    levainHydration: num(r.levainHydration, 70),
    backToFridge: num(r.backToFridge, 50),
    useFlourRatio: r.useFlourRatio === true,
    flourRatio: num(r.flourRatio, 2),
  };
}

export interface LevainSetup {
  /** Saved starter used as the source, or null when entered by hand. */
  jar: Composition | null;
  jarWeight: number;
  starterHydration: number | null;
  /** Grams of starter actually taken (capped to what is in the jar). */
  seedWeight: number;
  forDough: number;
  levainHydration: number;
  flourRatio: number | null;
  issues: Issue[];
  plan: LevainPlan | null;
}

const INVALID: Composition = { flour: NaN, water: NaN };

/** Everything the levain builder shows, from its saved settings, the saved starter and the recipe. */
export function computeLevain(
  prefs: LevainPrefs,
  savedStarter: Composition | null,
  recipe: Recipe | null,
  recipeLevainHydration: number,
): LevainSetup {
  const jar = prefs.useMyStarter ? savedStarter : null;
  const jarWeight = jar ? weightOf(jar) : 0;
  const starterHydration = jar ? hydrationOf(jar) : prefs.manualHydration;

  const inputIssues: Issue[] = [];
  let seed = INVALID;
  if (!isValidAmount(prefs.seed)) {
    inputIssues.push({ level: 'error', field: 'seed', message: 'Enter how much starter you take.' });
  } else if (jar) {
    if (prefs.seed > jarWeight + TOLERANCE) {
      inputIssues.push({ level: 'error', field: 'seed', message: `You only have ${grams(jarWeight)} of starter.` });
    } else {
      seed = takePortion(jar, Math.min(prefs.seed, jarWeight)).portion;
    }
  } else if (!isValidHydration(prefs.manualHydration)) {
    inputIssues.push({ level: 'error', field: 'seed', message: `Starter hydration must be 0–${MAX_HYDRATION}%.` });
  } else {
    seed = compositionFromWeight(prefs.seed, prefs.manualHydration);
  }

  if (prefs.syncWithRecipe && !recipe) {
    inputIssues.push({
      level: 'error',
      message: 'Something is wrong in the Recipe tab. Fix it there, or untick “Same as recipe”.',
    });
  }
  const forDough = prefs.syncWithRecipe ? (recipe?.levain.weight ?? NaN) : prefs.forDough;
  const levainHydration = prefs.syncWithRecipe ? recipeLevainHydration : prefs.levainHydration;
  const flourRatio = prefs.useFlourRatio ? prefs.flourRatio : null;

  const result = planLevain({ seed, levainHydration, forDough, backToFridge: prefs.backToFridge, flourRatio });
  const failed = inputIssues.length > 0;

  return {
    jar,
    jarWeight,
    starterHydration,
    seedWeight: jar ? Math.min(prefs.seed, jarWeight) : prefs.seed,
    forDough,
    levainHydration,
    flourRatio,
    issues: failed ? inputIssues : result.issues,
    plan: failed ? null : result.plan,
  };
}
