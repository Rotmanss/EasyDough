import { useState } from 'react';
import { Explain } from '../../components/Explain';
import { Issues } from '../../components/Issues';
import { NumberField } from '../../components/NumberField';
import { Stat } from '../../components/Stat';
import { useStarter } from '../../hooks/useStarter';
import { explainHydration, explainSplit } from '../../lib/explain';
import { grams, percent } from '../../lib/format';
import {
  type Composition,
  MAX_HYDRATION,
  compositionFromWeight,
  hydrationOf,
  isValidAmount,
  isValidHydration,
  weightOf,
} from '../../lib/sourdough';

export function CurrentStarter() {
  const { current } = useStarter();
  const [editing, setEditing] = useState(false);

  if (!current || editing) {
    return <StarterSetup initial={current} onClose={current ? () => setEditing(false) : undefined} />;
  }

  const weight = weightOf(current);
  const hydration = hydrationOf(current);

  return (
    <section className="card card--hero" aria-labelledby="my-starter">
      <div className="card__head">
        <h2 id="my-starter">My starter (fridge)</h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
          Change
        </button>
      </div>
      <div className="stat-grid stat-grid--4">
        <Stat label="Total weight" value={weight} unit="g" size="xl" />
        <Stat label="Hydration" value={hydration} unit="%" size="xl">
          <Explain explanation={explainHydration(current.flour, current.water, 'your starter')} />
        </Stat>
        <Stat label="Flour" value={current.flour} unit="g" size="lg" />
        <Stat label="Water" value={current.water} unit="g" size="lg" />
      </div>
      {weight === 0 && <p className="notice">The jar is empty.</p>}
    </section>
  );
}

function StarterSetup({ initial, onClose }: { initial: Composition | null; onClose?: () => void }) {
  const { setup, reset } = useStarter();
  const [weight, setWeight] = useState(initial ? weightOf(initial) : 50);
  const [hydration, setHydration] = useState(initial ? (hydrationOf(initial) ?? 100) : 100);

  const valid = isValidAmount(weight) && isValidHydration(hydration);
  const composition = valid ? compositionFromWeight(weight, hydration) : null;

  return (
    <section className="card" aria-labelledby="starter-setup">
      <h2 id="starter-setup">{initial ? 'Change my starter' : 'Add your starter'}</h2>
      <p className="muted">
        {initial
          ? 'Weigh the starter (without the jar) and enter how wet it is.'
          : 'Weigh the starter you have now (without the jar) and enter how wet it is.'}
      </p>
      <div className="field-grid">
        <NumberField label="Starter weight" unit="g" value={weight} onChange={setWeight} invalid={!isValidAmount(weight)} />
        <NumberField
          label="Hydration"
          unit="%"
          value={hydration}
          onChange={setHydration}
          invalid={!isValidHydration(hydration)}
        />
      </div>
      {composition ? (
        <>
          <p className="split-line">
            = <strong>{grams(composition.flour)}</strong> flour + <strong>{grams(composition.water)}</strong> water
          </p>
          <Explain explanation={explainSplit(weight, hydration)} />
        </>
      ) : (
        <Issues
          issues={[
            {
              level: 'error',
              message: isValidAmount(weight) ? `Hydration must be 0–${MAX_HYDRATION}%.` : 'Enter the starter weight.',
            },
          ]}
        />
      )}
      <div className="actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!composition}
          onClick={() => {
            if (!composition) return;
            setup(composition);
            onClose?.();
          }}
        >
          Save starter
        </button>
        {onClose && (
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
        )}
        {initial && (
          <button
            type="button"
            className="btn btn--danger btn--sm push-right"
            onClick={() => {
              if (window.confirm('Delete your saved starter?')) reset();
            }}
          >
            Delete starter
          </button>
        )}
      </div>
      {initial && <p className="muted small">Now: {grams(weightOf(initial))} at {percent(hydrationOf(initial))}</p>}
    </section>
  );
}
