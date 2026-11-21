'use client';

import { useEffect, useState } from 'react';
import { getLandingContent } from './api';
import type { LandingContentItem } from './types';

/** CMS copy for landing/feature pages; silently falls back to built-in copy. */
export function useLandingContent(): LandingContentItem[] {
  const [items, setItems] = useState<LandingContentItem[]>([]);
  useEffect(() => {
    let active = true;
    getLandingContent().then((rows) => { if (active) setItems(rows); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return items;
}

export function useContentFor(slug: string): LandingContentItem | null {
  const items = useLandingContent();
  return items.find((item) => item.slug === slug && item.status === 'published') ?? null;
}
