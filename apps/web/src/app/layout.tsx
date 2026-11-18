import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'unlinked+',
  description: 'No Flex. Just Human.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-background font-body antialiased">{children}</body>
    </html>
  );
}
