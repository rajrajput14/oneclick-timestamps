'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { URLInputSection } from './URLInputSection';
import { FileUploadSection } from './FileUploadSection';
import { ProcessingView } from './ProcessingView';
import { FeedbackView } from './FeedbackView';

interface ProgressState {
    progress_percent: number;
    progress_message: string;
    status: string;
    progress_step: number;
    processedMinutes?: number;
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
        progress_percent: 0,
        progress_message: 'Synchronizing with Neural Grid...',
        status: 'pending',
        progress_step: 1
    });

    // Simplified: No optimistic creep. Progress is 100% backend driven.

    const startProcessing = async (input: string | File) => {
        setView('processing');
        setError(null);
        setProgress({
            progress_percent: 2,
            progress_message: typeof input === 'string' ? 'Checking video link...' : 'Verifying transcript file...',
            status: 'processing',
            progress_step: 1
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
                    progress_percent: project.progress_percent ?? project.progressPercent ?? 0,
                    progress_message: project.progress_message ?? project.progressMessage ?? 'Processing...',
                    status: project.status,
                    progress_step: project.progress_step ?? project.progressStep ?? 1,
                    processedMinutes: project.processedMinutes
                });

                if (project.status === 'completed') {
                    clearInterval(pollInterval);

                    // Trigger billing update across the dashboard
                    window.dispatchEvent(new CustomEvent('billing-update'));

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
                <ProcessingView progress={progress} />
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
