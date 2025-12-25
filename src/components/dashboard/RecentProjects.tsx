'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2, CheckCircle2, Square, FolderOpen, AlertCircle, ChevronRight, Clock, Box } from 'lucide-react';
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
    updatedAt: string | null;
    progress?: number;
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
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Recent Projects Error:', err);
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
        if (!confirm(`Confirm deletion of ${selectedIds.size} projects? This action is permanent.`)) return;

        setIsDeleting(true);
        try {
            const res = await fetch('/api/projects/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectIds: Array.from(selectedIds) })
            });

            if (!res.ok) throw new Error('Delete failed');
            await fetchProjects();
        } catch (err) {
            alert('Encountered an issue during project cleanup.');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Card key={i} variant="darker" className="p-8 border-white/5 space-y-4">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex justify-between items-center pt-4">
                            <Skeleton className="h-8 w-24 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 glass rounded-[2rem] border-red-500/10">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <div className="space-y-2">
                    <h3 className="text-xl font-bold uppercase tracking-tight">Failed to load projects</h3>
                    <p className="text-sm text-muted-foreground">Please check your connection and try again.</p>
                </div>
                <Button variant="outline" size="md" onClick={fetchProjects}>RETRY</Button>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 glass rounded-[3rem] border-dashed border-white/10">
                <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-muted-foreground/30">
                    <FolderOpen size={40} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-widest">No Projects Found</h3>
                    <p className="text-sm text-muted-foreground max-w-[200px]">Create your first project to see it here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header & Bulk Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                        Project Archives // {projects.length} Items
                    </h2>
                </div>

                {selectedIds.size > 0 && (
                    <Button
                        variant="danger"
                        size="sm"
                        className="w-full sm:w-auto px-6 text-[10px] font-black tracking-widest"
                        onClick={handleBulkDelete}
                        loading={isDeleting}
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        PURGE {selectedIds.size} SELECTED
                    </Button>
                )}
            </div>

            {/* Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {projects.map((project) => {
                    const isSelected = selectedIds.has(project.id);
                    const isCompleted = project.status === 'completed';

                    return (
                        <div key={project.id} className="relative group flex justify-center">
                            {/* Card Link */}
                            <Link
                                href={`/dashboard/project/${project.id}`}
                                className={`w-full max-w-[400px] flex flex-col p-8 rounded-[2.5rem] bg-card/40 border transition-all duration-500 group/item shadow-2xl relative overflow-hidden backdrop-blur-sm ${isSelected
                                        ? 'border-indigo-500/50 bg-indigo-500/[0.08] ring-1 ring-indigo-500/20 scale-[0.98]'
                                        : 'border-white/5 hover:border-indigo-500/30 hover:bg-card/60 hover:translate-y-[-4px]'
                                    }`}
                            >
                                {/* Selection Overlay */}
                                <button
                                    onClick={(e) => toggleSelect(e, project.id)}
                                    className={`absolute right-6 top-6 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isSelected
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'bg-white/5 text-transparent group-hover:text-muted-foreground/40 border border-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    {isSelected ? <CheckCircle2 size={18} /> : <Square size={18} />}
                                </button>

                                {/* Card Content */}
                                <div className="space-y-6 flex-1">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400/80">
                                            <Box size={12} />
                                            <span>Project ID: {project.id.slice(0, 8)}</span>
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-foreground line-clamp-2 leading-tight min-h-[3rem]">
                                            {project.title}
                                        </h3>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4">
                                        <Badge
                                            variant={isCompleted ? 'success' : 'warning'}
                                            className="px-4 py-1.5 text-[9px] font-black tracking-widest border border-white/5"
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isCompleted ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 animate-pulse'}`} />
                                            {project.status.toUpperCase()}
                                        </Badge>

                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                            <Clock size={12} />
                                            <span>{new Date(project.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Indicator (if active) */}
                                {!isCompleted && (
                                    <div className="mt-8 space-y-2">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                                            <span>Processing</span>
                                            <span>{project.progress || 0}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 transition-all duration-1000"
                                                style={{ width: `${project.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 group-hover/item:text-indigo-500 transition-colors">
                                        Open Workspace
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover/item:text-indigo-500 group-hover/item:translate-x-1 transition-all" />
                                </div>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
