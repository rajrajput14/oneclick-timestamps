import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/user';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import ManageSubscriptionButton from '@/components/dashboard/ManageSubscriptionButton';
import PaymentRefresh from '@/components/dashboard/PaymentRefresh';
import BillingUsageMetrics from '@/components/dashboard/BillingUsageMetrics';
import BillingHistory from '@/components/dashboard/BillingHistory';

export default async function BillingPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedSearchParams = await props.searchParams;
    const user = await getCurrentUser();
    // Middleware handles the redirect if not authenticated
    if (!user) return null; // Safety check for types

    // Diagnostic UI for database errors
    if ('error' in user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-6 p-12 glass rounded-[2.5rem]">
                <div className="text-4xl uppercase font-black text-red-500 underline decoration-red-500/30">DATABASE_ERROR</div>
                <p className="text-muted-foreground">Unable to fetch your billing information. Please check your database connection.</p>
                <Button asChild variant="outline">
                    <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
            </div>
        );
    }

    const isPaymentSuccess = resolvedSearchParams?.payment === 'success';

    const isPaid = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing' || user.subscriptionStatus === 'on_trial';

    return (
        <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-700">
            {isPaymentSuccess && <PaymentRefresh />}

            {/* Glassy Header */}
            <div className="space-y-3 md:space-y-4 pt-4 md:pt-0">
                <h1 className="text-4xl md:text-6xl font-black tracking-tightest bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-tight">
                    Billing & Subscription
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground font-medium">Manage your plan and usage limits</p>
            </div>

            <BillingUsageMetrics
                initialData={{
                    plan: user.subscriptionPlan || 'Free',
                    subscriptionStatus: user.subscriptionStatus || 'inactive',
                    minutesLimit: user.minutesLimit || 0,
                    minutesUsed: user.minutesUsed || 0,
                    addonMinutes: user.addonMinutes || 0,
                    totalAvailable: (user.minutesLimit || 0) + (user.addonMinutes || 0) - (user.minutesUsed || 0),
                    billingCycleEnd: user.billingCycleEnd?.toISOString() || null
                }}
            />

            <BillingHistory />
        </div>
    );
}
