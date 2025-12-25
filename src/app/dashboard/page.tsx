import { getCurrentUser } from '@/lib/auth/user';
import { redirect } from 'next/navigation';
import CreateProjectForm from '@/components/dashboard/CreateProjectForm';
import RecentProjects from '@/components/dashboard/RecentProjects';
import SyncSubscriptionButton from '@/components/dashboard/SyncSubscriptionButton';
import Link from 'next/link';

export default async function DashboardPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/sign-in');
    }

    const isPaidUser = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
    const usageCount = user.usageCount || 0;
    const usageLimit = isPaidUser ? '∞' : (user.usageLimit || 3);

    return (
        <div className="max-w-6xl mx-auto space-y-16 pb-24 font-outfit">
            {/* Header with Glass Title */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                <div className="space-y-3">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground drop-shadow-sm">
                        Workspace
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-[2px] bg-indigo-500 rounded-full" />
                        <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.4em] opacity-70">
                            {user.name?.split(' ')[0] || 'User'}'s Dashboard
                        </p>
                    </div>
                </div>

                <div className="glass px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-sm">
                    {isPaidUser ? '✨ Pro Access' : 'Free Explorer'}
                </div>
            </div>

            {/* Top Row Grid */}
            <div className="grid md:grid-cols-2 gap-8">
                <div className="glass p-12 rounded-[3.5rem] relative overflow-hidden group shadow-xl">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/5 blur-[50px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-700" />

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-8">Usage Intelligence</p>
                    <div className="flex items-baseline gap-4 mb-10">
                        <span className="text-8xl font-black tracking-tighter text-foreground">{usageCount}</span>
                        <span className="text-3xl font-black text-muted-foreground italic opacity-40">/ {usageLimit}</span>
                    </div>

                    <Link
                        href="/pricing"
                        className="inline-flex px-10 py-5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                    >
                        Expand Quota
                    </Link>
                </div>

                <div className="glass p-12 rounded-[3.5rem] flex flex-col justify-between shadow-xl relative overflow-hidden group">
                    <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/5 blur-[50px] rounded-full group-hover:bg-purple-500/10 transition-all duration-700" />

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-8">Service Edition</p>
                        <h3 className="text-4xl font-black uppercase tracking-tighter mb-4 text-foreground">{isPaidUser ? 'Creator Pro' : 'Free Edition'}</h3>
                    </div>
                    <div className="pt-8 border-t border-border flex items-center justify-between">
                        <SyncSubscriptionButton />
                        {isPaidUser && <span className="text-[10px] font-black uppercase tracking-widest text-green-500 drop-shadow-sm">Active ✅</span>}
                    </div>
                </div>
            </div>

            {/* Lower Row Grid */}
            <div className="grid lg:grid-cols-5 gap-12 items-start">
                <div className="lg:col-span-3 space-y-10">
                    <div className="flex items-center gap-4 px-6">
                        <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">New Project</h2>
                    </div>
                    <div className="glass p-12 rounded-[3.5rem] shadow-xl">
                        <CreateProjectForm usageAllowed={usageCount < 100} />
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-10">
                    <div className="flex items-center gap-4 px-6">
                        <div className="w-2 h-6 bg-purple-600 rounded-full" />
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Activity Hub</h2>
                    </div>
                    <div className="glass-darker p-4 rounded-[3.5rem] min-h-[450px]">
                        <RecentProjects userId={user.id} />
                    </div>
                </div>
            </div>
        </div>
    );
}
