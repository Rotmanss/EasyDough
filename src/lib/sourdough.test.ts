import { describe, expect, it } from 'vitest';
import {
  type Composition,
  type RecipeInput,
  addFeeding,
  calculateRecipe,
  compositionFromFlour,
  compositionFromWeight,
  hydrationOf,
  maxLevainPercent,
  planFeeding,
  planLevain,
  recipeReconciles,
  takePortion,
  weighedTotal,
  weightOf,
} from './sourdough';

const close = (actual: number, expected: number, digits = 9) => expect(actual).toBeCloseTo(expected, digits);

describe('compositionFromWeight', () => {
  it('splits 50 g at 100% into 25 g flour + 25 g water', () => {
    const c = compositionFromWeight(50, 100);
    close(c.flour, 25);
    close(c.water, 25);
  });

  it('splits 120 g at 70% into 70.588 g flour + 49.412 g water (not 70% of the weight)', () => {
    const c = compositionFromWeight(120, 70);
    close(c.flour, 120 / 1.7);
    close(c.water, 120 - 120 / 1.7);
    expect(c.flour).toBeCloseTo(70.588, 3);
    expect(c.water).toBeCloseTo(49.412, 3);
    close(weightOf(c), 120);
    close(hydrationOf(c)!, 70);
  });

  it('handles 0% hydration (all flour) and zero weight', () => {
    expect(compositionFromWeight(80, 0)).toEqual({ flour: 80, water: 0 });
    expect(compositionFromWeight(0, 70)).toEqual({ flour: 0, water: 0 });
  });

  it('rejects negative or non-finite values', () => {
    expect(() => compositionFromWeight(-1, 70)).toThrow(RangeError);
    expect(() => compositionFromWeight(10, -5)).toThrow(RangeError);
    expect(() => compositionFromWeight(Number.NaN, 70)).toThrow(RangeError);
    expect(() => compositionFromWeight(Infinity, 70)).toThrow(RangeError);
  });
});

describe('compositionFromFlour', () => {
  it('adds water as flour × hydration', () => {
    const c = compositionFromFlour(60, 70);
    close(c.water, 42);
    close(weightOf(c), 102);
  });
});

describe('hydrationOf', () => {
  it('is water ÷ flour × 100', () => {
    close(hydrationOf({ flour: 100, water: 70 })!, 70);
    close(hydrationOf({ flour: 125, water: 95 })!, 76);
  });

  it('is undefined (null) when there is no flour', () => {
    expect(hydrationOf({ flour: 0, water: 10 })).toBeNull();
  });
});

describe('addFeeding (no-discard)', () => {
  it('50 g @100% + 100 g flour + 70 g water → 125 g flour, 95 g water, 220 g, 76%', () => {
    const before = compositionFromWeight(50, 100);
    const after = addFeeding(before, 100, 70);
    close(after.flour, 125);
    close(after.water, 95);
    close(weightOf(after), 220);
    close(hydrationOf(after)!, 76);
  });

  it('does not keep the previous hydration after feeding', () => {
    const after = addFeeding({ flour: 25, water: 25 }, 100, 70);
    expect(hydrationOf(after)).not.toBeCloseTo(100, 3);
    expect(hydrationOf(after)).not.toBeCloseTo(70, 3);
  });
});

