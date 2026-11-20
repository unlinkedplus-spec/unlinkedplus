import { cookies } from 'next/headers';
import FeaturePage from '../../../components/FeaturePage';
import type { FeatureSlug } from '../../../components/FeaturePage';

const VALID: FeatureSlug[] = [
  'poll', 'personality-test', 'meme-studio', 'store', 'toko', 'opportunity-board', 'mental-reset',
  'spill', 'avatar', 'profil',
];

export default async function FeatureRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const jar = await cookies();
  const authenticated = Boolean(jar.get('unlinked_session'));
  const valid = VALID.includes(slug as FeatureSlug) ? (slug as FeatureSlug) : 'poll';
  return <FeaturePage slug={valid} authenticated={authenticated} />;
}
