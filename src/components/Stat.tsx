import type { ReactNode } from 'react';
import { formatNumber } from '../lib/format';

interface StatProps {
  label: string;
  value: number | null;
  unit: string;
  decimals?: number;
  size?: 'md' | 'lg' | 'xl';
  children?: ReactNode;
}

export function Stat({ label, value, unit, decimals = 1, size = 'md', children }: StatProps) {
  return (
    <div className={`stat stat--${size}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">
        {value === null ? '—' : formatNumber(value, decimals)}
        {value !== null && <span className="stat__unit">{unit}</span>}
      </span>
      {children}
    </div>
  );
}
