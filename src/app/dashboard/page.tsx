import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import CreateProjectForm from '@/components/dashboard/CreateProjectForm';
import RecentProjects from '@/components/dashboard/RecentProjects';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import PaymentRefresh from '@/components/dashboard/PaymentRefresh';
import BillingUsageMetrics from '@/components/dashboard/BillingUsageMetrics';

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
                    {/* Badge moved inside BillingUsageMetrics for reactive updates */}
                </div>
            </div>

            {/* Metrics Grid (Now reactive via client component) */}
            <BillingUsageMetrics
                initialData={{
                    plan: user.subscriptionPlan || 'Free',
                    status: user.subscriptionStatus || 'inactive',
                    minutesLimit: user.minutesLimit || 0,
                    minutesUsed: user.minutesUsed || 0,
                    addonMinutes: user.addonMinutes || 0,
                    totalAvailable: (user.minutesLimit || 0) + (user.addonMinutes || 0) - (user.minutesUsed || 0),
                    billingCycleEnd: user.billingCycleEnd?.toISOString() || null
                }}
            />

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
                        <CreateProjectForm
                            usageAllowed={((user.minutesLimit || 0) + (user.addonMinutes || 0) - (user.minutesUsed || 0)) > 0}
                            minutesRemaining={(user.minutesLimit || 0) + (user.addonMinutes || 0) - (user.minutesUsed || 0)}
                        />
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
