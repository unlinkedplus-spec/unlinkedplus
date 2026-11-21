import { cookies } from 'next/headers';
import AdminDashboardClient from './AdminDashboardClient';

/** Dynamic CMS dashboard: per-request render keeps the CSP nonce in sync. */
export default async function AdminDashboardPageRoute() {
  await cookies();
  return <AdminDashboardClient />;
}
