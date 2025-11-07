'use client';

/**
 * LayoutWrapper: conditionally shows Navbar on authenticated pages.
 * 
 * This component wraps pages that should have the navbar (dashboard, transactions, insights)
 * but excludes it from login/register pages.
 */

import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  
  return (
    <>
      {!isAuthPage && <Navbar />}
      {children}
    </>
  );
}

