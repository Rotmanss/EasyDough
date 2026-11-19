import { CurrentStarter } from './CurrentStarter';
import { LevainBuilder } from './LevainBuilder';

export function StarterTab() {
  return (
    <div className="stack">
      <CurrentStarter />
      <LevainBuilder />
    </div>
  );
}
