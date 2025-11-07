/**
 * Root layout component.
 * 
 * This wraps all pages and provides:
 * - React Query provider for API state management
 * - Global styles
 * - Metadata
 * 
 * React Query (TanStack Query) handles:
 * - Caching API responses
 * - Automatic refetching
 * - Loading and error states
 * - Optimistic updates
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FinanceTrack - AI-Powered Personal Finance Dashboard',
  description: 'Track your spending, categorize transactions, and get AI insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

