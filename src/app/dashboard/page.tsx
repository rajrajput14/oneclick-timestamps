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
    // Middleware handles the redirect if not authenticated
    if (!user) return null;

    // Diagnostic UI for database errors in production
    if ('error' in user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-4xl mb-4 border border-red-500/20">⚠️</div>
                <h1 className="text-3xl font-black tracking-tighter">Database Connection Error</h1>
                <p className="text-muted-foreground max-w-md">
                    We couldn't connect to the database. This usually happens when the <code className="bg-secondary px-2 py-1 rounded">DATABASE_URL</code> environment variable is missing or incorrect in Vercel.
                </p>
                <div className="flex gap-4 items-center">
                    <Button asChild>
                        <Link href="/dashboard">Try Again</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const isPaymentSuccess = resolvedSearchParams?.payment === 'success';

    const isPaidUser = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing' || user.subscriptionStatus === 'on_trial';
    const minutesUsed = user.minutesUsed || 0;
    const totalMinutes = (user.minutesLimit || 0) + (user.addonMinutes || 0);
    const minutesRemaining = Math.max(0, totalMinutes - minutesUsed);

    return (
        <div className="max-w-6xl mx-auto space-y-12 md:space-y-24 pb-32 font-outfit animate-in fade-in duration-1000">
            {isPaymentSuccess && <PaymentRefresh />}
            {/* Header with Sharp Typography */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 md:gap-12 pt-4 md:pt-12">
                <div className="space-y-4 md:space-y-6">
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-foreground drop-shadow-2xl italic leading-none">
                        Dashboard
                    </h1>
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="w-8 md:w-12 h-1.5 md:h-2 bg-indigo-600 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)]" />
                        <p className="text-muted-foreground text-[10px] md:text-[11px] font-bold uppercase tracking-wide opacity-80">
                            Manage your video timestamps
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Badge variant={isPaidUser ? 'success' : 'default'} className="px-6 md:px-8 py-2 md:py-3 text-[10px] md:text-xs font-bold tracking-wide border-border/50">
                        {isPaidUser ? <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-2 md:mr-3" /> : <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 mr-2 md:mr-3" />}
                        {isPaidUser ? 'PRO TIER ACTIVE' : 'FREE TIER'}
                    </Badge>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <Card variant="glass" className="p-6 md:p-12 relative overflow-hidden group border-border shadow-2xl">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-600/5 blur-[100px] rounded-full group-hover:bg-indigo-600/10 transition-all duration-1000" />

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-12">
                            <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" />
                            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-muted-foreground opacity-80">Video Usage</p>
                        </div>

                        <div className="flex items-baseline gap-4 md:gap-6 mb-12 md:mb-16">
                            <span className="text-6xl md:text-8xl font-black tracking-tighter text-foreground leading-none drop-shadow-2xl">
                                {minutesUsed}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-2xl md:text-4xl font-bold text-muted-foreground/30 italic">/ {totalMinutes} Min</span>
                                <span className="text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                                    {user.minutesLimit} Base + {user.addonMinutes} Add-on
                                </span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">
                                {minutesRemaining} Minutes Remaining
                            </p>
                            <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (minutesUsed / (totalMinutes || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="mt-8 md:mt-auto">
                            <Link href="/pricing" className="inline-block w-full">
                                <Button variant="primary" size="lg" className="w-full text-sm md:text-base tracking-wide shadow-indigo-500/40">
                                    Buy More Minutes
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Card>

                <Card variant="glass" className="p-6 md:p-12 flex flex-col justify-between relative overflow-hidden group border-border shadow-2xl min-h-[300px] md:min-h-auto">
                    <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-600/5 blur-[100px] rounded-full group-hover:bg-purple-600/10 transition-all duration-1000" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-12">
                            <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500" />
                            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-muted-foreground opacity-80">Account Status</p>
                        </div>
                        <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-foreground leading-[1.1]">
                            {isPaidUser ? 'Creator' : 'Free'} Plan
                        </h3>
                    </div>

                    <div className="pt-8 md:pt-12 border-t border-border flex items-center justify-between relative z-10">
                        <SyncSubscriptionButton />
                        {isPaidUser ? (
                            <Badge variant="success" className="px-4 md:px-6 py-2 tracking-wide text-[10px] md:text-xs">SUB ACTIVE</Badge>
                        ) : (
                            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">TIER 1 CLOUD</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Core Workflow */}
            <div className="space-y-12 md:space-y-24">
                <div className="space-y-8 md:space-y-12">
                    <div className="flex items-center gap-4 md:gap-6 px-4 md:px-10">
                        <div className="w-2 md:w-3 h-8 md:h-10 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.3)]" />
                        <div className="space-y-1 md:space-y-2">
                            <h2 className="text-lg md:text-xl font-bold uppercase tracking-wide text-foreground">Generate Timestamps</h2>
                            <p className="text-[10px] md:text-xs font-medium text-muted-foreground tracking-widest uppercase">Paste your YouTube video link and get ready-to-use timestamps.</p>
                        </div>
                    </div>
                    <Card variant="glass" className="p-6 md:p-12 border-border shadow-2xl overflow-hidden">
                        <CreateProjectForm usageAllowed={minutesRemaining > 0} minutesRemaining={minutesRemaining} />
                    </Card>
                </div>

                <div className="space-y-8 md:space-y-12">
                    <div className="flex items-center gap-4 md:gap-6 px-4 md:px-10">
                        <div className="w-2 md:w-3 h-8 md:h-10 bg-purple-600 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.3)]" />
                        <div className="space-y-1 md:space-y-2">
                            <h2 className="text-lg md:text-xl font-bold uppercase tracking-wide text-foreground">Recent Projects</h2>
                            <p className="text-[10px] md:text-xs font-medium text-muted-foreground tracking-widest uppercase">Workspace historical data</p>
                        </div>
                    </div>
                    <Card variant="darker" className="p-6 md:p-12 min-h-[400px] border-border/50 shadow-2xl">
                        <RecentProjects userId={user.id} />
                    </Card>
                </div>
            </div>
        </div>
    );
}