describe('planFeeding', () => {
  it('50 g @100% + 100 g flour to 70% → add 62.5 g water, 125/87.5, 212.5 g', () => {
    const { plan, issues } = planFeeding({
      existing: compositionFromWeight(50, 100),
      flourToAdd: 100,
      targetHydration: 70,
    });
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(plan).not.toBeNull();
    close(plan!.waterToAdd, 62.5);
    close(plan!.final.flour, 125);
    close(plan!.final.water, 87.5);
    close(plan!.finalWeight, 212.5);
    close(plan!.finalHydration, 70);
  });

  it('can be repeated indefinitely, always using the real composition of the jar', () => {
    let jar: Composition = compositionFromWeight(50, 100);
    let flourAdded = 0;
    let waterAdded = 0;
    const feeds: Array<[number, number]> = [
      [100, 70],
      [50, 80],
      [200, 65],
      [10, 100],
      [75, 72.5],
      [0, 110],
      [333.3, 55],
    ];
    for (let round = 0; round < 10; round++) {
      for (const [flour, target] of feeds) {
        const { plan } = planFeeding({ existing: jar, flourToAdd: flour, targetHydration: target });
        if (!plan) continue; // target unreachable for this jar — skip, as a user would
        flourAdded += plan.flourToAdd;
        waterAdded += plan.waterToAdd;
        jar = plan.final;
        expect(hydrationOf(jar)).toBeCloseTo(target, 9);
      }
    }
    // Conservation: nothing is lost or invented.
    close(jar.flour, 25 + flourAdded, 6);
    close(jar.water, 25 + waterAdded, 6);
  });

  it('can raise hydration with water only (0 g flour)', () => {
    const { plan } = planFeeding({ existing: { flour: 25, water: 25 }, flourToAdd: 0, targetHydration: 120 });
    close(plan!.waterToAdd, 5);
    close(plan!.finalHydration, 120);
  });

  it('works for a brand new (empty) starter', () => {
    const { plan } = planFeeding({ existing: { flour: 0, water: 0 }, flourToAdd: 50, targetHydration: 100 });
    close(plan!.waterToAdd, 50);
  });

  it('reports an error when the target is below what the existing water allows', () => {
    const r = planFeeding({ existing: { flour: 25, water: 25 }, flourToAdd: 10, targetHydration: 50 });
    expect(r.plan).toBeNull();
    expect(r.issues[0]?.level).toBe('error');
    close(r.lowestReachableHydration!, (25 / 35) * 100);
    close(r.minimumFlourForTarget!, 25); // 25 / 0.5 − 25
  });

  it('flags 0% target with water present as impossible', () => {
    const r = planFeeding({ existing: { flour: 25, water: 25 }, flourToAdd: 100, targetHydration: 0 });
    expect(r.plan).toBeNull();
    expect(r.minimumFlourForTarget).toBeNull();
  });

  it('rejects invalid input', () => {
    expect(planFeeding({ existing: { flour: 25, water: 25 }, flourToAdd: -5, targetHydration: 70 }).plan).toBeNull();
    expect(planFeeding({ existing: { flour: 25, water: 25 }, flourToAdd: 50, targetHydration: NaN }).plan).toBeNull();
    expect(planFeeding({ existing: { flour: 0, water: 0 }, flourToAdd: 0, targetHydration: 70 }).plan).toBeNull();
  });

  it('never returns negative water', () => {
    const { plan } = planFeeding({ existing: { flour: 50, water: 35 }, flourToAdd: 0, targetHydration: 70 });
    expect(plan!.waterToAdd).toBe(0);
  });
});

describe('takePortion', () => {
  const jar = { flour: 125, water: 87.5 }; // 212.5 g @ 70%

  it('takes flour and water proportionally, keeping hydration', () => {
    const { portion, remaining } = takePortion(jar, 120);
    close(portion.flour, 120 / 1.7);
    close(portion.water, 120 - 120 / 1.7);
    close(hydrationOf(portion)!, 70);
    close(hydrationOf(remaining)!, 70);
    close(weightOf(remaining), 92.5);
    close(portion.flour + remaining.flour, 125);
    close(portion.water + remaining.water, 87.5);
  });

  it('taking everything leaves exactly zero', () => {
    const { portion, remaining } = takePortion(jar, 212.5);
    expect(portion).toEqual(jar);
    expect(remaining).toEqual({ flour: 0, water: 0 });
  });

  it('cannot take more than is in the jar', () => {
    expect(() => takePortion(jar, 213)).toThrow(RangeError);
  });
});

const baseRecipe: RecipeInput = {
  flour: 500,
  flourTypes: [],
  doughHydration: 70,
  levainPercent: 24,
  levainHydration: 70,
  saltPercent: 2,
  extras: [],
};

