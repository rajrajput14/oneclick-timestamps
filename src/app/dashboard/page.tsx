import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import CreateProjectForm from '@/components/dashboard/CreateProjectForm';
import RecentProjects from '@/components/dashboard/RecentProjects';
import SyncSubscriptionButton from '@/components/dashboard/SyncSubscriptionButton';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Zap } from 'lucide-react';
import PaymentRefresh from '@/components/dashboard/PaymentRefresh';

export default async function DashboardPage(props: { searchParams: Promise<any> }) {
    const resolvedSearchParams = await props.searchParams;
    const user = await getCurrentUser();

    const isPaymentSuccess = resolvedSearchParams?.payment === 'success';

    if (!user) {
        redirect('/sign-in');
    }

    const isPaidUser = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing' || user.subscriptionStatus === 'on_trial';
    const minutesUsed = user.minutesUsed || 0;
    const totalMinutes = (user.minutesLimit || 0) + (user.addonMinutes || 0);
    const minutesRemaining = Math.max(0, totalMinutes - minutesUsed);

    return (
        <div className="max-w-6xl mx-auto space-y-24 pb-32 font-outfit animate-in fade-in duration-1000">
            {isPaymentSuccess && <PaymentRefresh />}
            {/* Header with Sharp Typography */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 pt-12">
                <div className="space-y-6">
                    <h1 className="text-4xl md:text-8xl font-black tracking-tighter text-foreground drop-shadow-2xl italic leading-none">
                        Dashboard
                    </h1>
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-2 bg-indigo-600 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)]" />
                        <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-wide opacity-80">
                            Manage your video timestamps
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Badge variant={isPaidUser ? 'success' : 'default'} className="px-8 py-3 text-xs font-bold tracking-wide border-border/50">
                        {isPaidUser ? <Sparkles className="w-4 h-4 mr-3" /> : <ShieldCheck className="w-4 h-4 mr-3" />}
                        {isPaidUser ? 'PRO TIER ACTIVE' : 'FREE TIER'}
                    </Badge>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid md:grid-cols-2 gap-10">
                <Card variant="glass" className="p-12 relative overflow-hidden group border-border shadow-2xl">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-600/5 blur-[100px] rounded-full group-hover:bg-indigo-600/10 transition-all duration-1000" />

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-4 mb-12">
                            <Zap className="w-4 h-4 text-indigo-500" />
                            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground opacity-80">Video Usage</p>
                        </div>

                        <div className="flex items-baseline gap-6 mb-16">
                            <span className="text-8xl font-black tracking-tighter text-foreground leading-none drop-shadow-2xl">
                                {minutesUsed}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-4xl font-bold text-muted-foreground/30 italic">/ {totalMinutes} Min</span>
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                                    {user.minutesLimit} Base + {user.addonMinutes} Add-on
                                </span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">
                                {minutesRemaining} Minutes Remaining
                            </p>
                            <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (minutesUsed / (totalMinutes || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="mt-auto">
                            <Link href="/pricing" className="inline-block w-full">
                                <Button variant="primary" size="lg" className="w-full text-base tracking-wide shadow-indigo-500/40">
                                    Buy More Minutes
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Card>

                <Card variant="glass" className="p-12 flex flex-col justify-between relative overflow-hidden group border-border shadow-2xl">
                    <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-600/5 blur-[100px] rounded-full group-hover:bg-purple-600/10 transition-all duration-1000" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-12">
                            <ShieldCheck className="w-4 h-4 text-purple-500" />
                            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground opacity-80">Account Status</p>
                        </div>
                        <h3 className="text-5xl font-black uppercase tracking-tighter mb-4 text-foreground leading-[1.1]">
                            {isPaidUser ? 'Creator' : 'Free'} Plan
                        </h3>
                    </div>

                    <div className="pt-12 border-t border-border flex items-center justify-between relative z-10">
                        <SyncSubscriptionButton />
                        {isPaidUser ? (
                            <Badge variant="success" className="px-6 py-2 tracking-wide">SUB ACTIVE</Badge>
                        ) : (
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">TIER 1 CLOUD</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Core Workflow */}
            <div className="grid lg:grid-cols-5 gap-16 items-start">
                <div className="lg:col-span-3 space-y-12">
                    <div className="flex items-center gap-6 px-10">
                        <div className="w-3 h-10 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.3)]" />
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold uppercase tracking-wide text-foreground">Generate Timestamps</h2>
                            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">Paste your YouTube video link and get ready-to-use timestamps.</p>
                        </div>
                    </div>
                    <Card variant="glass" className="p-12 border-border shadow-2xl">
                        <CreateProjectForm usageAllowed={minutesRemaining > 0} minutesRemaining={minutesRemaining} />
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-12">
                    <div className="flex items-center gap-6 px-10">
                        <div className="w-3 h-10 bg-purple-600 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.3)]" />
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold uppercase tracking-wide text-foreground">Recent Projects</h2>
                            <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">Workspace historical data</p>
                        </div>
                    </div>
                    <Card variant="darker" className="p-6 min-h-[600px] border-border/50 shadow-2xl">
                        <RecentProjects userId={user.id} />
                    </Card>
                </div>
            </div>
        </div>
    );
}
