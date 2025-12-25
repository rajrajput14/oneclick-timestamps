'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileUp, FileText, X } from 'lucide-react';

interface FileUploadSectionProps {
    onSubmit: (file: File) => void;
    loading: boolean;
    disabled: boolean;
}

export function FileUploadSection({ onSubmit, loading, disabled }: FileUploadSectionProps) {
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleClear = () => {
        setFile(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (file && !loading) {
            onSubmit(file);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <form onSubmit={handleSubmit} className="space-y-10">
                <div className="relative group">
                    <Card
                        variant="darker"
                        className={`p-2 border-border/50 focus-within:border-indigo-500/40 transition-all shadow-inner bg-background/50 ${loading ? 'opacity-50 pointer-events-none' : ''
                            }`}
                    >
                        <div className="relative h-[200px] flex items-center justify-center">
                            {!file ? (
                                <>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".txt,.srt,.vtt"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={loading || disabled}
                                    />
                                    <div className="flex flex-col items-center gap-6 text-muted-foreground/30 group-hover:text-indigo-500 transition-all duration-500 group-hover:scale-110">
                                        <div className="w-20 h-20 bg-secondary/80 rounded-3xl flex items-center justify-center border-border/50 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_30px_rgba(79,70,229,0.2)]">
                                            <FileUp className="w-10 h-10" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wide">
                                            {disabled ? "You've used all your minutes" : "Upload Transcript"}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-8 px-12 w-full animate-in zoom-in-95 duration-500">
                                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.1)]">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <p className="text-lg font-bold text-foreground uppercase tracking-tight truncate leading-none">
                                            {file.name}
                                        </p>
                                        <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wide">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleClear}
                                        className="h-12 w-12 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border-border/50"
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <Button
                    type="submit"
                    size="lg"
                    className="w-full text-lg tracking-wide font-black"
                    loading={loading}
                    disabled={!file || loading || disabled}
                >
                    {loading ? 'Processing...' : 'Process Transcript'}
                </Button>
            </form>

            {!file && !loading && !disabled && (
                <p className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
                    Paste YouTube video link here
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
