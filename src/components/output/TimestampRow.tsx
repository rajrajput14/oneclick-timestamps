'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pencil, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimestampRowProps {
    id: string;
    timeFormatted: string;
    title: string;
    onUpdate: (id: string, newTitle: string) => void;
}

export function TimestampRow({ id, timeFormatted, title, onUpdate }: TimestampRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(title);

    const handleSave = () => {
        if (editValue.trim() && editValue !== title) {
            onUpdate(id, editValue);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(title);
        setIsEditing(false);
    };

    return (
        <Card
            variant="glass"
            className={cn(
                "p-8 group flex items-center gap-10 border-border/50 hover:border-indigo-500/30 transition-all duration-300 bg-card/10",
                isEditing && "border-indigo-500/40 ring-1 ring-indigo-500/20 bg-indigo-500/[0.03]"
            )}
        >
            {/* Time Badge */}
            <div className="flex-shrink-0">
                <Badge variant="info" className="px-6 py-3 text-sm font-bold tracking-wide bg-indigo-500/10 border-indigo-500/20 text-indigo-500">
                    <Clock className="w-4 h-4 mr-3 opacity-70" />
                    {timeFormatted}
                </Badge>
            </div>

            {/* Title / Input */}
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        autoFocus
                        className="w-full bg-transparent border-none outline-none font-bold text-lg text-foreground uppercase tracking-wide animate-in fade-in duration-300 focus:ring-0 placeholder:text-muted-foreground/20"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') handleCancel();
                        }}
                    />
                ) : (
                    <p className="font-bold text-lg text-foreground uppercase tracking-tight truncate opacity-90 group-hover:opacity-100 transition-opacity">
                        {title}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                {isEditing ? (
                    <>
                        <Button variant="ghost" size="icon" onClick={handleSave} className="h-11 w-11 text-green-500 hover:bg-green-500/20">
                            <Check className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleCancel} className="h-11 w-11 text-muted-foreground hover:bg-white/5">
                            <X className="w-5 h-5" />
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsEditing(true)}
                        className="h-11 w-11 opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white border-white/5"
                    >
                        <Pencil className="w-5 h-5" />
                    </Button>
                )}
            </div>
        </Card>
    );
}
