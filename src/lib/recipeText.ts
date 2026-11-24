/** Plain-text recipe for copying, e.g. into notes or a chat. Whole grams, like a kitchen scale. */
import { teaspoonsPlain } from './format';
import { type LevainPlan, type Recipe, weightOf } from './sourdough';

const g = (n: number) => String(Math.round(n));
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

/**
 * 71%
 *
 * Sourdough:
 * 40:80:50              ← starter : flour : water for the levain
 *
 * 320g water
 * 120g starter (71:49)  ← flour : water inside it
 * 500g flour (400:50:50) ← main flour : flour types
 * 10g salt (about 1 2/3 teaspoon)
 */
export function recipeToText(r: Recipe, levain: LevainPlan | null): string {
  const lines: string[] = [pct(r.doughHydration), ''];

  if (levain) {
    lines.push('Sourdough:', `${g(weightOf(levain.seed))}:${g(levain.flourToAdd)}:${g(levain.waterToAdd)}`, '');
  }

  lines.push(`${g(r.water)}g water`);
  if (r.levain.weight > 0) {
    lines.push(`${g(r.levain.weight)}g starter (${g(r.levain.flour)}:${g(r.levain.water)})`);
  }
  const flourSplit =
    r.flourTypes.length > 0 ? ` (${[r.mainFlour, ...r.flourTypes.map((t) => t.weight)].map(g).join(':')})` : '';
  lines.push(`${g(r.flour)}g flour${flourSplit}`);

  const tsp = teaspoonsPlain(r.salt);
  const unit = Number.parseInt(tsp, 10) >= 2 ? 'teaspoons' : 'teaspoon';
  lines.push(`${g(r.salt)}g salt (about ${tsp} ${unit})`);

  r.extras.forEach((x) => lines.push(`${g(x.weight)}g ${x.name || 'extra'}`));

  return lines.join('\n');
}
