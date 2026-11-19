/**
 * Plain-language, step-by-step explanations of every calculation, built from the
 * actual values in use. Pure data — rendered by <Explain/>.
 */
import { type LevainPlan, type Recipe, type RecipeExtraLine, type RecipeFlourLine, weightOf } from './sourdough';
import { gramsPrecise as g, num, percentPrecise as p } from './format';

export interface ExplainStep {
  readonly text: string;
  readonly math?: string;
}

export interface Explanation {
  readonly title: string;
  readonly intro: string;
  readonly formula: string;
  readonly steps: readonly ExplainStep[];
  readonly result: string;
}

/** Percent as a plain number for math lines: 70 → "70". */
const n = (pct: number) => num(pct, 2);

export function explainHydration(flour: number, water: number, subject = 'it'): Explanation {
  const h = flour > 0 ? (water / flour) * 100 : null;
  return {
    title: 'Hydration',
    intro: `Hydration shows how wet ${subject} is: grams of water for every 100 g of flour.`,
    formula: 'Hydration = water ÷ flour × 100',
    steps: [{ text: 'Divide the water by the flour, then multiply by 100.', math: `${g(water)} ÷ ${g(flour)} × 100 = ${p(h)}` }],
    result: h === null ? 'There is no flour, so there is no hydration.' : `Hydration is ${p(h)}`,
  };
}

export function explainSplit(weight: number, hydrationPct: number, subject = 'starter'): Explanation {
  const flour = weight / (1 + hydrationPct / 100);
  const water = weight - flour;
  return {
    title: `Flour and water in the ${subject}`,
    intro:
      `At ${p(hydrationPct)}, every 100 g of flour has ${n(hydrationPct)} g of water. ` +
      `So ${n(100 + hydrationPct)} g of ${subject} holds 100 g of flour.`,
    formula: 'Flour = weight × 100 ÷ (100 + hydration)',
    steps: [
      { text: 'Flour:', math: `${g(weight)} × 100 ÷ ${n(100 + hydrationPct)} = ${g(flour)}` },
      { text: 'Water is the rest:', math: `${g(weight)} − ${g(flour)} = ${g(water)}` },
    ],
    result: `${g(flour)} flour + ${g(water)} water`,
  };
}

export function explainLevain(plan: LevainPlan, flourRatio?: number | null): Explanation {
  const { seed, levain, flourToAdd, waterToAdd, levainWeight, levainHydration: h } = plan;
  const seedWeight = seed.flour + seed.water;
  const seedHydration = seed.flour > 0 ? (seed.water / seed.flour) * 100 : 0;
  if (flourRatio !== undefined && flourRatio !== null) {
    const back = weightOf(plan.backToFridge);
    return {
      title: 'Flour and water to add',
      intro:
        'You chose how much flour to add. The water then follows from the levain hydration, ' +
        'and whatever the dough does not need goes back to the fridge.',
      formula: `Flour to add = starter × ${n(flourRatio)}`,
      steps: [
        { text: `Flour to add (1 : ${n(flourRatio)}):`, math: `${g(seedWeight)} × ${n(flourRatio)} = ${g(flourToAdd)}` },
        { text: 'Flour already in the starter:', math: `${g(seedWeight)} × 100 ÷ ${n(100 + seedHydration)} = ${g(seed.flour)}` },
        { text: 'All flour in the levain:', math: `${g(seed.flour)} + ${g(flourToAdd)} = ${g(levain.flour)}` },
        { text: `Levain at ${p(h)}:`, math: `${g(levain.flour)} × ${n(100 + h)} ÷ 100 = ${g(levainWeight)}` },
        { text: 'Water to add:', math: `${g(levain.water)} − ${g(seed.water)} = ${g(waterToAdd)}` },
        { text: 'Back to the fridge:', math: `${g(levainWeight)} − ${g(levainWeight - back)} = ${g(back)}` },
      ],
      result: `Add ${g(flourToAdd)} flour and ${g(waterToAdd)} water. You get ${g(levainWeight)} of levain.`,
    };
  }
  return {
    title: 'Flour and water to add',
    intro:
      'The starter you take already has some flour and water in it. ' +
      'First we find how much flour and water the levain needs. Then we take away what the starter already has.',
    formula: 'To add = what the levain needs − what the starter already has',
    steps: [
      {
        text: 'Levain to make (for the dough + back to the fridge):',
        math: `${g(weightOf(plan.forDough))} + ${g(weightOf(plan.backToFridge))} = ${g(levainWeight)}`,
      },
      { text: `Flour the levain needs (at ${p(h)}):`, math: `${g(levainWeight)} × 100 ÷ ${n(100 + h)} = ${g(levain.flour)}` },
      { text: 'Water the levain needs:', math: `${g(levainWeight)} − ${g(levain.flour)} = ${g(levain.water)}` },
      {
        text: `Flour already in your ${g(seedWeight)} of starter:`,
        math: `${g(seedWeight)} × 100 ÷ ${n(100 + seedHydration)} = ${g(seed.flour)}`,
      },
      { text: 'Water already in it:', math: `${g(seedWeight)} − ${g(seed.flour)} = ${g(seed.water)}` },
      { text: 'Flour to add:', math: `${g(levain.flour)} − ${g(seed.flour)} = ${g(flourToAdd)}` },
      { text: 'Water to add:', math: `${g(levain.water)} − ${g(seed.water)} = ${g(waterToAdd)}` },
    ],
    result: `Add ${g(flourToAdd)} flour and ${g(waterToAdd)} water. You get ${g(levainWeight)} of levain.`,
  };
}

