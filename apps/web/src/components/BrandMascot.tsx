import { buildAvatarSVG } from '../lib/avatar-svg';
import type { CharacterId } from '../lib/types';

interface Props {
  /** Rendered width/height in pixels. */
  size?: number;
  character?: CharacterId;
  /** Short empathetic line shown in a speech bubble. */
  bubble?: string;
  className?: string;
  float?: boolean;
}

/**
 * The panda is the emotional face of unlinked+: tired eyes, tiny blush,
 * still showing up. Reused on the landing hero, both sidebars and empty
 * states so the brand reads as one character, not a generic avatar.
 */
export default function BrandMascot({
  size = 160,
  character = 'panda',
  bubble,
  className = '',
  float = true,
}: Props) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-[6%] rounded-[42%] bg-gradient-to-br from-sunshine via-lavender/80 to-lavender rotate-6" />
      <div className="absolute inset-[14%] rounded-full bg-cream/70 blur-[2px]" />
      <svg
        viewBox="0 0 300 300"
        width={size}
        height={size}
        role="img"
        aria-label="Maskot unlinked+: kantung mata panda yang tetap tampil apa adanya"
        className={`relative drop-shadow-[0_14px_18px_rgba(23,43,77,0.22)] ${float ? 'animate-floaty' : ''}`}
      >
        <g dangerouslySetInnerHTML={{ __html: buildAvatarSVG({ character, accessories: [] }) }} />
      </svg>
      {bubble && (
        <div className="absolute -right-6 -top-5 max-w-[190px] rounded-2xl border border-navy/10 bg-white px-3 py-2 text-[11px] font-semibold leading-snug text-navy shadow-pop animate-popin">
          {bubble}
          <span className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-navy/10 bg-white" />
        </div>
      )}
    </div>
  );
}
