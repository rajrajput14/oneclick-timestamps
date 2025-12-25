'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CheckCircle2, RefreshCcw } from 'lucide-react';

interface FeedbackViewProps {
    type: 'error' | 'success';
    title: string;
    message: string;
    onRetry?: () => void;
    onAction?: () => void;
    actionLabel?: string;
}

export function FeedbackView({ type, title, message, onRetry, onAction, actionLabel }: FeedbackViewProps) {
    const isError = type === 'error';

    return (
        <Card className={`p-10 text-center space-y-8 animate-in zoom-in-95 duration-500 ${isError ? 'border-red-500/20 bg-red-500/[0.05]' : 'border-green-500/20 bg-green-500/[0.05]'
            }`}>
            <div className={`w-20 h-20 rounded-[2rem] mx-auto flex items-center justify-center ${isError ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                }`}>
                {isError ? <AlertCircle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
            </div>

            <div className="space-y-3">
                <h3 className="text-xl font-black uppercase tracking-tighter text-foreground">
                    {title}
                </h3>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground leading-relaxed max-w-[280px] mx-auto opacity-70">
                    {message}
                </p>
            </div>

            <div className="flex flex-col gap-4">
                {onRetry && (
                    <Button variant="outline" size="lg" onClick={onRetry} className="w-full">
                        <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                        Try Again
                    </Button>
                )}
                {onAction && actionLabel && (
                    <Button variant={isError ? 'outline' : 'primary'} size="lg" onClick={onAction} className="w-full">
                        {actionLabel}
                    </Button>
                )}
            </div>
        </Card>
    );
}
