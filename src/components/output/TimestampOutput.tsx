'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TimestampRow } from './TimestampRow';
import { ResultControls } from './ResultControls';
import { Card } from '@/components/ui/Card';
import { FileText } from 'lucide-react';

export default function TimestampOutput({
    projectId,
    timestamps: initialTimestamps,
}: {
    projectId: string;
    timestamps: any[];
}) {
    const router = useRouter();
    const [timestamps, setTimestamps] = useState(initialTimestamps);

    const handleUpdate = useCallback(async (id: string, newTitle: string) => {
        // Optimistic Update
        const updated = timestamps.map(ts =>
            ts.id === id ? { ...ts, title: newTitle } : ts
        );
        setTimestamps(updated);

        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timestamps: updated })
            });

            if (!res.ok) throw new Error('Persistence failed');
            router.refresh();
        } catch (err) {
            console.error('Update failed:', err);
            // Revert on error
            setTimestamps(initialTimestamps);
            alert('Encountered an issue saving changes. Reverting to original state.');
        }
    }, [projectId, timestamps, initialTimestamps, router]);

    const handleCopyAll = () => {
        const text = timestamps.map((ts) => `${ts.timeFormatted} ${ts.title}`).join('\n');
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Header Action - Glass Panel */}
            <ResultControls
                onCopyAll={handleCopyAll}
                count={timestamps.length}
            />

            {/* List */}
            <div className="space-y-4">
                <div className="px-6 flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Video List</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/50">Edit</p>
                </div>
                {timestamps.map((ts) => (
                    <TimestampRow
                        key={ts.id}
                        id={ts.id}
                        timeFormatted={ts.timeFormatted}
                        title={ts.title}
                        onUpdate={handleUpdate}
                    />
                ))}
            </div>

            {/* Area Preview */}
            <Card variant="darker" className="p-12 relative overflow-hidden group border-border/50 bg-secondary/30">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] font-black text-9xl pointer-events-none select-none italic tracking-tighter text-foreground">RAW</div>

                <div className="flex items-center gap-3 mb-12">
                    <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm transition-transform group-hover:rotate-12 border border-indigo-500/20">
                        <FileText className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        All Timestamps
                    </p>
                </div>

                <div className="px-10 border-l-2 border-indigo-500/30">
                    <pre className="text-sm font-bold text-muted-foreground tracking-tight leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto custom-scrollbar opacity-60 group-hover:opacity-100 transition-opacity">
                        {timestamps.map((ts) => `${ts.timeFormatted} ${ts.title}`).join('\n')}
                    </pre>
                </div>
            </Card>
        </div>
    );
}
