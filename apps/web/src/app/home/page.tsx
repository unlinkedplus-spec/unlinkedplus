import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ExactMockup from '../../components/ExactMockup';

/**
 * DYNAMIC dashboard (Same Boat). Rendered per request from the session cookie.
 */
export default async function HomeDashboard() {
  const jar = await cookies();
  if (!jar.get('unlinked_session')) redirect('/');
  return <ExactMockup view="beranda" authenticated />;
}
