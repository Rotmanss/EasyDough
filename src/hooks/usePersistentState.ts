import { useEffect, useState } from 'react';
import { readJson, writeJson } from '../lib/storage';

/** useState persisted to localStorage; `parse` validates whatever was stored. */
export function usePersistentState<T>(key: string, parse: (raw: unknown) => T) {
  const [value, setValue] = useState<T>(() => parse(readJson(key)));
  useEffect(() => writeJson(key, value), [key, value]);
  return [value, setValue] as const;
}

export function num(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}
