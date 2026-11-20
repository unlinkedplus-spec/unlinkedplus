import type { SVGProps } from 'react';

export type NavIconName =
  | 'home' | 'mask' | 'pen' | 'avatar' | 'store' | 'profile'
  | 'sparkles' | 'trend' | 'heart' | 'laugh' | 'hug' | 'check';

const paths: Record<NavIconName, React.ReactNode> = {
  home: <><path d="m3.5 10.5 8.5-7 8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1Z" /></>,
  mask: <><path d="M3 9.5c3.5-2 6.5-2 9 .5 2.5-2.5 5.5-2.5 9-.5v4.5c0 4-3.5 6.5-9 7.5-5.5-1-9-3.5-9-7.5Z" /><path d="M7.5 12.5h.01M16.5 12.5h.01M9 16.5q3 2 6 0" /></>,
  pen: <><path d="m15 4 5 5M4.5 19.5l4.7-1 11-11a2.1 2.1 0 0 0-3-3l-11 11Z" /><path d="m6 15 3 3" /></>,
  avatar: <><circle cx="12" cy="11" r="5" /><path d="M8.5 11h.01M15.5 11h.01M9.5 13.5q2.5 2 5 0M5 20q1.5-4 7-4t7 4" /></>,
  store: <><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10q2.2 3.5 4.5 0 2.3 3.5 4.5 0 2.2 3.5 4.5 0 2.3 3.5 4.5 0M9 20v-6h6v6" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21v-1.5a7.5 7.5 0 0 1 15 0V21" /></>,
  sparkles: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z" /></>,
  trend: <><path d="m3 17 5.5-5.5 3.5 3.5L21 6" /><path d="M15.5 6H21v5.5" /></>,
  heart: <path d="M20.5 5.6a4.8 4.8 0 0 0-7.6.9 4.8 4.8 0 0 0-7.6-.9c-4.3 4.3 2.9 10.2 7.6 14.2 4.7-4 11.9-9.9 7.6-14.2Z" />,
  laugh: <><circle cx="12" cy="12" r="9" /><path d="M8 9.5h.01M16 9.5h.01M7.5 13.5q4.5 6 9 0" /></>,
  hug: <><circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" /><path d="M3.5 20v-2a5 5 0 0 1 5-5l3.5 3 3.5-3a5 5 0 0 1 5 5v2" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
};

interface Props extends SVGProps<SVGSVGElement> {
  name: NavIconName;
  size?: number;
}

export default function NavIcon({ name, size = 20, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
