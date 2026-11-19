/** Thin, failure-tolerant localStorage wrappers (private mode / quota errors are ignored). */

export function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — the app keeps working in memory.
  }
}

export function safeParse(raw: string | null): unknown {
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function newId(): string {
  // crypto.randomUUID is unavailable on plain-http LAN testing (non-secure context), so don't rely on it.
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
