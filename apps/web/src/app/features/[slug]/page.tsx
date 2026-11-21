import { cookies } from 'next/headers';
import FeaturePage from '../../../components/FeaturePage';
import type { FeatureSlug } from '../../../components/FeaturePage';
import LandingFeaturePage from '../../../components/LandingFeaturePage';
import type { LandingSlug } from '../../../components/LandingFeaturePage';

const VALID: FeatureSlug[] = [
  'poll', 'personality-test', 'meme-studio', 'store', 'toko', 'opportunity-board', 'mental-reset',
  'spill', 'avatar', 'profil', 'video', 'notifications',
];
const LANDING: LandingSlug[] = [
  'unlinked-rooms', 'support-circles', 'dear-future-me', 'tiny-wins', 'hall-of-almost',
  'same-boat', 'mental-armor', 'comeback-journey',
];

export default async function FeatureRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const jar = await cookies();
  const authenticated = Boolean(jar.get('unlinked_session'));

  if (LANDING.includes(slug as LandingSlug)) {
    return <LandingFeaturePage slug={slug as LandingSlug} />;
  }
  const valid = VALID.includes(slug as FeatureSlug) ? (slug as FeatureSlug) : 'poll';
  return <FeaturePage slug={valid} authenticated={authenticated} />;
}
