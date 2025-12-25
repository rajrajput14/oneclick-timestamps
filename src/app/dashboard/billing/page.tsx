import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/user';

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

    const isPaymentSuccess = resolvedSearchParams?.payment === 'success';

    const isPaid = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing' || user.subscriptionStatus === 'on_trial';

    return (
        <div className="max-w-5xl mx-auto space-y-20 pb-24 font-outfit">
            {isPaymentSuccess && <PaymentRefresh />}
            <header className="space-y-4">
                {isPaymentSuccess && (
                    <div className="mb-12 p-8 glass-darker border-indigo-500/50 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-500">
                        <p className="text-xl font-black text-indigo-500 tracking-tight italic mb-1">
                            Payment successful ✨
                        </p>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                            Minutes added/updated successfully
                        </p>
                    </div>
                )}
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground drop-shadow-sm">
                    Billing & <span className="text-indigo-600 dark:text-indigo-400">Usage</span>
                </h1>
                <div className="flex items-center gap-6">
                    <div className="h-[2px] w-12 bg-indigo-500 rounded-full" />
                    <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.4em] opacity-40">Manage your plan</p>
                </div>
            </header>

            <div className="glass p-16 rounded-[4rem] relative overflow-hidden group shadow-2xl">
                {/* Decorative blurs */}
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-16">
                    <div>
                        <div className="inline-block px-6 py-2 rounded-full glass-darker text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-8 shadow-sm">
                            Your Plan
                        </div>
                        <h2 className="text-7xl font-black tracking-tighter text-foreground italic mb-6">
                            {user.subscriptionPlan || 'Free Plan'}
                        </h2>
                        <p className="text-muted-foreground text-lg font-black max-w-sm leading-relaxed opacity-70">
                            {isPaid
                                ? 'Your subscription is active. Enjoy your minutes.'
                                : 'Try it for free or upgrade for more minutes.'}
                        </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-center gap-6">
                        <Link
                            href="/pricing"
                            className="inline-block px-14 py-6 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-indigo-500/30"
                        >
                            {isPaid ? 'Change Plan' : 'Get Started'}
                        </Link>
                        {isPaid && <ManageSubscriptionButton />}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-16 mt-20 pt-16 border-t border-border/50 relative z-10">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Subscription Minutes</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-black tracking-tighter text-foreground">
                                {user.minutesUsed || 0} / {user.minutesLimit || 60}
                            </p>
                            <span className="text-[10px] font-black opacity-30 uppercase">Used</span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-1000"
                                style={{ width: `${Math.min(100, ((user.minutesUsed || 0) / (user.minutesLimit || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Add-on Credits</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-black tracking-tighter text-foreground">
                                {user.addonMinutes || 0}
                            </p>
                            <span className="text-[10px] font-black opacity-30 uppercase">Minutes</span>
                        </div>
                        <Link href="/pricing" className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline">
                            Buy More Minutes →
                        </Link>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-16 mt-16 pt-16 border-t border-border/50 relative z-10">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Renewal Date</p>
                        <p className="text-3xl font-black tracking-tighter text-foreground">
                            {user.billingCycleEnd ? new Date(user.billingCycleEnd).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Email</p>
                        <p className="text-3xl font-black tracking-tighter text-foreground underline decoration-indigo-500/20 underline-offset-8 italic">{user.email}</p>
                    </div>
                </div>
            </div>

            {!isPaid && (
                <div className="space-y-12">
                    <h3 className="text-xs font-black uppercase tracking-[0.5em] text-muted-foreground text-center">Unlocked capabilities</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            'Full Quota',
                            'Priority AI',
                            'Batch Lab',
                            'Core History'
                        ].map((b, i) => (
                            <div key={i} className="glass p-10 rounded-[3rem] text-center group hover:-translate-y-2 transition-all duration-300 shadow-xl">
                                <div className="w-12 h-12 glass-darker rounded-xl flex items-center justify-center text-xl mx-auto mb-6 group-hover:scale-110 group-hover:bg-primary transition-all">✨</div>
                                <span className="font-black text-xs uppercase tracking-widest text-foreground block">{b}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
