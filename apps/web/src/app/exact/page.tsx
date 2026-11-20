import { cookies } from 'next/headers';
import ExactMockup from '../../components/ExactMockup';

/** Preview of the exact mockup ZIP, before switching the public root. */
export default async function ExactPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const jar = await cookies();
  const authenticated = Boolean(jar.get('unlinked_session'));
  return <ExactMockup view={view === 'landing' ? 'landing' : 'beranda'} authenticated={authenticated} />;
}
