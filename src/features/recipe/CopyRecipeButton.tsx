import { useState } from 'react';
import { CheckIcon } from '../../components/Icons';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useStarter } from '../../hooks/useStarter';
import { recipeToText } from '../../lib/recipeText';
import type { Recipe } from '../../lib/sourdough';
import { LEVAIN_STORAGE_KEY, computeLevain, parseLevainPrefs } from '../starter/levainSetup';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs HTTPS; fall back for plain-http testing on the local network.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export function CopyRecipeButton({ recipe, levainHydration }: { recipe: Recipe; levainHydration: number }) {
  const { current } = useStarter();
  const [levainPrefs] = usePersistentState(LEVAIN_STORAGE_KEY, parseLevainPrefs);
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const levain = computeLevain(levainPrefs, current, recipe, levainHydration).plan;

  return (
    <div className="actions">
      <button
        type="button"
        className="btn btn--primary"
        onClick={async () => {
          setStatus((await copyText(recipeToText(recipe, levain))) ? 'copied' : 'failed');
          window.setTimeout(() => setStatus('idle'), 2500);
        }}
      >
        {status === 'copied' ? (
          <>
            <CheckIcon /> Copied
          </>
        ) : (
          'Copy recipe'
        )}
      </button>
      {status === 'failed' && <span className="muted small">Could not copy on this device.</span>}
    </div>
  );
}