describe('calculateRecipe — flour excludes levain, levain is % of flour', () => {
  it('500 g flour + 24% levain (120 g @70%), 70% dough, 2% salt', () => {
    const { recipe, issues } = calculateRecipe(baseRecipe);
    expect(issues).toEqual([]);
    const r = recipe!;
    close(r.flour, 500);
    close(r.levain.weight, 120);
    close(r.levain.flour, 120 / 1.7);
    close(r.levain.water, 120 - 120 / 1.7);
    close(r.totalFlour, 500 + 120 / 1.7);
    close(r.totalWater, (500 + 120 / 1.7) * 0.7);
    // Same levain and dough hydration → water to add is exactly flour × hydration.
    close(r.water, 350);
    close(r.salt, (500 + 120 / 1.7) * 0.02);
    close(r.doughHydration, 70);
    close(r.doughWeight, 120 + 500 + 350 + r.salt);
    expect(recipeReconciles(r)).toBe(true);
    close(weighedTotal(r), r.doughWeight);
  });

  it('keeps levain and dough hydration independent (100% levain, 75% dough, 20% levain)', () => {
    const r = calculateRecipe({ ...baseRecipe, doughHydration: 75, levainHydration: 100, levainPercent: 20 }).recipe!;
    close(r.levain.weight, 100);
    close(r.levain.flour, 50);
    close(r.levain.water, 50);
    close(r.totalFlour, 550);
    close(r.totalWater, 412.5);
    close(r.water, 362.5);
    close(r.salt, 11);
    close(r.doughWeight, 973.5);
    expect(recipeReconciles(r)).toBe(true);
  });

  it('adds dry extras by baker’s percentage of total flour without changing water', () => {
    const r = calculateRecipe({
      ...baseRecipe,
      levainHydration: 100,
      levainPercent: 20,
      extras: [
        { id: 'a', name: 'Seeds', percent: 10, kind: 'dry', waterPercent: 100 },
        { id: 'b', name: 'Nuts', percent: 2, kind: 'dry', waterPercent: 100 },
      ],
    }).recipe!;
    close(r.extras[0]!.weight, 55);
    close(r.extras[1]!.weight, 11);
    close(r.extrasWeight, 66);
    close(r.extrasWater, 0);
    close(r.water, 335); // 550 × 0.7 − 50
    close(r.doughWeight, 100 + 500 + 335 + 11 + 66);
    expect(recipeReconciles(r)).toBe(true);
  });

  it('liquid extras count toward hydration: less plain water, same hydration', () => {
    // 100% levain, 20% → total flour 550, total water 385. Milk 10% = 55 g at 87% water.
    const r = calculateRecipe({
      ...baseRecipe,
      levainHydration: 100,
      levainPercent: 20,
      extras: [{ id: 'm', name: 'Milk', percent: 10, kind: 'liquid', waterPercent: 87 }],
    }).recipe!;
    close(r.extrasWater, 55 * 0.87);
    close(r.totalWater, 385);
    close(r.water, 385 - 50 - 55 * 0.87);
    close(r.doughHydration, 70);
    close(r.doughWeight, 100 + 500 + r.water + 11 + 55);
    expect(recipeReconciles(r)).toBe(true);
  });

  it('a 100%-water liquid replaces plain water gram for gram', () => {
    const dry = calculateRecipe(baseRecipe).recipe!;
    const wet = calculateRecipe({
      ...baseRecipe,
      extras: [{ id: 'w', name: 'Beer', percent: 5, kind: 'liquid', waterPercent: 100 }],
    }).recipe!;
    close(wet.water, dry.water - wet.extras[0]!.weight);
    close(wet.doughWeight, dry.doughWeight);
  });

  it('errors when liquid extras bring more water than the dough allows', () => {
    const { recipe, issues } = calculateRecipe({
      ...baseRecipe,
      extras: [{ id: 'm', name: 'Milk', percent: 80, kind: 'liquid', waterPercent: 100 }],
    });
    expect(recipe).toBeNull();
    expect(issues[0]?.field).toBe('extras');
  });

  it('flour types are taken out of the flour; everything else stays the same', () => {
    const plain = calculateRecipe(baseRecipe).recipe!;
    const r = calculateRecipe({
      ...baseRecipe,
      flourTypes: [
        { id: 'w', name: 'Whole wheat', percent: 20 },
        { id: 'r', name: 'Rye', percent: 10 },
      ],
    }).recipe!;
    close(r.flourTypes[0]!.weight, 100);
    close(r.flourTypes[1]!.weight, 50);
    close(r.mainFlour, 350);
    close(r.flour, 500);
    close(r.water, plain.water);
    close(r.doughWeight, plain.doughWeight);
    expect(recipeReconciles(r)).toBe(true);
  });

  it('rejects flour types above 100% in total', () => {
    const { recipe, issues } = calculateRecipe({
      ...baseRecipe,
      flourTypes: [
        { id: 'a', name: 'A', percent: 60 },
        { id: 'b', name: 'B', percent: 50 },
      ],
    });
    expect(recipe).toBeNull();
    expect(issues[0]?.field).toBe('flourTypes');
    close(calculateRecipe({ ...baseRecipe, flourTypes: [{ id: 'a', name: 'A', percent: 100 }] }).recipe!.mainFlour, 0);
  });

  it('allows 0% levain without warnings', () => {
    const { recipe, issues } = calculateRecipe({ ...baseRecipe, levainPercent: 0 });
    close(recipe!.levain.weight, 0);
    close(recipe!.water, 350);
    expect(issues).toEqual([]);
  });

  it('warns only when levain is above 40% of the flour', () => {
    expect(calculateRecipe({ ...baseRecipe, levainPercent: 40 }).issues).toEqual([]);
    const { recipe, issues } = calculateRecipe({ ...baseRecipe, levainPercent: 41 });
    expect(recipe).not.toBeNull();
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ level: 'warning', field: 'levainPercent' });
    expect(calculateRecipe({ ...baseRecipe, saltPercent: 5, doughHydration: 100 }).issues).toEqual([]);
  });

  it('errors when the levain would bring more water than the whole dough allows', () => {
    // 60% dough, 100% levain → max levain = 0.6 × 2 ÷ 0.4 = 300%.
    close(maxLevainPercent(60, 100), 300);
    const ok = calculateRecipe({ ...baseRecipe, doughHydration: 60, levainHydration: 100, levainPercent: 300 });
    expect(ok.recipe).not.toBeNull();
    close(ok.recipe!.water, 0);
    const bad = calculateRecipe({ ...baseRecipe, doughHydration: 60, levainHydration: 100, levainPercent: 301 });
    expect(bad.recipe).toBeNull();
    expect(bad.issues[0]?.field).toBe('levainPercent');
  });

  it('has no levain limit when the levain is not wetter than the dough', () => {
    expect(maxLevainPercent(70, 70)).toBe(Infinity);
    expect(maxLevainPercent(70, 50)).toBe(Infinity);
  });
});

