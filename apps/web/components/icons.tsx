import type { SVGProps } from 'react';
export type IconName = 'home' | 'pen' | 'avatar' | 'store' | 'profile' | 'arrow' | 'heart' | 'smile' | 'people' | 'comment' | 'close' | 'shield' | 'flag' | 'download' | 'logout' | 'check' | 'plus';
const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  pen: <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0 0-3l-1-1a2 2 0 0 0-3 0L5 15Z" /></>,
  avatar: <><circle cx="12" cy="12" r="9"/><path d="M8 10h.01M16 10h.01M8 15q4 3 8 0M5 6l2 2m12-2-2 2"/></>,
  store: <><path d="M4 9v12h16V9M3 9l2-6h14l2 6M3 9q2 4 5 0 4 4 8 0 3 4 5 0M9 21v-7h6v7"/></>,
  profile: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
  heart: <path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 4 11 8 15 4-4 13-10 8-15Z"/>,
  smile: <><circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01M7 14q5 7 10 0Z"/></>,
  people: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2"/></>,
  comment: <path d="M21 11a9 9 0 0 1-9 9H3l2-5a9 9 0 1 1 16-4Z"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  shield: <><path d="m12 3 8 3v6q0 6-8 9-8-3-8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
  flag: <path d="M5 22V3q4-3 8 0t7 0v10q-3 3-7 0t-8 0"/>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  logout: <><path d="M9 3H4v18h5m-1-9h13m-5-5 5 5-5 5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  plus: <path d="M12 4v16M4 12h16"/>,
};
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}
