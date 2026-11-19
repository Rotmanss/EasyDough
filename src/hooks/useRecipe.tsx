import { type Dispatch, type ReactNode, type SetStateAction, createContext, useContext, useMemo } from 'react';
import { DEFAULT_RECIPE, RECIPE_STORAGE_KEY, type RecipePrefs, parseRecipePrefs } from '../features/recipe/recipePrefs';
import { type RecipeResult, calculateRecipe } from '../lib/sourdough';
import { usePersistentState } from './usePersistentState';

interface RecipeApi {
  readonly prefs: RecipePrefs;
  readonly setPrefs: Dispatch<SetStateAction<RecipePrefs>>;
  readonly result: RecipeResult;
  readonly reset: () => void;
}

const RecipeContext = createContext<RecipeApi | null>(null);

/** Shared so the Starter tab can feed exactly what the bread needs. */
export function RecipeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = usePersistentState(RECIPE_STORAGE_KEY, parseRecipePrefs);
  const result = useMemo(() => calculateRecipe(prefs), [prefs]);
  const api = useMemo<RecipeApi>(
    () => ({ prefs, setPrefs, result, reset: () => setPrefs(DEFAULT_RECIPE) }),
    [prefs, setPrefs, result],
  );
  return <RecipeContext.Provider value={api}>{children}</RecipeContext.Provider>;
}

export function useRecipe(): RecipeApi {
  const ctx = useContext(RecipeContext);
  if (!ctx) throw new Error('useRecipe must be used inside <RecipeProvider>');
  return ctx;
}
