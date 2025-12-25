import HomeClient from '@/components/home/HomeClient';
import { headers } from 'next/headers';

export default async function HomePage() {
  // Calling a dynamic function to ensure this page is never statically generated during build
  // This prevents Clerk initialization errors on build platforms like Railway
  await headers();

  return <HomeClient />;
}
