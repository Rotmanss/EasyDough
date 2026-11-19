import { describe, expect, it } from 'vitest';
import { hydrationOf, weightOf } from './sourdough';
import { INITIAL_STARTER_STATE, type StarterState, parseStarterState, starterReducer } from './starterLog';

let n = 0;
const stamp = () => ({ id: `e${++n}`, at: 1_700_000_000_000 + n });

function setup(): StarterState {
  return starterReducer(INITIAL_STARTER_STATE, { type: 'setup', composition: { flour: 25, water: 25 }, ...stamp() });
}

describe('starterReducer', () => {
  it('records setup', () => {
    const s = setup();
    expect(s.current).toEqual({ flour: 25, water: 25 });
    expect(s.history).toHaveLength(1);
    expect(s.history[0]!.before).toBeNull();
  });

  it('feeding updates composition and hydration (no discard)', () => {
    const s = starterReducer(setup(), { type: 'feed', flour: 100, water: 70, ...stamp() });
    expect(s.current).toEqual({ flour: 125, water: 95 });
    expect(weightOf(s.current!)).toBe(220);
    expect(hydrationOf(s.current!)).toBeCloseTo(76, 10);
    expect(s.history[0]!.kind).toBe('feed');
    expect(s.history[0]!.before).toEqual({ flour: 25, water: 25 });
  });

  it('using starter removes flour and water proportionally', () => {
    let s = starterReducer(setup(), { type: 'feed', flour: 100, water: 62.5, ...stamp() });
    s = starterReducer(s, { type: 'use', amount: 120, ...stamp() });
    expect(weightOf(s.current!)).toBeCloseTo(92.5, 10);
    expect(hydrationOf(s.current!)).toBeCloseTo(70, 10);
    expect(s.history[0]!.removed).toBe(120);
  });

  it('retain keeps only the given amount', () => {
    let s = starterReducer(setup(), { type: 'feed', flour: 100, water: 62.5, ...stamp() });
    s = starterReducer(s, { type: 'retain', amount: 50, ...stamp() });
    expect(weightOf(s.current!)).toBeCloseTo(50, 10);
    expect(hydrationOf(s.current!)).toBeCloseTo(70, 10);
    expect(s.history[0]!.removed).toBeCloseTo(162.5, 10);
  });

  it('ignores invalid actions', () => {
    const s = setup();
    expect(starterReducer(s, { type: 'feed', flour: -1, water: 10, ...stamp() })).toBe(s);
    expect(starterReducer(s, { type: 'use', amount: 999, ...stamp() })).toBe(s);
    expect(starterReducer(INITIAL_STARTER_STATE, { type: 'feed', flour: 10, water: 10, ...stamp() })).toBe(
      INITIAL_STARTER_STATE,
    );
  });

  it('undo restores the previous composition', () => {
    const fed = starterReducer(setup(), { type: 'feed', flour: 100, water: 70, ...stamp() });
    const undone = starterReducer(fed, { type: 'undo' });
    expect(undone.current).toEqual({ flour: 25, water: 25 });
    expect(undone.history).toHaveLength(1);
    expect(starterReducer(undone, { type: 'undo' }).current).toBeNull();
  });

  it('levain: take 50 g of 70% starter, build 170 g at 70%, 120 g to dough → 50 g at 70% back', () => {
    let s = starterReducer(INITIAL_STARTER_STATE, {
      type: 'setup',
      composition: { flour: 50 / 1.7, water: 50 - 50 / 1.7 },
      ...stamp(),
    });
    for (let bake = 0; bake < 20; bake++) {
      s = starterReducer(s, {
        type: 'levain',
        seed: 50,
        flour: 100 - 50 / 1.7,
        water: 70 - (50 - 50 / 1.7),
        forDough: 120,
        ...stamp(),
      });
      expect(weightOf(s.current!)).toBeCloseTo(50, 9);
      expect(hydrationOf(s.current!)).toBeCloseTo(70, 9);
    }
    expect(s.history[0]!.kind).toBe('levain');
    expect(s.history[0]!.seed).toBe(50);
  });

  it('levain from part of the jar: the rest of the jar is thrown away', () => {
    // Jar 100 g @100% (50/50); take 50 g, build 100 g at 50%, 80 g to dough, 20 g back.
    let s = starterReducer(INITIAL_STARTER_STATE, { type: 'setup', composition: { flour: 50, water: 50 }, ...stamp() });
    const lf = 100 / 1.5;
    s = starterReducer(s, { type: 'levain', seed: 50, flour: lf - 25, water: 100 - lf - 25, forDough: 80, ...stamp() });
    expect(s.current!.flour).toBeCloseTo(lf * 0.2, 9);
    expect(s.current!.water).toBeCloseTo((100 - lf) * 0.2, 9);
    expect(starterReducer(s, { type: 'levain', seed: 999, flour: 1, water: 1, forDough: 0, ...stamp() })).toBe(s);
  });

  it('keeps many feedings exact', () => {
    let s = setup();
    for (let i = 0; i < 100; i++) s = starterReducer(s, { type: 'feed', flour: 10, water: 7, ...stamp() });
    expect(s.current!.flour).toBeCloseTo(1025, 9);
    expect(s.current!.water).toBeCloseTo(725, 9);
  });
});

describe('parseStarterState', () => {
  it('round-trips through JSON', () => {
    const s = starterReducer(setup(), { type: 'feed', flour: 100, water: 70, ...stamp() });
    expect(parseStarterState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('drops corrupted data safely', () => {
    expect(parseStarterState(null)).toEqual(INITIAL_STARTER_STATE);
    expect(parseStarterState('nope')).toEqual(INITIAL_STARTER_STATE);
    const parsed = parseStarterState({
      current: { flour: -1, water: 5 },
      history: [{ id: 1 }, null, { id: 'x', at: 1, kind: 'feed', flourAdded: 1, waterAdded: 1, removed: 0, after: { flour: 1, water: 1 } }],
    });
    expect(parsed.current).toBeNull();
    expect(parsed.history).toHaveLength(1);
  });
});
