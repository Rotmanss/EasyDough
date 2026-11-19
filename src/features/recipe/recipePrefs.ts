import { num } from '../../hooks/usePersistentState';
import type { ExtraIngredient, FlourType, RecipeInput } from '../../lib/sourdough';

export type RecipePrefs = RecipeInput;

export const RECIPE_STORAGE_KEY = 'easydough.recipe.v2';

export const DEFAULT_RECIPE: RecipePrefs = {
  flour: 500,
  flourTypes: [],
  doughHydration: 70,
  levainPercent: 20,
  levainHydration: 70,
  saltPercent: 2,
  extras: [],
};

function parseFlourTypes(raw: unknown): FlourType[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x): FlourType[] => {
    if (typeof x !== 'object' || x === null) return [];
    const r = x as Record<string, unknown>;
    if (typeof r.id !== 'string') return [];
    return [{ id: r.id, name: typeof r.name === 'string' ? r.name.slice(0, 60) : '', percent: num(r.percent, 0) }];
  });
}

function parseExtras(raw: unknown): ExtraIngredient[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x): ExtraIngredient[] => {
    if (typeof x !== 'object' || x === null) return [];
    const r = x as Record<string, unknown>;
    if (typeof r.id !== 'string') return [];
    return [
      {
        id: r.id,
        name: typeof r.name === 'string' ? r.name.slice(0, 60) : '',
        percent: num(r.percent, 0),
        kind: r.kind === 'liquid' ? 'liquid' : 'dry',
        waterPercent: num(r.waterPercent, 100),
      },
    ];
  });
}

export function parseRecipePrefs(raw: unknown): RecipePrefs {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_RECIPE;
  const r = raw as Record<string, unknown>;
  const d = DEFAULT_RECIPE;
  return {
    flour: num(r.flour, d.flour),
    flourTypes: parseFlourTypes(r.flourTypes),
    doughHydration: num(r.doughHydration, d.doughHydration),
    levainPercent: num(r.levainPercent ?? r.starterPercent, d.levainPercent),
    levainHydration: num(r.levainHydration ?? r.starterHydration, d.levainHydration),
    saltPercent: num(r.saltPercent, d.saltPercent),
    extras: parseExtras(r.extras),
  };
}
