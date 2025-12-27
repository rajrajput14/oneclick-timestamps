'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Zap, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface BillingStatus {
    plan: string;
    subscriptionStatus: string;
    minutesLimit: number;
    minutesUsed: number;
    addonMinutes: number;
    totalAvailable: number;
    billingCycleEnd: string | null;
}

export default function BillingUsageMetrics({ initialData }: { initialData: BillingStatus }) {
    const [data, setData] = useState<BillingStatus>(initialData);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Sync internal state with props if they change (important for router.refresh())
    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const refreshStatus = useCallback(async (manualSync = false) => {
        setLoading(true);
        try {
            if (manualSync) {
                console.log('🔄 Triggering manual subscription sync...');
                await fetch('/api/subscription/sync', {
                    method: 'POST',
                    cache: 'no-store'
                });
            }

            // Add cache busting timestamp
            const res = await fetch(`/api/billing/status?t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            });

            if (res.ok) {
                const newData = await res.json();
                console.log('📊 New billing data received:', newData.plan, newData.subscriptionStatus);
                setData(newData);

                if (manualSync) {
                    // Trigger update across other components if any
                    window.dispatchEvent(new CustomEvent('billing-update'));
                }
            }
        } catch (error) {
            console.error('Failed to refresh billing status:', error);
        } finally {
            setLoading(false);
        }
    }, [initialData]);

    // Initial refresh on mount to ensure freshness (anti-caching measure)
    useEffect(() => {
        refreshStatus();
    }, [refreshStatus]);

    // Handle external update requests
    useEffect(() => {
        const handleUpdate = () => refreshStatus();
        window.addEventListener('billing-update', handleUpdate);
        return () => window.removeEventListener('billing-update', handleUpdate);
    }, [refreshStatus]);

    // Effect to handle payment success detection with aggressive polling
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
            setShowSuccess(true);

            let pollCount = 0;
            const maxPolls = 15; // Poll for ~45 seconds

            const pollInterval = setInterval(async () => {
                pollCount++;
                console.log(`🔍 Aggressive poll ${pollCount}/${maxPolls}...`);

                await refreshStatus();

                // If the plan has changed from Free, or some other change detected, we can stop
                // Note: We check data.plan because refreshStatus updates it
                setData(prev => {
                    if (prev.plan !== 'Free' || pollCount >= maxPolls) {
                        clearInterval(pollInterval);
                        if (prev.plan !== 'Free') {
                            console.log('✅ Plan change detected! Ending aggressive polling.');
                        }
                    }
                    return prev;
                });
            }, 3000);

            // Hide success message after some time
            setTimeout(() => setShowSuccess(false), 8000);

            return () => clearInterval(pollInterval);
        }
    }, [refreshStatus]);

    const isPaidUser = (data.subscriptionStatus === 'active' || data.subscriptionStatus === 'trialing' || data.subscriptionStatus === 'past_due') && data.plan !== 'Free';
    const totalMinutes = data.minutesLimit + data.addonMinutes;
    const minutesRemaining = data.totalAvailable;

    return (
        <div className="space-y-12">
            {/* Payment Success Notification */}
            {showSuccess && (
                <div className="animate-in slide-in-from-top-10 duration-700">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-[2rem] p-6 md:p-8 flex items-center gap-6 md:gap-8 backdrop-blur-xl shadow-2xl">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-2xl animate-bounce shadow-[0_0_30px_rgba(34,197,94,0.5)]">
                            ✓
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xl md:text-2xl font-black uppercase text-foreground">Payment Successful</h4>
                            <p className="text-xs md:text-sm text-muted-foreground font-medium tracking-wide">Your plan and usage limits have been updated. Welcome to the creator tier.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Status Badge (Floating in parent usually, but we'll provide it here or handle separately) */}
            <div className="flex justify-end -mb-8">
                <Badge variant={isPaidUser ? 'success' : 'default'} className="px-6 md:px-8 py-2 md:py-3 text-[10px] md:text-xs font-bold tracking-wide border-border/50">
                    {isPaidUser ? <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-2 md:mr-3" /> : <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 mr-2 md:mr-3" />}
                    {isPaidUser ? `${data.plan.toUpperCase()} ACTIVE` : 'FREE TIER'}
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                {/* Usage Card */}
                <Card variant="glass" className="p-6 md:p-12 relative overflow-hidden group border-border shadow-2xl">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-600/5 blur-[100px] rounded-full group-hover:bg-indigo-600/10 transition-all duration-1000" />

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-12">
                            <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" />
                            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-muted-foreground opacity-80">Video Usage</p>
                        </div>

                        <div className="flex items-baseline gap-4 md:gap-6 mb-12 md:mb-16">
                            <span className="text-6xl md:text-8xl font-black tracking-tighter text-foreground leading-none drop-shadow-2xl">
                                {data.minutesUsed}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-2xl md:text-4xl font-bold text-muted-foreground/30 italic">/ {totalMinutes} Min</span>
                                <span className="text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                                    {data.minutesLimit} Base + {data.addonMinutes} Add-on
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
                                    style={{ width: `${Math.min(100, (data.minutesUsed / (totalMinutes || 1)) * 100)}%` }}
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

                {/* Plan Card */}
                <Card variant="glass" className="p-6 md:p-12 flex flex-col justify-between relative overflow-hidden group border-border shadow-2xl min-h-[300px] md:min-h-auto">
                    <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-600/5 blur-[100px] rounded-full group-hover:bg-purple-600/10 transition-all duration-1000" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-12">
                            <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500" />
                            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-muted-foreground opacity-80">Account Status</p>
                        </div>
                        <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-foreground leading-[1.1]">
                            {data.plan} Plan
                        </h3>
                    </div>

                    <div className="pt-8 md:pt-12 border-t border-border flex items-center justify-between relative z-10">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshStatus(true)}
                            disabled={loading}
                            className="text-[10px] font-bold tracking-widest uppercase py-4"
                        >
                            {loading ? 'SYNCING...' : 'SYNC STATUS 🔄'}
                        </Button>
                        {isPaidUser ? (
                            <Badge variant="success" className="px-4 md:px-6 py-2 tracking-wide text-[10px] md:text-xs">SUB ACTIVE</Badge>
                        ) : (
                            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">TIER 1 CLOUD</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
