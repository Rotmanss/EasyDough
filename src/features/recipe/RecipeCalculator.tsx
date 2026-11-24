import { Explain } from '../../components/Explain';
import { CheckIcon, InfoIcon } from '../../components/Icons';
import { Issues } from '../../components/Issues';
import { NumberField } from '../../components/NumberField';
import { Stat } from '../../components/Stat';
import { useRecipe } from '../../hooks/useRecipe';
import { useSettled } from '../../hooks/useSettled';
import {
  explainBakersPercent,
  explainDoughWeight,
  explainExtra,
  explainHydration,
  explainLevainAmount,
  explainFlourType,
  explainMainFlour,
  explainTotalFlour,
  explainTotalWater,
  explainWaterToAdd,
} from '../../lib/explain';
import type { Explanation } from '../../lib/explain';
import { formatNumber, grams, percent, teaspoons } from '../../lib/format';
import { recipeReconciles, weighedTotal } from '../../lib/sourdough';
import { CopyRecipeButton } from './CopyRecipeButton';
import { ExtrasEditor } from './ExtrasEditor';
import { FlourTypesEditor } from './FlourTypesEditor';
import type { RecipePrefs } from './recipePrefs';

export function RecipeCalculator({ onOpenStarter }: { onOpenStarter: () => void }) {
  const { prefs, setPrefs, result: liveResult, reset } = useRecipe();
  const result = useSettled(liveResult, (r) => r.recipe !== null);

  const { recipe, maxLevainPercent } = result;
  const errorFields = new Set(result.issues.filter((i) => i.level === 'error').map((i) => i.field));

  const set = <K extends keyof RecipePrefs>(key: K, value: RecipePrefs[K]) =>
    setPrefs((p) => ({ ...p, [key]: value }));
  // Levain is stored as % of flour; the grams field converts both ways.
  const flourOk = Number.isFinite(prefs.flour) && prefs.flour > 0;

  return (
    <div className="layout-2col">
      <section className="panel" aria-labelledby="recipe-inputs">
        <h2 id="recipe-inputs" className="panel__title">
          Dough
        </h2>
        <div className="field-grid">
          <NumberField
            label="Flour"
            unit="g"
            value={prefs.flour}
            onChange={(v) => set('flour', v)}
            invalid={errorFields.has('flour')}
            hint="The flour you add. The flour in the levain is extra."
          />
          <NumberField
            label="Dough hydration"
            unit="%"
            value={prefs.doughHydration}
            onChange={(v) => set('doughHydration', v)}
            invalid={errorFields.has('doughHydration')}
            hint="How wet the dough is. Water in the levain counts too."
          />
          <NumberField
            label="Salt"
            unit="%"
            value={prefs.saltPercent}
            onChange={(v) => set('saltPercent', v)}
            invalid={errorFields.has('saltPercent')}
            hint={recipe ? `${grams(recipe.salt)} ≈ ${teaspoons(recipe.salt)}` : undefined}
          />
        </div>

        <h3 className="subhead">Flour types (optional)</h3>
        <FlourTypesEditor
          flour={prefs.flour}
          flourTypes={prefs.flourTypes}
          onChange={(flourTypes) => set('flourTypes', flourTypes)}
        />

        <h2 className="panel__title">Levain</h2>
        <div className="field-grid">
          <NumberField
            label="Levain amount"
            unit="%"
            value={prefs.levainPercent}
            onChange={(v) => set('levainPercent', v)}
            invalid={errorFields.has('levainPercent')}
            hint={
              !recipe && maxLevainPercent !== null && Number.isFinite(maxLevainPercent)
                ? `Use at most ${percent(maxLevainPercent)}`
                : 'of the flour'
            }
          />
          <NumberField
            label="Levain amount"
            unit="g"
            value={flourOk ? prefs.flour * (prefs.levainPercent / 100) : NaN}
            readOnly={!flourOk}
            onChange={(v) => set('levainPercent', (v / prefs.flour) * 100)}
            invalid={errorFields.has('levainPercent')}
          />
          <NumberField
            label="Levain hydration"
            unit="%"
            value={prefs.levainHydration}
            onChange={(v) => set('levainHydration', v)}
            invalid={errorFields.has('levainHydration')}
            hint="How wet the levain is."
          />
        </div>

        <h2 className="panel__title">
          Extras <span className="muted">(optional)</span>
        </h2>
        <ExtrasEditor extras={prefs.extras} onChange={(extras) => set('extras', extras)} />

        <div className="panel__footer">
          <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
            Reset to defaults
          </button>
        </div>
      </section>

      <section className="results" aria-label="Recipe results" aria-live="polite">
        <Issues issues={result.issues} />

        {recipe && (
          <>
            <div className="card card--hero">
              <Stat label="Dough weight" value={recipe.doughWeight} unit="g" size="xl" />
              <div className="chips">
                <span className="chip">Hydration {percent(recipe.doughHydration)}</span>
                <span className="chip">Levain {percent(recipe.levainPercent)}</span>
                <span className="chip">Salt {percent(recipe.saltPercent)}</span>
              </div>
              <Explain explanation={explainDoughWeight(recipe)} />
            </div>

            <div className="card">
              <div className="card__head">
                <h3>What to weigh</h3>
                <span className="muted small">tap a row to see how</span>
              </div>
              <div className="ingredients" role="list">
                <IngredientRow
                  name="Levain"
                  note={`${percent(recipe.levain.hydration)} · ${grams(recipe.levain.flour)} flour + ${grams(recipe.levain.water)} water`}
                  grams={recipe.levain.weight}
                  tag={percent(recipe.levainPercent)}
                  explanation={explainLevainAmount(recipe)}
                />
                {recipe.flourTypes.length === 0 ? (
                  <IngredientRow name="Flour" grams={recipe.flour} explanation={explainTotalFlour(recipe)} />
                ) : (
                  <>
                    <IngredientRow
                      name="Main flour"
                      grams={recipe.mainFlour}
                      tag={percent((recipe.mainFlour / recipe.flour) * 100)}
                      explanation={explainMainFlour(recipe)}
                    />
                    {recipe.flourTypes.map((t) => (
                      <IngredientRow
                        key={t.id}
                        name={t.name || 'Flour type'}
                        grams={t.weight}
                        tag={percent(t.percent)}
                        explanation={explainFlourType(t, recipe.flour)}
                      />
                    ))}
                  </>
                )}
                <IngredientRow
                  name="Water"
                  grams={recipe.water}
                  explanation={explainWaterToAdd(recipe)}
                />
                <IngredientRow
                  name="Salt"
                  note={`≈ ${teaspoons(recipe.salt)}`}
                  grams={recipe.salt}
                  tag={percent(recipe.saltPercent)}
                  explanation={explainBakersPercent('Salt', recipe.saltPercent, recipe.totalFlour)}
                />
                {recipe.extras.map((x) => (
                  <IngredientRow
                    key={x.id}
                    name={x.name || 'Extra ingredient'}
                    note={x.kind === 'liquid' ? `liquid · ${grams(x.water)} water counted in hydration` : 'dry · not in hydration'}
                    grams={x.weight}
                    tag={percent(x.percent)}
                    explanation={explainExtra(x, recipe.totalFlour)}
                  />
                ))}
              </div>
              <div className="ingredients__total">
                <span>Total dough</span>
                <span className="ingredients__total-value">{grams(weighedTotal(recipe))}</span>
              </div>
              {recipeReconciles(recipe) && (
                <p className="reconcile">
                  <CheckIcon /> Check: flour {grams(recipe.flour)} + {grams(recipe.levain.flour)} from levain ={' '}
                  {grams(recipe.totalFlour)} · water {grams(recipe.water)} + {grams(recipe.levain.water)} from levain
                  {recipe.extrasWater > 0 && ` + ${grams(recipe.extrasWater)} from extras`} = {grams(recipe.totalWater)}
                </p>
              )}
            </div>

            <div className="card">
              <h3>Recipe totals</h3>
              <div className="stat-grid">
                <Stat label="Total flour" value={recipe.totalFlour} unit="g" size="lg">
                  <Explain explanation={explainTotalFlour(recipe)} />
                </Stat>
                <Stat label="Total water" value={recipe.totalWater} unit="g" size="lg">
                  <Explain explanation={explainTotalWater(recipe)} />
                </Stat>
                <Stat label="Dough hydration" value={recipe.doughHydration} unit="%" size="lg">
                  <Explain explanation={explainHydration(recipe.totalFlour, recipe.totalWater, 'the whole dough')} />
                </Stat>
                <Stat label="Flour in levain" value={recipe.levain.flour} unit="g" />
                <Stat label="Water in levain" value={recipe.levain.water} unit="g" />
                <Stat label="Levain hydration" value={recipe.levain.hydration} unit="%" />
                {recipe.extrasWater > 0 && <Stat label="Water in extras" value={recipe.extrasWater} unit="g" />}
              </div>
            </div>

            {recipe.levain.weight > 0 && (
              <div className="card card--soft">
                <h3>Levain</h3>
                <p>
                  You need <strong>{grams(recipe.levain.weight)}</strong> of levain ({percent(recipe.levain.hydration)}).
                  Make it from your starter.
                </p>
                <div className="actions">
                  <button type="button" className="btn btn--primary" onClick={onOpenStarter}>
                    Make the levain →
                  </button>
                </div>
              </div>
            )}

            <CopyRecipeButton recipe={recipe} levainHydration={prefs.levainHydration} />
          </>
        )}
      </section>
    </div>
  );
}

interface IngredientRowProps {
  name: string;
  note?: string;
  grams: number;
  tag?: string;
  explanation: Explanation;
}

function IngredientRow({ name, note, grams: g, tag, explanation }: IngredientRowProps) {
  return (
    <div role="listitem">
      <Explain
        explanation={explanation}
        summary={
          <span className="ingredient">
            <span className="ingredient__name">
              {name}
              {note && <small>{note}</small>}
            </span>
            <span className="ingredient__pct">{tag}</span>
            <span className="ingredient__grams">
              {formatNumber(g, 1)}
              <small> g</small>
            </span>
            <InfoIcon className="ingredient__info" />
          </span>
        }
      />
    </div>
  );
}
