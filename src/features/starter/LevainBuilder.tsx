import { useState } from 'react';
import { Explain } from '../../components/Explain';
import { UndoIcon } from '../../components/Icons';
import { Issues } from '../../components/Issues';
import { NumberField } from '../../components/NumberField';
import { Stat } from '../../components/Stat';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useRecipe } from '../../hooks/useRecipe';
import { useStarter } from '../../hooks/useStarter';
import { explainLevain, explainLevainSplit } from '../../lib/explain';
import { formatNumber, grams, percent } from '../../lib/format';
import { TOLERANCE, hydrationOf, isValidHydration, weightOf } from '../../lib/sourdough';
import { LEVAIN_STORAGE_KEY, type LevainPrefs, computeLevain, parseLevainPrefs } from './levainSetup';

export function LevainBuilder() {
  const starter = useStarter();
  const { prefs: recipePrefs, result: recipeResult } = useRecipe();
  const [prefs, setPrefs] = usePersistentState(LEVAIN_STORAGE_KEY, parseLevainPrefs);
  const [notice, setNotice] = useState<string | null>(null);
  const set = <K extends keyof LevainPrefs>(k: K, v: LevainPrefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));

  const recipe = recipeResult.recipe;
  const synced = prefs.syncWithRecipe;
  const { jar, jarWeight, starterHydration, forDough, levainHydration, flourRatio, issues, plan } = computeLevain(
    prefs,
    starter.current,
    recipe,
    recipePrefs.levainHydration,
  );
  const errorFields = new Set(issues.filter((i) => i.level === 'error').map((i) => i.field));

  return (
    <section className="panel" aria-labelledby="levain-builder">
      <h2 id="levain-builder" className="panel__title">
        Make the levain
      </h2>
      <p className="muted small">
        Take some starter, add flour and water. Use part in the dough and put the rest back in the fridge.
      </p>

      {starter.current && (
        <label className="check">
          <input type="checkbox" checked={prefs.useMyStarter} onChange={(e) => set('useMyStarter', e.target.checked)} />
          <span>Use my saved starter</span>
        </label>
      )}

      <h3 className="subhead">1 · Starter</h3>
      {jar && (
        <p className="small">
          In the jar: <strong>{grams(jarWeight)}</strong> at {percent(starterHydration)}
        </p>
      )}
      <div className="field-grid">
        <NumberField
          label="Starter to take"
          unit="g"
          value={prefs.seed}
          onChange={(v) => set('seed', v)}
          invalid={errorFields.has('seed')}
        />
        {jar ? (
          <NumberField label="Starter hydration" unit="%" value={starterHydration ?? NaN} readOnly />
        ) : (
          <NumberField
            label="Starter hydration"
            unit="%"
            value={prefs.manualHydration}
            onChange={(v) => set('manualHydration', v)}
            invalid={!isValidHydration(prefs.manualHydration)}
          />
        )}
      </div>
      {jar && Math.abs(prefs.seed - jarWeight) > TOLERANCE && jarWeight > 0 && (
        <div className="actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => set('seed', jarWeight)}>
            Take all ({grams(jarWeight)})
          </button>
        </div>
      )}

      <h3 className="subhead">2 · Levain</h3>
      <label className="check">
        <input type="checkbox" checked={synced} onChange={(e) => set('syncWithRecipe', e.target.checked)} />
        <span>
          Same as recipe{' '}
          {recipe && (
            <span className="muted">
              ({grams(recipe.levain.weight)} at {percent(recipe.levain.hydration)})
            </span>
          )}
        </span>
      </label>
      <div className="field-grid">
        <NumberField
          label="For the dough"
          unit="g"
          value={forDough}
          readOnly={synced}
          onChange={(v) => set('forDough', v)}
          invalid={!synced && errorFields.has('forDough')}
        />
        <NumberField
          label="Levain hydration"
          unit="%"
          value={levainHydration}
          readOnly={synced}
          onChange={(v) => set('levainHydration', v)}
          invalid={!synced && errorFields.has('levainHydration')}
        />
        <NumberField
          label="Back to the fridge"
          unit="g"
          value={prefs.useFlourRatio ? (plan ? weightOf(plan.backToFridge) : NaN) : prefs.backToFridge}
          readOnly={prefs.useFlourRatio}
          onChange={(v) => set('backToFridge', v)}
          invalid={!prefs.useFlourRatio && errorFields.has('backToFridge')}
        />
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={prefs.useFlourRatio}
          onChange={(e) => set('useFlourRatio', e.target.checked)}
        />
        <span>Choose the flour amount myself</span>
      </label>
      {prefs.useFlourRatio && (
        <div className="field-grid">
          <NumberField
            label="Flour per 1 g starter"
            unit="g"
            value={prefs.flourRatio}
            onChange={(v) => set('flourRatio', v)}
            invalid={errorFields.has('flourRatio')}
            hint={`Starter : flour = 1 : ${Number.isFinite(prefs.flourRatio) ? formatNumber(prefs.flourRatio, 2) : '?'}`}
          />
        </div>
      )}

      <Issues issues={issues} />

      {plan && (
        <div className="result-box">
          <div className="stat-grid stat-grid--2">
            <Stat label="Add flour" value={plan.flourToAdd} unit="g" size="xl" />
            <Stat label="Add water" value={plan.waterToAdd} unit="g" size="xl" />
          </div>
          {plan.ratio && (
            <p className="ratio-line">
              Starter : flour : water ={' '}
              <strong>
                1 : {formatNumber(plan.ratio[1], 2)} : {formatNumber(plan.ratio[2], 2)}
              </strong>
            </p>
          )}
          <div className="stat-grid">
            <Stat label="Levain" value={plan.levainWeight} unit="g" />
            <Stat label="Hydration" value={plan.levainHydration} unit="%" decimals={2} />
            <Stat label="Flour" value={plan.levain.flour} unit="g" />
            <Stat label="Water" value={plan.levain.water} unit="g" />
          </div>
          <Explain explanation={explainLevain(plan, flourRatio)} />

          <div className="leftover">
            <h3 className="subhead">When it’s ready</h3>
            <div className="stat-grid">
              <Stat label="Into the dough" value={weightOf(plan.forDough)} unit="g" size="lg" />
              <Stat label="Back to the fridge" value={weightOf(plan.backToFridge)} unit="g" size="lg" />
              <Stat label="Hydration" value={plan.levainHydration} unit="%" decimals={2} size="lg" />
            </div>
            <Explain explanation={explainLevainSplit(plan)} />
          </div>

          {jar && (
            <div className="actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  starter.levain(Math.min(prefs.seed, jarWeight), plan.flourToAdd, plan.waterToAdd, weightOf(plan.forDough));
                  const after = plan.backToFridge;
                  setNotice(`Saved. Your starter is now ${grams(weightOf(after))} at ${percent(hydrationOf(after))}.`);
                }}
              >
                Done — save my starter
              </button>
              {notice && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    starter.undo();
                    setNotice(null);
                  }}
                >
                  <UndoIcon /> Undo
                </button>
              )}
            </div>
          )}
          {notice && <p className="notice">{notice}</p>}
        </div>
      )}
    </section>
  );
}
