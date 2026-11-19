import { useEffect, useState } from 'react';

/**
 * Good values pass through at once; bad ones only show after `delayMs` without change,
 * so half-typed numbers (e.g. "7" on the way to "72") don't flash errors.
 * `value` must be referentially stable (memoized) between renders.
 */
export function useSettled<T>(value: T, isGood: (v: T) => boolean, delayMs = 800): T {
  const good = isGood(value);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (good) {
      setShown(value);
      return;
    }
    const timer = setTimeout(() => setShown(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, good, delayMs]);

  return good ? value : shown;
}
