'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TimestampOutput({
    projectId,
    timestamps: initialTimestamps,
}: {
    projectId: string;
    timestamps: any[];
}) {
    const router = useRouter();
    const [timestamps, setTimestamps] = useState(initialTimestamps);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const text = timestamps.map((ts) => `${ts.timeFormatted} ${ts.title}`).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-12">
            {/* Header Action - Glass Panel */}
            <div className="p-10 rounded-[3rem] glass flex flex-col md:flex-row items-center justify-between gap-10 border border-indigo-500/10 shadow-2xl">
                <div className="text-center md:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-2">Metadata output</p>
                    <h3 className="text-2xl font-black tracking-tighter text-foreground italic">Silicon Precision.</h3>
                </div>
                <button
                    onClick={handleCopy}
                    className={`px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${copied ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-indigo-600 text-white shadow-indigo-500/20'
                        }`}
                >
                    {copied ? 'Copied' : 'Copy Result'}
                </button>
            </div>

            {/* List */}
            <div className="space-y-4">
                {timestamps.map((ts) => (
                    <div
                        key={ts.id}
                        className="p-8 rounded-[2.5rem] glass hover:bg-white/50 dark:hover:bg-white/[0.05] transition-all group flex items-center gap-8 shadow-lg"
                    >
                        <span className="w-24 glass-darker py-3.5 rounded-2xl text-[10px] font-black text-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform drop-shadow-sm">
                            {ts.timeFormatted}
                        </span>

                        <div className="flex-1 min-w-0">
                            {editingId === ts.id ? (
                                <input
                                    className="w-full bg-transparent border-none outline-none font-black text-sm text-foreground uppercase tracking-widest animate-in fade-in duration-300"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    autoFocus
                                    onBlur={() => setEditingId(null)}
                                />
                            ) : (
                                <p className="font-black text-sm text-foreground uppercase tracking-tighter truncate opacity-80 group-hover:opacity-100 transition-opacity">{ts.title}</p>
                            )}
                        </div>

                        <button
                            onClick={() => { setEditingId(ts.id); setEditValue(ts.title); }}
                            className="w-12 h-12 glass-darker rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-primary-foreground"
                        >
                            ✏️
                        </button>
                    </div>
                ))}
            </div>

            {/* Area Preview */}
            <div className="glass-darker p-12 rounded-[3.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 font-black text-8xl pointer-events-none select-none italic tracking-tighter">RAW</div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-12 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" /> Description Format
                </p>
                <div className="px-10 border-l-2 border-indigo-500/30">
                    <pre className="text-sm font-black text-muted-foreground tracking-tight leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto custom-scrollbar">
                        {timestamps.map((ts) => `${ts.timeFormatted} ${ts.title}`).join('\n')}
                    </pre>
                </div>
            </div>
        </div>
    );
}
