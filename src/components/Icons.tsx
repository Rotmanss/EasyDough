import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const base = (p: P): P => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...p,
});

export const LoafIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3.5 15.5c0-5 3.8-8.5 8.5-8.5s8.5 3.5 8.5 8.5c0 1.4-1.1 2.5-2.5 2.5H6c-1.4 0-2.5-1.1-2.5-2.5Z" />
    <path d="M8 12.5c1.2-1.6 2.6-2.4 4-2.4M12 13c1.2-1.5 2.6-2.3 4-2.3" />
  </svg>
);

export const JarIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 3h8M9 3v2.5c-2.4.8-4 2.6-4 5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8.5c0-2.4-1.6-4.2-4-5V3" />
    <path d="M5 13c2.5-1.2 4.5 1.2 7 0s4.5 1.2 7 0" />
  </svg>
);

export const BookIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
    <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M9 8h7M9 11.5h5" />
  </svg>
);

export const InfoIcon = (p: P) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6v.1" />
  </svg>
);

export const AlertIcon = (p: P) => (
  <svg {...base({ width: 18, height: 18, ...p })}>
    <path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" />
    <path d="M12 10v4.5M12 17.2v.1" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const UndoIcon = (p: P) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);