describe('calculateRecipe — validation', () => {
  it.each([
    ['flour', { flour: 0 }],
    ['flour', { flour: NaN }],
    ['doughHydration', { doughHydration: -1 }],
    ['doughHydration', { doughHydration: 101 }],
    ['levainHydration', { levainHydration: NaN }],
    ['levainHydration', { levainHydration: 100.5 }],
    ['levainPercent', { levainPercent: -5 }],
    ['saltPercent', { saltPercent: -2 }],
  ] as const)('rejects invalid %s', (field, patch) => {
    const { recipe, issues } = calculateRecipe({ ...baseRecipe, ...patch });
    expect(recipe).toBeNull();
    expect(issues.some((i) => i.field === field && i.level === 'error')).toBe(true);
  });

  it('rejects an invalid extra', () => {
    const extra = { id: 'x', name: 'Seeds', percent: 5, kind: 'dry' as const, waterPercent: 100 };
    expect(calculateRecipe({ ...baseRecipe, extras: [{ ...extra, percent: -1 }] }).recipe).toBeNull();
    expect(calculateRecipe({ ...baseRecipe, extras: [{ ...extra, kind: 'liquid', waterPercent: 120 }] }).recipe).toBeNull();
  });
});

const build = {
  seed: compositionFromWeight(50, 70),
  levainHydration: 70,
  forDough: 120,
  backToFridge: 50,
};