export function explainLevainSplit(plan: LevainPlan): Explanation {
  const { levain, levainWeight, levainHydration: h, backToFridge } = plan;
  const back = weightOf(backToFridge);
  return {
    title: 'Into the dough and back to the fridge',
    intro:
      'The levain is all mixed together, so both parts are equally wet. ' +
      'What goes back to the fridge is your starter for next time.',
    formula: 'Back to the fridge = levain − levain for the dough',
    steps: [
      { text: 'Back to the fridge:', math: `${g(levainWeight)} − ${g(levainWeight - back)} = ${g(back)}` },
      { text: 'Flour in it:', math: `${g(levain.flour)} × ${g(back)} ÷ ${g(levainWeight)} = ${g(backToFridge.flour)}` },
      { text: 'Water in it:', math: `${g(back)} − ${g(backToFridge.flour)} = ${g(backToFridge.water)}` },
    ],
    result: `${g(levainWeight - back)} goes into the dough. ${g(back)} goes back to the fridge (${p(h)}).`,
  };
}

// ----- Recipe ---------------------------------------------------------------

export function explainLevainAmount(r: Recipe): Explanation {
  const { levain } = r;
  const split = explainSplit(levain.weight, levain.hydration, 'levain');
  return {
    title: 'Levain',
    intro: 'Levain is set as a % of the flour you add. Part of it is flour and part is water.',
    formula: 'Levain = flour × levain % ÷ 100',
    steps: [{ text: 'Levain:', math: `${g(r.flour)} × ${n(r.levainPercent)} ÷ 100 = ${g(levain.weight)}` }, ...split.steps],
    result: `${g(levain.weight)} levain = ${g(levain.flour)} flour + ${g(levain.water)} water`,
  };
}

export function explainFlourType(t: RecipeFlourLine, flour: number): Explanation {
  const name = t.name || 'Flour type';
  return {
    title: name,
    intro: `${name} is part of the ${g(flour)} of flour, not extra.`,
    formula: `${name} = flour × % ÷ 100`,
    steps: [{ text: 'Work it out:', math: `${g(flour)} × ${n(t.percent)} ÷ 100 = ${g(t.weight)}` }],
    result: `${name}: ${g(t.weight)}`,
  };
}

