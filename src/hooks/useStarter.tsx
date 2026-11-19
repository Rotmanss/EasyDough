import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Composition } from '../lib/sourdough';
import { type StarterState, parseStarterState, starterReducer } from '../lib/starterLog';
import { newId, readJson, safeParse, writeJson } from '../lib/storage';

const STORAGE_KEY = 'easydough.starter.v1';

interface StarterApi {
  readonly state: StarterState;
  readonly current: Composition | null;
  setup(composition: Composition): void;
  feed(flour: number, water: number): void;
  use(amount: number): void;
  retain(amount: number): void;
  /** Seed taken from the jar (rest discarded) → fed → `forDough` goes to the dough, the rest becomes the starter. */
  levain(seed: number, flour: number, water: number, forDough: number): void;
  undo(): void;
  clearHistory(): void;
  reset(): void;
}

const StarterContext = createContext<StarterApi | null>(null);

const stamp = () => ({ id: newId(), at: Date.now() });

export function StarterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(starterReducer, undefined, () => parseStarterState(readJson(STORAGE_KEY)));

  useEffect(() => writeJson(STORAGE_KEY, state), [state]);

  // Keep several open windows/tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) dispatch({ type: 'replace', state: parseStarterState(safeParse(e.newValue)) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setup = useCallback((composition: Composition) => dispatch({ type: 'setup', composition, ...stamp() }), []);
  const feed = useCallback((flour: number, water: number) => dispatch({ type: 'feed', flour, water, ...stamp() }), []);
  const use = useCallback((amount: number) => dispatch({ type: 'use', amount, ...stamp() }), []);
  const retain = useCallback((amount: number) => dispatch({ type: 'retain', amount, ...stamp() }), []);
  const levain = useCallback(
    (seed: number, flour: number, water: number, forDough: number) =>
      dispatch({ type: 'levain', seed, flour, water, forDough, ...stamp() }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const clearHistory = useCallback(() => dispatch({ type: 'clearHistory' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const api = useMemo<StarterApi>(
    () => ({ state, current: state.current, setup, feed, use, retain, levain, undo, clearHistory, reset }),
    [state, setup, feed, use, retain, levain, undo, clearHistory, reset],
  );

  return <StarterContext.Provider value={api}>{children}</StarterContext.Provider>;
}

export function useStarter(): StarterApi {
  const ctx = useContext(StarterContext);
  if (!ctx) throw new Error('useStarter must be used inside <StarterProvider>');
  return ctx;
}
