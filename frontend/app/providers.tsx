'use client';

/**
 * Client-side providers.
 * 
 * React Query requires client-side rendering, so we separate it here.
 * This component wraps the app with QueryClientProvider.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient with default options
  // staleTime: how long data is considered fresh (5 minutes)
  // cacheTime: how long unused data stays in cache (10 minutes)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              // Don't retry on 401 (unauthorized) errors
              if (error?.response?.status === 401) {
                return false;
              }
              // Retry up to 2 times for other errors
              return failureCount < 2;
            },
            retryDelay: 1000, // Wait 1 second between retries
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

