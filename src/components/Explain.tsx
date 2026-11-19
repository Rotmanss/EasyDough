import type { ReactNode } from 'react';
import type { Explanation } from '../lib/explain';
import { InfoIcon } from './Icons';

export function ExplainBody({ explanation: e }: { explanation: Explanation }) {
  return (
    <div className="explain__body">
      <p className="explain__intro">{e.intro}</p>
      <div className="explain__formula">
        <span className="explain__tag">In short</span>
        <code>{e.formula}</code>
      </div>
      <ol className="explain__steps">
        {e.steps.map((s, i) => (
          <li key={i}>
            <span>{s.text}</span>
            {s.math && <code>{s.math}</code>}
          </li>
        ))}
      </ol>
      <p className="explain__result">{e.result}</p>
    </div>
  );
}

interface ExplainProps {
  explanation: Explanation;
  /** Custom clickable summary (e.g. a whole ingredient row). Defaults to a small info link. */
  summary?: ReactNode;
  className?: string;
}

/** Collapsible "How is this calculated?" panel. Native <details> = accessible + no JS state. */
export function Explain({ explanation, summary, className = '' }: ExplainProps) {
  return (
    <details className={`explain ${summary ? 'explain--row' : ''} ${className}`}>
      <summary>
        {summary ?? (
          <span className="explain__link">
            <InfoIcon />
            Show how
          </span>
        )}
      </summary>
      <ExplainBody explanation={explanation} />
    </details>
  );
}
