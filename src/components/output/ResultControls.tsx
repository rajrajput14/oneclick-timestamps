'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Copy, Check, RefreshCcw, Database } from 'lucide-react';

interface ResultControlsProps {
    onCopyAll: () => void;
    onRegenerate?: () => void;
    count: number;
}

export function ResultControls({ onCopyAll, onRegenerate, count }: ResultControlsProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        onCopyAll();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="p-10 border-border/50 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden relative group bg-card/50">
            {/* Decorative background element */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/5 blur-[50px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-700" />

            <div className="text-center md:text-left relative z-10 flex items-center gap-6">
                <div className="w-16 h-16 bg-secondary/80 rounded-[2rem] flex items-center justify-center text-indigo-500 border border-border">
                    <Database className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">Success</p>
                    <h3 className="text-2xl font-black tracking-tighter text-foreground italic flex items-center gap-3">
                        {count} Timestamps
                    </h3>
                </div>
            </div>

            <div className="flex items-center gap-4 relative z-10">
                {onRegenerate && (
                    <Button
                        variant="outline"
                        size="md"
                        onClick={onRegenerate}
                        className="hidden md:flex"
                    >
                        <RefreshCcw className="w-3.5 h-3.5 mr-2 opacity-50" />
                        Generate Again
                    </Button>
                )}
                <Button
                    onClick={handleCopy}
                    variant={copied ? 'secondary' : 'primary'}
                    size="lg"
                    className="px-12"
                >
                    {copied ? (
                        <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy All
                        </>
                    )}
                </Button>
            </div>
        </Card>
    );
}
