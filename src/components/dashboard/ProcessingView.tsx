'use client';

import { Activity, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface ProcessingViewProps {
    progress: {
        percent: number;
        description: string;
        status: string;
    };
}

const STEPS = [
    { label: 'Link', min: 10 },
    { label: 'Audio', min: 40 },
    { label: 'Video', min: 80 },
    { label: 'Done', min: 100 }
];

export function ProcessingView({ progress }: ProcessingViewProps) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Progress Header */}
            <div className="flex items-end justify-between px-2">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                        <Activity className="w-3 h-3 animate-pulse" />
                        <span>Processing Video</span>
                    </div>
                    <h4 className="text-xl font-black uppercase tracking-tight text-foreground line-clamp-1">
                        {progress.description}
                    </h4>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-3xl font-black tracking-tighter text-indigo-500 drop-shadow-sm">
                        {progress.percent}%
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">
                        Progress
                    </span>
                </div>
            </div>

            {/* Progress Bar Container */}
            <div className="relative h-6 w-full bg-secondary rounded-full overflow-hidden border border-border p-1">
                {/* Main Progress Fill */}
                <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_25px_rgba(79,70,229,0.3)] relative"
                    style={{ width: `${Math.max(progress.percent, 2)}%` }}
                >
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />

                    {/* Glass Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                </div>
            </div>

            {/* Step Indicators */}
            <div className="grid grid-cols-4 gap-4">
                {STEPS.map((step, i) => {
                    const isDone = progress.percent > step.min || progress.status === 'completed';
                    const isActive = progress.percent >= step.min && progress.percent < (i < 3 ? STEPS[i + 1].min : 101);

                    return (
                        <div key={step.label} className="flex flex-col items-center gap-4 group">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${isDone ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                isActive ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl scale-110' :
                                    'bg-secondary border-border text-muted-foreground/30'
                                }`}>
                                {isDone ? (
                                    <CheckCircle2 className="w-5 h-5 animate-in zoom-in duration-300" />
                                ) : (
                                    <span className="text-xs font-black">{i + 1}</span>
                                )}
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors duration-500 ${isDone || isActive ? 'text-foreground' : 'text-muted-foreground/30'
                                    }`}>
                                    {step.label}
                                </span>
                                {isActive && (
                                    <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Status Tip */}
            <Card variant="darker" className="p-6 border-border/50 bg-secondary/50">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400 leading-relaxed text-center opacity-90 animate-pulse">
                    {progress.description || "Synthesizing industry-grade results..."}
                </p>
            </Card>
        </div >
    );
}
