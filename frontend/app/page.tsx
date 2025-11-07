/**
 * Home page: redirects to dashboard.
 * 
 * In a real app, you might show a landing page here.
 * For now, we redirect authenticated users to dashboard.
 */

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}

