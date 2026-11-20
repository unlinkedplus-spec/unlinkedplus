import { cookies } from 'next/headers';
import ExactMockup from '../components/ExactMockup';

/**
 * Public root = exact Chibi Community mockup from the approved ZIP.
 * After login the same origin serves the exact Same Boat Beranda mockup.
 */
export default async function Home() {
  const jar = await cookies();
  const authenticated = Boolean(jar.get('unlinked_session'));
  return <ExactMockup view={authenticated ? 'beranda' : 'landing'} authenticated={authenticated} />;
}
