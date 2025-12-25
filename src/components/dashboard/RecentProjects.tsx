'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2, CheckCircle2, Square, FolderOpen, AlertCircle, ChevronRight, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Project {
    id: string;
    title: string;
    status: string;
    language: string | null;
    createdAt: string;
}

export default function RecentProjects({ userId }: { userId: string }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchProjects = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch('/api/projects');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setProjects(Array.isArray(data) ? data : []);
            // Clear selection on refresh
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Activity Hub Error:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Confirm deletion of ${selectedIds.size} workspace items? This action is permanent.`)) return;

        setIsDeleting(true);
        try {
            const res = await fetch('/api/projects/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectIds: Array.from(selectedIds) })
            });

            if (!res.ok) throw new Error('Delete failed');

            // Refresh list
            await fetchProjects();
        } catch (err) {
            alert('Encountered an issue during workspace cleanup. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    if (loading) {
        return (
            <div className="space-y-8 px-4 py-6">
                <div className="flex items-center justify-between px-4">
                    <Skeleton className="h-4 w-48" />
                </div>
                {[1, 2, 3].map((i) => (
                    <Card key={i} variant="darker" className="p-10 border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="space-y-6 flex-1">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/4" />
                            </div>
                            <Skeleton className="w-12 h-12 rounded-2xl" />
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] p-12 text-center space-y-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 rounded-[2.5rem] bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                    <AlertCircle className="w-12 h-12" />
                </div>
                <div className="space-y-4">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-foreground">Registry Signal Interrupted</h3>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground opacity-60 leading-relaxed">
                        Loss of contact with the workspace archives. <br /> Attempt to re-establish secure link.
                    </p>
                </div>
                <Button variant="outline" size="md" className="px-10 font-bold tracking-wide" onClick={fetchProjects}>
                    RELOAD
                </Button>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] p-12 text-center space-y-12 animate-in fade-in zoom-in-95 duration-700">
                <div className="relative">
                    <div className="w-32 h-32 glass-darker rounded-[3rem] flex items-center justify-center text-indigo-500/20 border-border/50 shadow-inner">
                        <FolderOpen className="w-16 h-16" />
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-foreground">No projects yet</h3>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground opacity-50 leading-relaxed">
                        Paste a link to get started.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 px-2 pb-12 animate-in fade-in duration-500">
            {/* Header / Bulk Actions */}
            <div className="flex items-center justify-between px-8 py-4">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-80">
                        RECENT PROJECTS // {projects.length} VIDEOS
                    </h2>
                </div>

                {selectedIds.size > 0 && (
                    <Button
                        variant="danger"
                        size="sm"
                        className="px-6 text-[10px] font-black tracking-wide"
                        onClick={handleBulkDelete}
                        loading={isDeleting}
                    >
                        <Trash2 className="w-4 h-4 mr-3" />
                        DELETE {selectedIds.size} VIDEOS
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                {projects.map((project) => {
                    const isSelected = selectedIds.has(project.id);
                    const isCompleted = project.status === 'completed';

                    return (
                        <div key={project.id} className="relative group px-10">
                            {/* Selection Checkbox - Balanced within the card's left area */}
                            <button
                                onClick={(e) => toggleSelect(e, project.id)}
                                className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${isSelected
                                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-110'
                                    : 'bg-secondary text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:scale-110 border border-border hover:border-indigo-500/40'
                                    }`}
                            >
                                {isSelected ? (
                                    <CheckCircle2 className="w-4 h-4 animate-in zoom-in-75 duration-200" />
                                ) : (
                                    <Square className="w-4 h-4 opacity-50" />
                                )}
                            </button>

                            <Link
                                href={`/dashboard/project/${project.id}`}
                                className={`block p-8 rounded-[2rem] bg-card/40 border transition-all duration-300 group/item shadow-xl relative ${isSelected ? 'border-indigo-500/50 bg-indigo-500/[0.05] ring-1 ring-indigo-500/20' : 'border-border/50 hover:border-border hover:bg-card/80'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-8 pl-6 relative z-10">
                                    <div className="min-w-0 flex-1 space-y-3">
                                        <h3 className={`font-bold text-base uppercase tracking-tight truncate transition-colors ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400'}`}>
                                            {project.title}
                                        </h3>

                                        <div className="flex items-center gap-6">
                                            <Badge variant={isCompleted ? 'success' : 'warning'} className="px-4 py-1.5 text-[10px] font-bold tracking-widest border-border/50">
                                                <div className={`w-1.5 h-1.5 rounded-full mr-2.5 ${isCompleted ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 animate-pulse'}`} />
                                                {project.status.toUpperCase()}
                                            </Badge>
                                            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest font-outfit italic">
                                                {new Date(project.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center transition-all duration-500 group-hover/item:scale-110 group-hover/item:bg-indigo-600 group-hover/item:text-white border border-border flex-shrink-0 ${isCompleted ? 'text-indigo-500' : 'text-muted-foreground/20'}`}>
                                        <ChevronRight className="w-5 h-5" strokeWidth={3} />
                                    </div>
                                </div>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
