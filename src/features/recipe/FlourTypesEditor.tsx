import { CloseIcon, PlusIcon } from '../../components/Icons';
import { NumberField } from '../../components/NumberField';
import { grams } from '../../lib/format';
import { type FlourType, isValidAmount } from '../../lib/sourdough';
import { newId } from '../../lib/storage';

interface FlourTypesEditorProps {
  flour: number;
  flourTypes: readonly FlourType[];
  onChange: (flourTypes: FlourType[]) => void;
}

/** Parts of the dough flour, entered in % or grams; the rest is the main flour. */
export function FlourTypesEditor({ flour, flourTypes, onChange }: FlourTypesEditorProps) {
  const flourOk = Number.isFinite(flour) && flour > 0;
  const update = (id: string, patch: Partial<FlourType>) =>
    onChange(flourTypes.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const usedPercent = flourTypes.reduce((sum, t) => sum + (isValidAmount(t.percent) ? t.percent : 0), 0);

  return (
    <div className="extras">
      {flourTypes.map((t, i) => (
        <div className="flour-types__row" key={t.id}>
          <div className="field flour-types__name">
            <label className="field__label" htmlFor={`flour-type-${t.id}`}>
              Flour type {i + 1}
            </label>
            <div className="field__control">
              <input
                id={`flour-type-${t.id}`}
                type="text"
                value={t.name}
                maxLength={60}
                placeholder="e.g. Whole wheat"
                onChange={(e) => update(t.id, { name: e.target.value })}
              />
            </div>
          </div>
          <button
            type="button"
            className="icon-btn extras__remove"
            aria-label={`Remove ${t.name || `flour type ${i + 1}`}`}
            onClick={() => onChange(flourTypes.filter((x) => x.id !== t.id))}
          >
            <CloseIcon />
          </button>
          <NumberField
            label="Amount"
            unit="%"
            value={t.percent}
            invalid={!isValidAmount(t.percent)}
            onChange={(percent) => update(t.id, { percent })}
          />
          <NumberField
            label="Amount"
            unit="g"
            value={flourOk ? flour * (t.percent / 100) : NaN}
            readOnly={!flourOk}
            onChange={(g) => update(t.id, { percent: (g / flour) * 100 })}
          />
        </div>
      ))}
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => onChange([...flourTypes, { id: newId(), name: '', percent: 0 }])}
      >
        <PlusIcon /> Add flour type
      </button>
      {flourTypes.length > 0 && flourOk && (
        <p className="field__hint">
          Part of the {grams(flour)} of flour. Main flour left: {grams(Math.max(0, flour * (1 - usedPercent / 100)))}.
        </p>
      )}
    </div>
  );
}
