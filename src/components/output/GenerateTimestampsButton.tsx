'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GenerateTimestampsButtonProps {
    projectId: string;
    hasTranscript: boolean;
}

export default function GenerateTimestampsButton({ projectId, hasTranscript }: GenerateTimestampsButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!hasTranscript) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/generate-timestamps`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to generate timestamps');
            }

            // Success! Refresh the page to show the new timestamps
            router.refresh();
        } catch (err: any) {
            console.error('Generation Error:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    if (!hasTranscript) return null;

    return (
        <div className="space-y-4">
            <button
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-[1.5rem] hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-indigo-500/30 flex items-center justify-center gap-4 ${loading ? 'cursor-not-allowed opacity-70' : ''
                    }`}
            >
                {loading ? (
                    <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Synthesizing Map...
                    </>
                ) : (
                    <>
                        <span className="text-lg">✨</span>
                        Generate Timestamps
                    </>
                )}
            </button>

            {error && (
                <p className="text-[10px] font-black uppercase text-red-500 tracking-widest text-center animate-pulse">
                    ⚠️ {error}
                </p>
            )}

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40 text-center">
                Uses existing transcript to build logic markers
            </p>
        </div>
    );
}
