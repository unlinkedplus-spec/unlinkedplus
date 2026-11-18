'use client';

import { buildAvatarSVG } from '../lib/avatar-svg';
import type { AvatarConfig } from '../lib/types';

interface Props {
  config: AvatarConfig | null | undefined;
  size?: number;
  className?: string;
}

export default function AvatarSvg({ config, size = 60, className = '' }: Props) {
  const inner = buildAvatarSVG(config);
  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
