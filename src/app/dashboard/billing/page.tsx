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
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
            {isPaymentSuccess && <PaymentRefresh />}

            {/* Glassy Header */}
            <div className="space-y-4">
                <h1 className="text-6xl font-black tracking-tightest bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent">
                    Billing & Subscription
                </h1>
                <p className="text-xl text-muted-foreground font-medium">Manage your plan and usage limits</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Plan Card */}
                <div className="overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="glass-darker p-10 rounded-[2.5rem] border border-white/5 space-y-8 relative z-10">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Current Plan</p>
                                <h2 className="text-4xl font-black uppercase">{user.subscriptionPlan || 'Free'}</h2>
                            </div>
                            <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isPaid ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                }`}>
                                {user.subscriptionStatus || 'Active'}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <ManageSubscriptionButton />
                        </div>
                    </div>
                </div>

                {/* Usage Card */}
                <div className="glass-darker p-10 rounded-[2.5rem] border border-white/5 space-y-8">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Usage Overview</p>
                        <h2 className="text-4xl font-black uppercase">Transcription</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                                <span className="text-muted-foreground">Minutes Used</span>
                                <span>{user.minutesUsed || 0} / {(user.minutesLimit || 0) + (user.addonMinutes || 0)}</span>
                            </div>
                            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(100, ((user.minutesUsed || 0) / ((user.minutesLimit || 1) + (user.addonMinutes || 0))) * 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Available</p>
                                <p className="text-lg font-black">{Math.max(0, ((user.minutesLimit || 0) + (user.addonMinutes || 0)) - (user.minutesUsed || 0))} min</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Add-ons</p>
                                <p className="text-lg font-black">{user.addonMinutes || 0} min</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoices Placeholder / Info */}
            <div className="glass rounded-[2.5rem] p-10 border border-white/5 flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Need your invoices?</h3>
                    <p className="text-muted-foreground max-w-md">Click the "Billing Portal" button above to view, download, and manage your past invoices directly through Lemon Squeezy.</p>
                </div>
            </div>
        </div>
    );
}
