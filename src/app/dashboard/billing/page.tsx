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

            {/* Invoices Placeholder / Info */}
            <div className="glass rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 border border-white/5 flex flex-col items-center text-center space-y-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">Need your invoices?</h3>
                    <p className="text-sm text-muted-foreground max-w-md">Manage your past invoices directly through Lemon Squeezy via the portal button above.</p>
                </div>
            </div>
        </div>
    );
}
