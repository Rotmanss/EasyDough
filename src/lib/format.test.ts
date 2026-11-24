import { describe, expect, it } from 'vitest';
import { explainLevain, explainSplit } from './explain';
import { formatNumber, parseDecimal, teaspoons, teaspoonsPlain, toInputText } from './format';
import { compositionFromWeight, planLevain } from './sourdough';

describe('parseDecimal', () => {
  it('accepts dot and comma decimals', () => {
    expect(parseDecimal('62.5')).toBe(62.5);
    expect(parseDecimal(' 62,5 ')).toBe(62.5);
    expect(parseDecimal('7.')).toBe(7);
    expect(parseDecimal('.5')).toBe(0.5);
  });
  it('returns NaN for empty or invalid text', () => {
    expect(parseDecimal('')).toBeNaN();
    expect(parseDecimal('abc')).toBeNaN();
    expect(parseDecimal('1.2.3')).toBeNaN();
    expect(parseDecimal('.')).toBeNaN();
  });
});

describe('formatting', () => {
  it('never shows -0', () => {
    expect(formatNumber(-0.00001, 1)).toBe('0');
  });
  it('rounds only for display', () => {
    expect(formatNumber(70.588235, 1)).toMatch(/^70[.,]6$/);
    expect(toInputText(76.315789473)).toBe('76.3158');
  });
});

describe('teaspoons', () => {
  it('rounds salt grams to the nearest kitchen fraction (6 g per tsp)', () => {
    expect(teaspoons(6)).toBe('1 tsp');
    expect(teaspoons(12)).toBe('2 tsp');
    expect(teaspoons(11.2)).toBe('1¾ tsp');
    expect(teaspoons(10)).toBe('1⅔ tsp');
    expect(teaspoons(3)).toBe('½ tsp');
    expect(teaspoons(0.5)).toBe('< ¼ tsp');
    expect(teaspoons(0)).toBe('0 tsp');
  });

  it('has a plain-text version', () => {
    expect(teaspoonsPlain(10)).toBe('1 2/3');
    expect(teaspoonsPlain(6)).toBe('1');
    expect(teaspoonsPlain(2)).toBe('1/3');
  });
});

describe('explanations', () => {
  it('flour-in-starter explanation uses the real values', () => {
    const e = explainSplit(120, 70);
    expect(e.steps[0]!.math).toMatch(/70[.,]588/);
    expect(e.result).toMatch(/49[.,]412/);
  });

  it('levain explanation shows the flour and water to add', () => {
    const { plan } = planLevain({
      seed: compositionFromWeight(50, 70),
      levainHydration: 70,
      forDough: 120,
      backToFridge: 50,
    });
    expect(explainLevain(plan!).result).toMatch(/70[.,]588 g flour and 49[.,]412 g water/);
  });
});
