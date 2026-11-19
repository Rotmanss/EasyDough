/**
 * Persistent no-discard starter record: current composition + feeding history.
 * Pure reducer — ids and timestamps come in with the action so it stays testable.
 */
import { type Composition, TOLERANCE, addFeeding, isValidAmount, takePortion, weightOf } from './sourdough';

export type StarterEventKind = 'setup' | 'feed' | 'use' | 'retain' | 'levain';

export interface StarterEvent {
  readonly id: string;
  readonly at: number;
  readonly kind: StarterEventKind;
  readonly flourAdded: number;
  readonly waterAdded: number;
  /** Grams taken out of the jar (use / retain) or levain that went into the dough. */
  readonly removed: number;
  /** Grams of starter taken from the jar to build a levain. */
  readonly seed: number;
  readonly before: Composition | null;
  readonly after: Composition;
}

export interface StarterState {
  readonly current: Composition | null;
  /** Newest first. */
  readonly history: readonly StarterEvent[];
}

export const MAX_HISTORY = 500;

export const INITIAL_STARTER_STATE: StarterState = { current: null, history: [] };

interface Stamp {
  readonly id: string;
  readonly at: number;
}

export type StarterAction =
  | ({ type: 'setup'; composition: Composition } & Stamp)
  | ({ type: 'feed'; flour: number; water: number } & Stamp)
  | ({ type: 'use'; amount: number } & Stamp)
  | ({ type: 'retain'; amount: number } & Stamp)
  | ({ type: 'levain'; seed: number; flour: number; water: number; forDough: number } & Stamp)
  | { type: 'undo' }
  | { type: 'clearHistory' }
  | { type: 'reset' }
  | { type: 'replace'; state: StarterState };

function record(
  state: StarterState,
  stamp: Stamp,
  kind: StarterEventKind,
  after: Composition,
  extra: Partial<Pick<StarterEvent, 'flourAdded' | 'waterAdded' | 'removed' | 'seed'>> = {},
): StarterState {
  const event: StarterEvent = {
    id: stamp.id,
    at: stamp.at,
    kind,
    flourAdded: extra.flourAdded ?? 0,
    waterAdded: extra.waterAdded ?? 0,
    removed: extra.removed ?? 0,
    seed: extra.seed ?? 0,
    before: state.current,
    after,
  };
  return { current: after, history: [event, ...state.history].slice(0, MAX_HISTORY) };
}

export function starterReducer(state: StarterState, action: StarterAction): StarterState {
  switch (action.type) {
    case 'setup': {
      const { flour, water } = action.composition;
      if (!isValidAmount(flour) || !isValidAmount(water)) return state;
      return record(state, action, 'setup', { flour, water });
    }
    case 'feed': {
      if (!state.current || !isValidAmount(action.flour) || !isValidAmount(action.water)) return state;
      if (action.flour === 0 && action.water === 0) return state;
      return record(state, action, 'feed', addFeeding(state.current, action.flour, action.water), {
        flourAdded: action.flour,
        waterAdded: action.water,
      });
    }
    case 'use':
    case 'retain': {
      const current = state.current;
      if (!current || !isValidAmount(action.amount) || action.amount > weightOf(current)) return state;
      const { portion, remaining } = takePortion(current, action.amount);
      if (action.type === 'use') {
        if (action.amount === 0) return state;
        return record(state, action, 'use', remaining, { removed: action.amount });
      }
      const removed = weightOf(current) - action.amount;
      if (removed <= 0) return state;
      return record(state, action, 'retain', portion, { removed });
    }
    case 'levain': {
      // Seed is taken from the jar (any rest is thrown away), fed, the dough share goes out, the rest becomes the starter.
      const { current } = state;
      const { seed, flour, water, forDough } = action;
      if (!current || ![seed, flour, water, forDough].every(isValidAmount)) return state;
      const jar = weightOf(current);
      if (seed > jar + TOLERANCE) return state;
      const { portion } = takePortion(current, Math.min(seed, jar));
      const levain = addFeeding(portion, flour, water);
      const levainWeight = weightOf(levain);
      if (forDough > levainWeight + TOLERANCE) return state;
      const back = takePortion(levain, Math.min(forDough, levainWeight)).remaining;
      return record(state, action, 'levain', back, { flourAdded: flour, waterAdded: water, removed: forDough, seed });
    }
    case 'undo': {
      const [last, ...rest] = state.history;
      if (!last) return state;
      return { current: last.before, history: rest };
    }
    case 'clearHistory':
      return { ...state, history: [] };
    case 'reset':
      return INITIAL_STARTER_STATE;
    case 'replace':
      return action.state;
  }
}

// ---------------------------------------------------------------------------
// Defensive parsing of persisted data (localStorage may be stale or corrupted)
// ---------------------------------------------------------------------------

function parseComposition(raw: unknown): Composition | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { flour, water } = raw as Record<string, unknown>;
  return isValidAmount(flour) && isValidAmount(water) ? { flour, water } : null;
}

const KINDS: readonly StarterEventKind[] = ['setup', 'feed', 'use', 'retain', 'levain'];

function parseEvent(raw: unknown): StarterEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const after = parseComposition(r.after);
  if (
    typeof r.id !== 'string' ||
    typeof r.at !== 'number' ||
    !KINDS.includes(r.kind as StarterEventKind) ||
    !after ||
    !isValidAmount(r.flourAdded) ||
    !isValidAmount(r.waterAdded) ||
    !isValidAmount(r.removed)
  ) {
    return null;
  }
  return {
    id: r.id,
    at: r.at,
    kind: r.kind as StarterEventKind,
    flourAdded: r.flourAdded,
    waterAdded: r.waterAdded,
    removed: r.removed,
    seed: isValidAmount(r.seed) ? r.seed : 0,
    before: parseComposition(r.before),
    after,
  };
}

export function parseStarterState(raw: unknown): StarterState {
  if (typeof raw !== 'object' || raw === null) return INITIAL_STARTER_STATE;
  const r = raw as Record<string, unknown>;
  const history = Array.isArray(r.history)
    ? r.history.map(parseEvent).filter((e): e is StarterEvent => e !== null).slice(0, MAX_HISTORY)
    : [];
  return { current: parseComposition(r.current), history };
}
