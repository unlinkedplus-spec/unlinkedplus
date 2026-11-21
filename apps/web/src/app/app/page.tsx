import { cookies } from 'next/headers';
import AppClient from './AppClient';

/**
 * Legacy application surface (/app). Dynamic render so the nonce CSP allows
 * its client bundle to hydrate; /home is the canonical dashboard.
 */
export default async function AppPageRoute() {
  await cookies();
  return <AppClient />;
}
