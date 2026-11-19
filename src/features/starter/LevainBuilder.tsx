import { useState } from 'react';
import { Explain } from '../../components/Explain';
import { UndoIcon } from '../../components/Icons';
import { Issues } from '../../components/Issues';
import { NumberField } from '../../components/NumberField';
import { Stat } from '../../components/Stat';
import { num, usePersistentState } from '../../hooks/usePersistentState';
import { useRecipe } from '../../hooks/useRecipe';
import { useStarter } from '../../hooks/useStarter';
import { explainLevain, explainLevainSplit } from '../../lib/explain';
import { formatNumber, grams, percent } from '../../lib/format';
import {
  type Composition,
  type Issue,
  MAX_HYDRATION,
  TOLERANCE,
  compositionFromWeight,
  hydrationOf,
  isValidAmount,
  isValidHydration,
  planLevain,
  takePortion,
  weightOf,
} from '../../lib/sourdough';

interface LevainPrefs {
  useMyStarter: boolean;
  /** Grams of starter taken from the fridge jar. */
  seed: number;
  manualHydration: number;
  syncWithRecipe: boolean;
  forDough: number;
  levainHydration: number;
  backToFridge: number;
  useFlourRatio: boolean;
  flourRatio: number;
}

function parseLevainPrefs(raw: unknown): LevainPrefs {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    useMyStarter: r.useMyStarter !== false,
    seed: num(r.seed, 50),
    manualHydration: num(r.manualHydration, 70),
    syncWithRecipe: r.syncWithRecipe !== false,
    forDough: num(r.forDough, 120),
    levainHydration: num(r.levainHydration, 70),
    backToFridge: num(r.backToFridge, 50),
    useFlourRatio: r.useFlourRatio === true,
    flourRatio: num(r.flourRatio, 2),
  };
}

const INVALID: Composition = { flour: NaN, water: NaN };

export function LevainBuilder() {
  const starter = useStarter();
  const { prefs: recipePrefs, result: recipeResult } = useRecipe();
  const [prefs, setPrefs] = usePersistentState('easydough.levain.v1', parseLevainPrefs);
  const [notice, setNotice] = useState<string | null>(null);
  const set = <K extends keyof LevainPrefs>(k: K, v: LevainPrefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));

  const jar = prefs.useMyStarter ? starter.current : null;
  const jarWeight = jar ? weightOf(jar) : 0;
  const starterHydration = jar ? hydrationOf(jar) : prefs.manualHydration;

  const inputIssues: Issue[] = [];
  let seed = INVALID;
  if (!isValidAmount(prefs.seed)) {
    inputIssues.push({ level: 'error', field: 'seed', message: 'Enter how much starter you take.' });
  } else if (jar) {
    if (prefs.seed > jarWeight + TOLERANCE) {
      inputIssues.push({ level: 'error', field: 'seed', message: `You only have ${grams(jarWeight)} of starter.` });
    } else {
      seed = takePortion(jar, Math.min(prefs.seed, jarWeight)).portion;
    }
  } else if (!isValidHydration(prefs.manualHydration)) {
    inputIssues.push({ level: 'error', field: 'seed', message: `Starter hydration must be 0–${MAX_HYDRATION}%.` });
  } else {
    seed = compositionFromWeight(prefs.seed, prefs.manualHydration);
  }

  const recipe = recipeResult.recipe;
  const synced = prefs.syncWithRecipe;
  if (synced && !recipe) {
    inputIssues.push({
      level: 'error',
      message: 'Something is wrong in the Recipe tab. Fix it there, or untick “Same as recipe”.',
    });
  }
  const forDough = synced ? (recipe?.levain.weight ?? NaN) : prefs.forDough;
  const levainHydration = synced ? recipePrefs.levainHydration : prefs.levainHydration;

  const flourRatio = prefs.useFlourRatio ? prefs.flourRatio : null;
  const result = planLevain({ seed, levainHydration, forDough, backToFridge: prefs.backToFridge, flourRatio });
  const issues = inputIssues.length > 0 ? inputIssues : result.issues;
  const plan = inputIssues.length > 0 ? null : result.plan;
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
