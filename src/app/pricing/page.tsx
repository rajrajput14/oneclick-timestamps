import PricingClient from '@/components/pricing/PricingClient';
import { headers } from 'next/headers';

export default async function PricingPage() {
    // Calling a dynamic function to ensure this page is never statically generated during build
    // This prevents Clerk initialization errors on build platforms like Railway
    await headers();

    return <PricingClient />;
}
