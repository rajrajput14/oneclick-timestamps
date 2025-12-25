'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncSubscriptionButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSync = async () => {
        setLoading(true);
        try {
            await fetch('/api/subscription/sync', { method: 'POST' });
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={loading}
            className="neo-button px-6 py-3 bg-background text-muted-foreground hover:text-indigo-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
        >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            {loading ? 'Syncing' : 'Sync Status'}
        </button>
    );
}
