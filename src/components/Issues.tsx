import type { Issue } from '../lib/sourdough';
import { AlertIcon } from './Icons';

export function Issues({ issues }: { issues: readonly Issue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="issues" aria-live="polite">
      {issues.map((issue, i) => (
        <li key={i} className={`issue issue--${issue.level}`}>
          <AlertIcon />
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}
