'use client';

import { Activity, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface ProcessingViewProps {
    progress: {
        percent: number;
        description: string;
        status: string;
        step?: number;
        processedMinutes?: number;
    };
}

const STEPS = [
    { label: 'Audio & Video', description: 'Step 1: Processing Media' },
    { label: 'Speech Analysis', description: 'Step 2: Understanding Content' },
    { label: 'AI Synthesis', description: 'Step 3: Creating Chapters' }
];

export function ProcessingView({ progress }: ProcessingViewProps) {
    const isCompleted = progress.status === 'completed';
    const currentStep = progress.step || 1;

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Progress Header */}
            <div className="flex items-end justify-between px-2">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                        <Activity className={`w-3 h-3 ${isCompleted ? '' : 'animate-pulse'}`} />
                        <span>{isCompleted ? 'Processing Done' : `Step ${currentStep}: ${STEPS[currentStep - 1]?.label}`}</span>
                    </div>
                    <h4 className="text-xl font-black uppercase tracking-tight text-foreground line-clamp-1">
                        {isCompleted ? 'Project completed successfully' : progress.description}
                    </h4>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-3xl font-black tracking-tighter text-indigo-500 drop-shadow-sm">
                        {progress.percent}%
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">
                        {isCompleted ? 'Finalized' : 'Progress'}
                    </span>
                </div>
            </div>

            {/* Progress Bar Container */}
            <div className="relative h-6 w-full bg-secondary rounded-full overflow-hidden border border-border p-1">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_25px_rgba(79,70,229,0.3)] relative ${isCompleted ? 'bg-green-500' : 'bg-indigo-600'}`}
                    style={{ width: `${Math.max(progress.percent, 2)}%` }}
                >
                    {!isCompleted && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                </div>
            </div>

            {/* Step Indicators */}
            <div className="grid grid-cols-3 gap-6">
                {STEPS.map((step, i) => {
                    const stepNum = i + 1;
                    const isDone = progress.status === 'completed' || currentStep > stepNum;
                    const isActive = currentStep === stepNum && !isCompleted;

                    return (
                        <div key={step.label} className="flex flex-col items-center gap-4 group">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${isDone ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                isActive ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl scale-110' :
                                    'bg-secondary border-border text-muted-foreground/30'
                                }`}>
                                {isDone ? (
                                    <CheckCircle2 className="w-6 h-6 animate-in zoom-in duration-300" />
                                ) : (
                                    <span className="text-sm font-black">{stepNum}</span>
                                )}
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors duration-500 text-center ${isDone || isActive ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                                    {isActive ? step.label : step.label.split(' ')[0]}
                                </span>
                                {isActive && (
                                    <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Status Tip or Completion Info */}
            <Card variant="darker" className="p-8 border-border/50 bg-secondary/50">
                {isCompleted ? (
                    <div className="flex flex-col items-center gap-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-500">
                            Neural Processing Complete
                        </p>
                        {progress.processedMinutes !== undefined && (
                            <p className="text-2xl font-black text-foreground italic">
                                Minutes Used: <span className="text-indigo-500">{progress.processedMinutes}</span>
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400 leading-relaxed text-center opacity-90 animate-pulse">
                        {progress.description || "Synthesizing industry-grade results..."}
                    </p>
                )}
            </Card>
        </div>
    );
}
