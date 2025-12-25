'use client';

import { useState } from 'react';
import { Sparkles, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ActivateProButton() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'success' | 'error' | null>(null);

    const handleActivate = async () => {
        setLoading(true);
        setMessage('');
        setStatus(null);

        try {
            const response = await fetch('/api/admin/activate-pro', {
                method: 'POST',
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage('Pro subscription activated! System reloading...');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                setStatus('error');
                setMessage(`Error: ${data.error}`);
            }
        } catch (error) {
            setStatus('error');
            setMessage('Failed to activate Pro subscription');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass p-8 rounded-[2.5rem] border-indigo-500/20 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />

            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 glass-darker rounded-xl flex items-center justify-center text-indigo-500">
                    <Terminal size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
                        Developer Console
                    </h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                        Manual Subscription Override
                    </p>
                </div>
            </div>

            <p className="text-sm font-medium text-muted-foreground mb-8 leading-relaxed">
                Bypass payment processing for testing purposes. This will instantly grant <span className="text-foreground font-bold italic">Creator Pro</span> access to the current account.
            </p>

            <button
                onClick={handleActivate}
                disabled={loading}
                className="w-full group/btn relative flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        <Sparkles size={16} />
                        Activate Pro Access
                    </>
                )}
            </button>

            {message && (
                <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500 ${status === 'success' ? 'glass border-green-500/20 text-green-500' : 'glass border-red-500/20 text-red-500'
                    }`}>
                    {status === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <p className="text-xs font-black uppercase tracking-tight">{message}</p>
                </div>
            )}
        </div>
    );
}
