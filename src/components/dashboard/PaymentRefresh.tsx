'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentRefresh() {
    const router = useRouter();

    useEffect(() => {
        // 1. Trigger an immediate manual sync via API to bypass webhook delay
        const triggerSync = async () => {
            try {
                await fetch('/api/subscription/sync', { method: 'POST' });
                router.refresh();
            } catch (e) {
                console.error('Auto-sync failed:', e);
            }
        };

        triggerSync();

        // 2. Aggressive polling for 10 seconds (every 2s) to catch eventual consistency
        const interval = setInterval(() => {
            router.refresh();
        }, 2000);

        const timeout = setTimeout(() => {
            clearInterval(interval);
        }, 10000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [router]);

    return (
        <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-right-10 duration-500">
            <div className="glass-darker px-8 py-4 rounded-2xl border border-indigo-500/30 shadow-2xl flex items-center gap-4">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
                    Syncing Account Status...
                </span>
            </div>
        </div>
    );
}