export function explainMainFlour(r: Recipe): Explanation {
  const types = r.flourTypes.map((t) => g(t.weight)).join(' − ');
  return {
    title: 'Main flour',
    intro: 'The flour that is left after the other flour types are taken out.',
    formula: 'Main flour = flour − other flour types',
    steps: [{ text: 'Take them away:', math: `${g(r.flour)} − ${types} = ${g(r.mainFlour)}` }],
    result: `Main flour: ${g(r.mainFlour)}`,
  };
}

export function explainTotalFlour(r: Recipe): Explanation {
  return {
    title: 'Total flour',
    intro: 'The flour you add plus the flour inside the levain. Water and salt are worked out from this number.',
    formula: 'Total flour = flour + flour in the levain',
    steps: [{ text: 'Add them up:', math: `${g(r.flour)} + ${g(r.levain.flour)} = ${g(r.totalFlour)}` }],
    result: `Total flour is ${g(r.totalFlour)}`,
  };
}

export function explainTotalWater(r: Recipe): Explanation {
  return {
    title: 'Total water',
    intro:
      'This is all the water in the dough, including the water in the levain and in liquid extras.',
    formula: 'Total water = total flour × hydration ÷ 100',
    steps: [{ text: 'Work it out:', math: `${g(r.totalFlour)} × ${n(r.doughHydration)} ÷ 100 = ${g(r.totalWater)}` }],
    result: `Total water is ${g(r.totalWater)}`,
  };
}

export function explainWaterToAdd(r: Recipe): Explanation {
  const liquids = r.extrasWater > 0;
  return {
    title: 'Water to add',
    intro: liquids
      ? 'Some water is already in the levain and in the liquid extras. You only add the rest.'
      : 'Some water is already in the levain. You only add the rest.',
    formula: liquids
      ? 'Water to add = total water − water in levain − water in liquid extras'
      : 'Water to add = total water − water in levain',
    steps: [
      liquids
        ? { text: 'Take away the water you already have:', math: `${g(r.totalWater)} − ${g(r.levain.water)} − ${g(r.extrasWater)} = ${g(r.water)}` }
        : { text: 'Take away the water in the levain:', math: `${g(r.totalWater)} − ${g(r.levain.water)} = ${g(r.water)}` },
    ],
    result: `Add ${g(r.water)} water`,
  };
}

export function explainExtra(x: RecipeExtraLine, totalFlour: number): Explanation {
  const name = x.name || 'Extra';
  const base = explainBakersPercent(name, x.percent, totalFlour);
  if (x.kind === 'dry') {
    return { ...base, intro: `${base.intro} It is dry, so it does not make the dough wetter.` };
  }
  return {
    ...base,
    intro: `${base.intro} It is a liquid, so its water counts as dough water. You add less plain water.`,
    steps: [
      ...base.steps,
      { text: 'Water in it:', math: `${g(x.weight)} × ${n(x.waterPercent)} ÷ 100 = ${g(x.water)}` },
    ],
    result: `${name}: ${g(x.weight)}, of which ${g(x.water)} is water`,
  };
}

export function explainBakersPercent(name: string, pct: number, totalFlour: number): Explanation {
  const weight = totalFlour * (pct / 100);
  return {
    title: name,
    intro: `${name} is set as a % of the total flour.`,
    formula: `${name} = total flour × % ÷ 100`,
    steps: [{ text: 'Work it out:', math: `${g(totalFlour)} × ${n(pct)} ÷ 100 = ${g(weight)}` }],
    result: `${name}: ${g(weight)}`,
  };
}

export function explainDoughWeight(r: Recipe): Explanation {
  const extras = r.extrasWeight > 0 ? ` + ${g(r.extrasWeight)}` : '';
  return {
    title: 'Dough weight',
    intro: 'Everything you put on the scale, added up.',
    formula: r.extrasWeight > 0 ? 'Dough = levain + flour + water + salt + extras' : 'Dough = levain + flour + water + salt',
    steps: [
      {
        text: 'Add it all up:',
        math: `${g(r.levain.weight)} + ${g(r.flour)} + ${g(r.water)} + ${g(r.salt)}${extras} = ${g(r.doughWeight)}`,
      },
    ],
    result: `The dough weighs ${g(r.doughWeight)}`,
  };
}
