'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { URLInputSection } from './URLInputSection';
import { FileUploadSection } from './FileUploadSection';
import { ProcessingView } from './ProcessingView';
import { FeedbackView } from './FeedbackView';

interface ProgressState {
    percent: number;
    description: string;
    status: string;
}

type FormView = 'idle' | 'processing' | 'error' | 'success';
type InputMode = 'url' | 'file';

export default function CreateProjectForm({ usageAllowed, minutesRemaining }: { usageAllowed: boolean, minutesRemaining: number }) {
    const router = useRouter();
    const [view, setView] = useState<FormView>('idle');
    const [mode, setMode] = useState<InputMode>('url');
    const [error, setError] = useState<{ title: string, message: string } | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [progress, setProgress] = useState<ProgressState>({
        percent: 0,
        description: 'Waiting for signal...',
        status: 'idle'
    });

    // VISUAL PROGRESS: This decoupled state ensures the UI always feels alive
    const [visualPercent, setVisualPercent] = useState(0);

    // Auto-increment logic: if backend is slow, we slowly "creep" the bar
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (view === 'processing' && visualPercent < 90) {
            interval = setInterval(() => {
                setVisualPercent(prev => {
                    const increment = prev < 50 ? 0.5 : (prev < 80 ? 0.2 : 0.1);
                    return Math.min(90, prev + increment);
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [view, visualPercent]);

    // Sync visual percent when backend makes significant leaps
    // but only if backend is ahead of our visual estimate
    useEffect(() => {
        if (progress.percent > visualPercent) {
            setVisualPercent(progress.percent);
        }
    }, [progress.percent, visualPercent]);

    const startProcessing = async (input: string | File) => {
        setView('processing');
        setError(null);
        setVisualPercent(5);
        setProgress({
            percent: 5,
            description: typeof input === 'string' ? 'Checking video link...' : 'Verifying transcript file...',
            status: 'processing'
        });

        try {
            const formData = new FormData();
            if (typeof input === 'string') {
                formData.append('youtubeUrl', input);
            } else {
                formData.append('transcriptFile', input);
            }

            const response = await fetch('/api/projects/create', { method: 'POST', body: formData });

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`The server returned an unexpected response: ${text.substring(0, 100)}...`);
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || 'The server encountered an issue processing this request.');
            }

            if (data.projectId) {
                setProjectId(data.projectId);
            } else {
                // Fallback for non-polling projects
                router.push(`/dashboard/project/${data.projectId}`);
                router.refresh();
            }
        } catch (err: any) {
            setView('error');
            setError({
                title: 'Something went wrong',
                message: err.message || 'Please try again'
            });
        }
    };

    // Polling Effect
    useEffect(() => {
        if (!projectId || view !== 'processing') return;

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/projects/${projectId}`);
                if (!res.ok) throw new Error('Loss of signal with processing engine.');
                const project = await res.json();

                setProgress({
                    percent: project.progress || 0,
                    description: project.statusDescription || 'Processing...',
                    status: project.status
                });

                if (project.status === 'completed') {
                    clearInterval(pollInterval);
                    setVisualPercent(100);
                    setTimeout(() => {
                        setView('success');
                        setTimeout(() => {
                            router.push(`/dashboard/project/${projectId}`);
                            router.refresh();
                        }, 1500);
                    }, 500);
                } else if (project.status === 'failed') {
                    clearInterval(pollInterval);
                    setView('error');
                    setError({
                        title: 'Almost done...',
                        message: project.errorMessage || 'Something went wrong. Please try again'
                    });
                    setProjectId(null);
                }
            } catch (err: any) {
                console.error('Polling error:', err);
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [projectId, view, router]);

    const handleRetry = () => {
        setView('idle');
        setError(null);
        setProjectId(null);
    };

    return (
        <div className="w-full space-y-10">
            {view === 'idle' && (
                <div className="space-y-10">
                    {/* Tabs */}
                    <div className="flex bg-secondary/50 backdrop-blur-md p-1.5 rounded-2xl max-w-[280px] border border-border">
                        {(['url', 'file'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setMode(t)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all ${mode === t ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {t === 'url' ? 'Video 🔗' : 'Transcript 📄'}
                            </button>
                        ))}
                    </div>

                    {mode === 'url' ? (
                        <URLInputSection
                            onSubmit={startProcessing}
                            loading={false}
                            disabled={!usageAllowed}
                        />
                    ) : (
                        <FileUploadSection
                            onSubmit={startProcessing}
                            loading={false}
                            disabled={!usageAllowed}
                        />
                    )}
                </div>
            )}

            {view === 'processing' && (
                <ProcessingView progress={{ ...progress, percent: visualPercent }} />
            )}

            {view === 'error' && error && (
                <FeedbackView
                    type="error"
                    title={error.title}
                    message={error.message}
                    onRetry={handleRetry}
                    actionLabel="Return to Input"
                    onAction={handleRetry}
                />
            )}

            {view === 'success' && (
                <FeedbackView
                    type="success"
                    title="Your timestamps are ready"
                    message="You can now use your new timestamps."
                />
            )}
        </div>
    );
}
