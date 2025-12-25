import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/user';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import ManageSubscriptionButton from '@/components/dashboard/ManageSubscriptionButton';

export default async function BillingPage() {
    const user = await getCurrentUser();
    if (!user) redirect('/sign-in');

    const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, user.id),
        orderBy: (subscriptions, { desc }) => [desc(subscriptions.createdAt)],
    });

    const isPaid = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';

    return (
        <div className="max-w-5xl mx-auto space-y-20 pb-24 font-outfit">
            <header className="space-y-4">
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground drop-shadow-sm">
                    Premium <span className="text-indigo-600 dark:text-indigo-400">Hub</span>
                </h1>
                <div className="flex items-center gap-6">
                    <div className="h-[2px] w-12 bg-indigo-500 rounded-full" />
                    <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.4em] opacity-40">Financial Integrity</p>
                </div>
            </header>

            <div className="glass p-16 rounded-[4rem] relative overflow-hidden group shadow-2xl">
                {/* Decorative blurs */}
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-16">
                    <div>
                        <div className="inline-block px-6 py-2 rounded-full glass-darker text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-8 shadow-sm">
                            State of Access
                        </div>
                        <h2 className="text-7xl font-black tracking-tighter text-foreground italic mb-6">
                            {isPaid ? 'Pro Creator' : 'Free Explorer'}
                        </h2>
                        <p className="text-muted-foreground text-lg font-black max-w-sm leading-relaxed opacity-70">
                            {isPaid
                                ? 'Your account has full behavioral intelligence access unlocked.'
                                : 'You are currently browsing with basic capabilities.'}
                        </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-center gap-6">
                        {isPaid ? (
                            <ManageSubscriptionButton />
                        ) : (
                            <Link
                                href="/pricing"
                                className="inline-block px-14 py-6 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-indigo-500/30"
                            >
                                Get Priority
                            </Link>
                        )}
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-16 mt-20 pt-16 border-t border-border/50 relative z-10">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Renewal point</p>
                        <p className="text-3xl font-black tracking-tighter text-foreground">
                            {isPaid && subscription?.currentPeriodEnd
                                ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                                : 'Unlimited'}
                        </p>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Linked Identity</p>
                        <p className="text-3xl font-black tracking-tighter text-foreground truncate max-w-full italic underline-offset-8 underline decoration-indigo-500/20">{user.email}</p>
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
