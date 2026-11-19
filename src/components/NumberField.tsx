import { type ReactNode, useEffect, useId, useState } from 'react';
import { formatNumber, parseDecimal, toInputText } from '../lib/format';

interface NumberFieldProps {
  label: string;
  value: number;
  /** Receives NaN when the field is empty or not a number — validation happens in the engine. */
  onChange?: (value: number) => void;
  unit: string;
  hint?: ReactNode;
  readOnly?: boolean;
  invalid?: boolean;
}

const same = (a: number, b: number) =>
  (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a));

export function NumberField({ label, value, onChange, unit, hint, readOnly, invalid }: NumberFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  // Raw text is kept locally so partial input like "7." or "" isn't overwritten while typing.
  const [text, setText] = useState(() => toInputText(value));

  useEffect(() => {
    setText((prev) => (same(parseDecimal(prev), value) ? prev : toInputText(value)));
  }, [value]);

  return (
    <div className={`field${invalid ? ' field--invalid' : ''}${readOnly ? ' field--readonly' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <div className="field__control">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          spellCheck={false}
          value={readOnly ? formatNumber(value, 2) : text}
          readOnly={readOnly}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? hintId : undefined}
          onFocus={(e) => !readOnly && e.currentTarget.select()}
          onChange={(e) => {
            setText(e.target.value);
            onChange?.(parseDecimal(e.target.value));
          }}
        />
        <span className="field__unit">{unit}</span>
      </div>
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
    </div>
  );
}
