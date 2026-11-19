import { CloseIcon, PlusIcon } from '../../components/Icons';
import { NumberField } from '../../components/NumberField';
import { Segmented } from '../../components/Segmented';
import { type ExtraIngredient, type ExtraKind, isValidAmount } from '../../lib/sourdough';
import { newId } from '../../lib/storage';

const KINDS = [
  { value: 'dry', label: 'Dry — seeds, nuts' },
  { value: 'liquid', label: 'Liquid — milk, honey, butter' },
] as const satisfies readonly { value: ExtraKind; label: string }[];

interface ExtrasEditorProps {
  extras: readonly ExtraIngredient[];
  onChange: (extras: ExtraIngredient[]) => void;
}

export function ExtrasEditor({ extras, onChange }: ExtrasEditorProps) {
  const update = (id: string, patch: Partial<ExtraIngredient>) =>
    onChange(extras.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <div className="extras">
      {extras.map((x, i) => (
        <div className="extras__item" key={x.id}>
          <div className="extras__row">
            <div className="field">
              <label className="field__label" htmlFor={`extra-${x.id}`}>
                Ingredient {i + 1}
              </label>
              <div className="field__control">
                <input
                  id={`extra-${x.id}`}
                  type="text"
                  value={x.name}
                  maxLength={60}
                  placeholder="e.g. Seeds, honey"
                  onChange={(e) => update(x.id, { name: e.target.value })}
                />
              </div>
            </div>
            <NumberField
              label="Amount"
              unit="%"
              value={x.percent}
              invalid={!isValidAmount(x.percent)}
              onChange={(percent) => update(x.id, { percent })}
            />
            <button
              type="button"
              className="icon-btn extras__remove"
              aria-label={`Remove ${x.name || `ingredient ${i + 1}`}`}
              onClick={() => onChange(extras.filter((e) => e.id !== x.id))}
            >
              <CloseIcon />
            </button>
          </div>
          <Segmented
            label={`Type of ${x.name || `ingredient ${i + 1}`}`}
            value={x.kind}
            options={KINDS}
            onChange={(kind) => update(x.id, { kind })}
          />
          {x.kind === 'liquid' ? (
            <NumberField
              label="Water in it"
              unit="%"
              value={x.waterPercent}
              invalid={!isValidAmount(x.waterPercent) || x.waterPercent > 100}
              onChange={(waterPercent) => update(x.id, { waterPercent })}
            />
          ) : (
            <p className="field__hint">Does not make the dough wetter.</p>
          )}
        </div>
      ))}
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => onChange([...extras, { id: newId(), name: '', percent: 0, kind: 'dry', waterPercent: 100 }])}
      >
        <PlusIcon /> Add ingredient
      </button>
      {extras.length > 0 && <p className="field__hint">Amounts are a % of the total flour.</p>}
    </div>
  );
}
