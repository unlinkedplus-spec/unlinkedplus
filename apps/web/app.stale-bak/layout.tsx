import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'unlinked+ — Less Flex, More Human.',
  icons: { icon: '/brand-icon.png', apple: '/brand-icon.png' },
  description: 'Memutus yang Toksik, Menambah yang Esensial. Ruang cerita kerja yang lebih manusiawi.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
