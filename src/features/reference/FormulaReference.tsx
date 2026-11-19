import { ExplainBody } from '../../components/Explain';
import {
  type Explanation,
  explainBakersPercent,
  explainDoughWeight,
  explainHydration,
  explainLevain,
  explainLevainAmount,
  explainLevainSplit,
  explainSplit,
  explainTotalFlour,
  explainTotalWater,
  explainWaterToAdd,
} from '../../lib/explain';
import { MAX_COMFORTABLE_LEVAIN_PERCENT, calculateRecipe, compositionFromWeight, planLevain } from '../../lib/sourdough';
import { DEFAULT_RECIPE } from '../recipe/recipePrefs';

const exampleRecipe = calculateRecipe(DEFAULT_RECIPE).recipe!;
const levain70 = planLevain({
  seed: compositionFromWeight(50, 70),
  levainHydration: 70,
  forDough: 120,
  backToFridge: 50,
}).plan!;
const levain100to70 = planLevain({
  seed: compositionFromWeight(50, 100),
  levainHydration: 70,
  forDough: 120,
  backToFridge: 50,
}).plan!;

const maxLevain: Explanation = {
  title: 'How much levain',
  intro:
    `Up to ${MAX_COMFORTABLE_LEVAIN_PERCENT}% of the flour is normal. ` +
    `Above ${MAX_COMFORTABLE_LEVAIN_PERCENT}% the app warns that it might be too much.`,
  formula: 'Levain % = levain ÷ flour × 100',
  steps: [
    { text: '500 g flour, 200 g levain:', math: '200 ÷ 500 × 100 = 40% → fine' },
    { text: '500 g flour, 250 g levain:', math: '250 ÷ 500 × 100 = 50% → might be too much' },
  ],
  result: `Keep the levain at ${MAX_COMFORTABLE_LEVAIN_PERCENT}% of the flour or less.`,
};

interface Section {
  heading: string;
  items: { example: string; explanation: Explanation }[];
}

const SECTIONS: Section[] = [
  {
    heading: 'Basics',
    items: [
      { example: '100 g flour, 70 g water', explanation: explainHydration(100, 70, 'a mix') },
      { example: '50 g starter at 70%', explanation: explainSplit(50, 70) },
    ],
  },
  {
    heading: 'Levain: 50 g starter → 120 g for the dough + 50 g back to the fridge',
    items: [
      { example: '70% starter, 70% levain', explanation: explainLevain(levain70) },
      { example: 'Splitting 170 g of levain', explanation: explainLevainSplit(levain70) },
      { example: '100% starter, 70% levain', explanation: explainLevain(levain100to70) },
    ],
  },
  {
    heading: 'Dough: 500 g flour, 20% levain at 70%, 70% hydration, 2% salt',
    items: [
      { example: 'Levain', explanation: explainLevainAmount(exampleRecipe) },
      { example: 'Total flour', explanation: explainTotalFlour(exampleRecipe) },
      { example: 'Total water', explanation: explainTotalWater(exampleRecipe) },
      { example: 'Water to add', explanation: explainWaterToAdd(exampleRecipe) },
      { example: 'Salt at 2%', explanation: explainBakersPercent('Salt', 2, exampleRecipe.totalFlour) },
      { example: 'Dough weight', explanation: explainDoughWeight(exampleRecipe) },
      { example: 'Levain amount', explanation: maxLevain },
    ],
  },
];

const GLOSSARY: [string, string][] = [
  ['Starter', 'What you keep in the fridge.'],
  ['Levain', 'Starter mixed with fresh flour and water before baking. Some goes into the dough, the rest goes back to the fridge.'],
  ['Flour', 'The flour you add to the dough. The flour in the levain is extra.'],
  ['Levain %', 'How much levain to use, as a % of the flour. 500 g flour × 20% = 100 g levain.'],
  ['Hydration', 'How wet something is: grams of water for every 100 g of flour. 70% = 70 g water per 100 g flour.'],
  ['Nothing thrown away', 'What goes back to the fridge becomes your starter for next time.'],
];

export function FormulaReference() {
  return (
    <div className="stack reference">
      <section className="card">
        <h2>How it works</h2>
        <p className="muted">The words used in the app, and how each number is worked out.</p>
        <dl className="glossary">
          {GLOSSARY.map(([term, def]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{def}</dd>
            </div>
          ))}
        </dl>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.heading} className="stack">
          <h2 className="section-title">{s.heading}</h2>
          <div className="reference__grid">
            {s.items.map(({ example, explanation }) => (
              <article key={explanation.title + example} className="card formula-card">
                <h3>{explanation.title}</h3>
                <p className="formula-card__example">{example}</p>
                <ExplainBody explanation={explanation} />
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
