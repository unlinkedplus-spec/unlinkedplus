import { cookies } from 'next/headers';
import AdminClient from './AdminClient';

/**
 * Moderation panel. Reading the session cookie makes this route render per
 * request, so Next attaches the request's CSP nonce to its scripts and the
 * panel actually hydrates (a prerendered page would be blocked by
 * `strict-dynamic`, leaving it stuck on "Memeriksa sesi…").
 */
export default async function AdminPage() {
  await cookies();
  return <AdminClient />;
}
