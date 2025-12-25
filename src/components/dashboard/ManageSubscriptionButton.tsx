'use client';

import { useState } from 'react';

export default function ManageSubscriptionButton() {
    const [loading, setLoading] = useState(false);

    const handleManageBilling = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/subscription/portal');
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Connection to service portal failed.');
            }
        } catch (e) {
            alert('Service interruption.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleManageBilling}
            disabled={loading}
            className="glass px-14 py-6 text-foreground font-black rounded-3xl text-[10px] uppercase tracking-[0.3em] hover:bg-secondary transition-all active:scale-95 shadow-xl shadow-black/5"
        >
            {loading ? 'Initializing...' : 'Manage Service'}
        </button>
    );
}
