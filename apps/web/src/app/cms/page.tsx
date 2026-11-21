import { cookies } from 'next/headers';
import CmsClient from './CmsClient';

/** Dynamic CMS route: session cookie keeps the CSP nonce in sync. */
export default async function CmsPage() {
  await cookies();
  return <CmsClient />;
}
