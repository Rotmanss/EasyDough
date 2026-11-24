import { describe, expect, it } from 'vitest';
import { recipeToText } from './recipeText';
import { calculateRecipe, compositionFromWeight, planLevain } from './sourdough';

describe('recipeToText', () => {
  it('matches the kitchen format', () => {
    // 500 g flour (400 + 50 + 50), 120 g levain at 70%, 70% dough, 2% salt.
    const recipe = calculateRecipe({
      flour: 500,
      flourTypes: [
        { id: 'w', name: 'Whole wheat', percent: 10 },
        { id: 'r', name: 'Rye', percent: 10 },
      ],
      doughHydration: 70,
      levainPercent: 24,
      levainHydration: 70,
      saltPercent: 2,
      extras: [],
    }).recipe!;
    const levain = planLevain({
      seed: compositionFromWeight(40, 70),
      levainHydration: 70,
      forDough: 120,
      backToFridge: 50,
    }).plan!;

    expect(recipeToText(recipe, levain)).toBe(
      [
        '70%',
        '',
        'Sourdough:',
        `40:${Math.round(levain.flourToAdd)}:${Math.round(levain.waterToAdd)}`,
        '',
        '350g water',
        '120g starter (71:49)',
        '500g flour (400:50:50)',
        '11g salt (about 2 teaspoons)',
      ].join('\n'),
    );
  });

  it('leaves out the sourdough line without a levain plan and the split without flour types', () => {
    const recipe = calculateRecipe({
      flour: 500,
      flourTypes: [],
      doughHydration: 70,
      levainPercent: 20,
      levainHydration: 100,
      saltPercent: 2,
      extras: [],
    }).recipe!;
    const text = recipeToText(recipe, null);
    expect(text).not.toContain('Sourdough');
    expect(text).toContain('\n500g flour\n');
  });
});
