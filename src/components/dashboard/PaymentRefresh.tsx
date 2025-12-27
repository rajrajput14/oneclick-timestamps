'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function PaymentRefresh() {
    const router = useRouter();
    const pathname = usePathname();

    const hasTriggered = useRef(false);

    useEffect(() => {
        if (hasTriggered.current) return;
        hasTriggered.current = true;

        // 1. Trigger an immediate manual sync via API to bypass webhook delay
        const triggerSync = async () => {
            try {
                console.log('🔄 Automatic background sync starting...');
                await fetch('/api/subscription/sync', {
                    method: 'POST',
                    cache: 'no-store'
                });
                // Trigger immediate UI refresh for any listening client components
                window.dispatchEvent(new CustomEvent('billing-update'));
                router.refresh();
            } catch (e) {
                console.error('Auto-sync failed:', e);
            }
        };

        triggerSync();

        // 2. Poll every 3 seconds instead of 2
        const interval = setInterval(() => {
            router.refresh();
        }, 3000);

        // 3. Clear URL after 8 seconds so this component stops rendering on next refresh
        const urlCleanup = setTimeout(() => {
            router.replace(pathname, { scroll: false });

            // Once URL is clean, we can stop the aggressive polling
            clearInterval(interval);
        }, 8000);

        return () => {
            clearInterval(interval);
            clearTimeout(urlCleanup);
        };
    }, [router, pathname]);

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
