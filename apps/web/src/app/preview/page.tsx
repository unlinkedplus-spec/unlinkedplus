import DashboardPixel from '../../components/DashboardPixel';
import type { DashboardVariant } from '../../components/DashboardPixel';

/** Preview-only route: /preview?state=public|login */
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const q = await searchParams;
  const login = q.state === 'login';
  const variant: DashboardVariant = login ? 'sameboat' : 'chibi';
  return <DashboardPixel variant={variant} authenticated={login} preview />;
}
