'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { isValidYouTubeUrl } from '@/lib/youtube/utils';
import { Link2, AlertCircle } from 'lucide-react';

interface URLInputSectionProps {
    onSubmit: (url: string) => void;
    loading: boolean;
    disabled: boolean;
}

export function URLInputSection({ onSubmit, loading, disabled }: URLInputSectionProps) {
    const [url, setUrl] = useState('');
    const [isValid, setIsValid] = useState(false);
    const [showError, setShowError] = useState(false);

    const validate = useCallback((val: string) => {
        const valid = isValidYouTubeUrl(val);
        setIsValid(valid);
        if (val && !valid) {
            setShowError(true);
        } else {
            setShowError(false);
        }
    }, []);

    useEffect(() => {
        if (url) validate(url);
        else {
            setIsValid(false);
            setShowError(false);
        }
    }, [url, validate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isValid && !loading) {
            onSubmit(url);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <form onSubmit={handleSubmit} className="space-y-10">
                <div className="relative group">
                    <Card
                        variant="darker"
                        className={`p-2 border-border/50 focus-within:border-indigo-500/40 transition-all shadow-inner bg-background/50 ${loading ? 'opacity-50 pointer-events-none' : ''
                            } ${showError ? 'border-red-500/40' : ''}`}
                    >
                        <div className="flex items-center px-8">
                            <Link2 className={`w-6 h-6 transition-colors ${showError ? 'text-red-500' : 'text-indigo-500'}`} />
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="Paste YouTube video link here"
                                autoFocus
                                className="w-full bg-transparent px-8 py-10 text-lg font-bold text-foreground outline-none border-none placeholder:text-muted-foreground/20 uppercase tracking-wide"
                                disabled={loading || disabled}
                            />
                        </div>
                    </Card>

                    {showError && (
                        <div className="absolute -bottom-10 left-10 flex items-center gap-3 text-red-500 animate-in slide-in-from-top-1 duration-300">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wide">This video link is not valid</span>
                        </div>
                    )}

                    {disabled && !loading && (
                        <div className="absolute -bottom-10 left-10 flex items-center gap-3 text-amber-500 animate-in slide-in-from-top-1 duration-300">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wide">You've used all your minutes</span>
                        </div>
                    )}
                </div>

                <Button
                    type="submit"
                    size="lg"
                    className="w-full text-lg tracking-wide font-black"
                    loading={loading}
                    disabled={!isValid || loading || disabled}
                >
                    {loading ? 'Processing...' : 'Generate Timestamps'}
                </Button>
            </form>

            {!url && !loading && !disabled && (
                <p className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
                    Awaiting Media Identification Signal
                </p>
            )}

            {disabled && !loading && (
                <div className="text-center space-y-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500/80">
                        Insufficient credits to process video
                    </p>
                    <Button variant="outline" size="sm" asChild className="px-8 border-amber-500/20 text-amber-500 hover:bg-amber-500/5">
                        <a href="/pricing">Buy more minutes to continue</a>
                    </Button>
                </div>
            )}
        </div>
    );
}
