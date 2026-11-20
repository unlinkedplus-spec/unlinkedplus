import { cookies } from 'next/headers';
import DashboardPixel from '../components/DashboardPixel';

/**
 * Public root = Chibi Community mockup; after login the same origin serves the
 * Same Boat Beranda. The session cookie decides which state is rendered.
 */
export default async function Home() {
  const jar = await cookies();
  const authenticated = Boolean(jar.get('unlinked_session'));
  return <DashboardPixel variant={authenticated ? 'sameboat' : 'chibi'} authenticated={authenticated} />;
}