describe('planLevain — starter (fridge) + flour + water → levain → dough + fridge', () => {
  it('50 g of 70% starter → 170 g levain at 70%: 120 g to dough, 50 g at 70% back to the fridge', () => {
    const { plan, issues } = planLevain(build);
    expect(issues).toEqual([]);
    const p = plan!;
    close(p.flourToAdd, 100 - 50 / 1.7);
    close(p.waterToAdd, 70 - (50 - 50 / 1.7));
    expect(p.flourToAdd).toBeCloseTo(70.588, 3);
    expect(p.waterToAdd).toBeCloseTo(49.412, 3);
    close(p.levainWeight, 170);
    close(p.levainHydration, 70);
    close(weightOf(p.forDough), 120);
    close(weightOf(p.backToFridge), 50);
    close(hydrationOf(p.backToFridge)!, 70);
    close(p.ratio![1], (100 - 50 / 1.7) / 50);
  });

  it('a 100% starter makes a 70% levain; what goes back is 70%', () => {
    const p = planLevain({ ...build, seed: compositionFromWeight(50, 100) }).plan!;
    close(p.flourToAdd, 75);
    close(p.waterToAdd, 45);
    close(hydrationOf(p.backToFridge)!, 70);
  });

  it('1:2:2 — 50 g of 100% starter, 250 g levain at 100% (120 g dough + 130 g back)', () => {
    const p = planLevain({ seed: compositionFromWeight(50, 100), levainHydration: 100, forDough: 120, backToFridge: 130 })
      .plan!;
    close(p.flourToAdd, 100);
    close(p.waterToAdd, 100);
    expect(p.ratio).toEqual([1, 2, 2]);
  });

  it('errors when the starter alone has more flour than the levain can hold', () => {
    const r = planLevain({ ...build, seed: compositionFromWeight(200, 70), backToFridge: 0 });
    expect(r.plan).toBeNull();
    expect(r.issues[0]?.field).toBe('seed');
    close(r.minimumLevain!, 200);
  });

  it('errors when a wet starter has more water than a stiff levain can hold', () => {
    const r = planLevain({ seed: compositionFromWeight(50, 100), levainHydration: 20, forDough: 60, backToFridge: 0 });
    expect(r.plan).toBeNull();
    close(r.minimumLevain!, 150); // 25 g water × 1.2 ÷ 0.2
  });

  it('optional flour ratio: flour = starter × ratio, the rest goes back to the fridge', () => {
    const p = planLevain({ ...build, backToFridge: 0, flourRatio: 3.5 }).plan!;
    close(p.flourToAdd, 175);
    close(p.levain.flour, 50 / 1.7 + 175);
    close(p.levainWeight, (50 / 1.7 + 175) * 1.7);
    close(p.levainHydration, 70);
    close(weightOf(p.forDough), 120);
    close(weightOf(p.backToFridge), p.levainWeight - 120);
    close(p.ratio![1], 3.5);
  });

  it('flour ratio too small for the dough is an error with the smallest ratio', () => {
    const r = planLevain({ ...build, flourRatio: 0.5 });
    expect(r.plan).toBeNull();
    expect(r.issues[0]?.field).toBe('flourRatio');
    expect(r.issues[0]?.message).toMatch(/1 : 0[.,]83/);
    expect(planLevain({ ...build, seed: { flour: 0, water: 0 }, flourRatio: 2 }).issues[0]?.field).toBe('flourRatio');
  });

  it('caps starter and levain hydration at 100%', () => {
    expect(planLevain({ ...build, seed: compositionFromWeight(50, 101) }).issues[0]?.field).toBe('seed');
    expect(planLevain({ ...build, levainHydration: 101 }).plan).toBeNull();
    expect(planLevain({ ...build, seed: compositionFromWeight(50, 100), levainHydration: 100 }).plan).not.toBeNull();
  });

  it('warns without starter and validates inputs', () => {
    const noSeed = planLevain({ ...build, seed: { flour: 0, water: 0 } });
    close(noSeed.plan!.flourToAdd, 100);
    expect(noSeed.issues[0]?.level).toBe('warning');
    expect(planLevain({ ...build, forDough: NaN }).plan).toBeNull();
    expect(planLevain({ ...build, forDough: 0, backToFridge: 0 }).plan).toBeNull();
    expect(planLevain({ ...build, levainHydration: -1 }).plan).toBeNull();
  });
});
