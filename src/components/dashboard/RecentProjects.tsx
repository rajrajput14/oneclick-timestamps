'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Clock,
    ChevronRight,
    Trash2,
    Box,
    CheckCircle2,
    Square,
    FolderOpen,
    AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Project } from '@/lib/db/schema';

export default function RecentProjects({ userId }: { userId: string }) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchProjects = useCallback(async () => {
        try {
            const res = await fetch('/api/projects');
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
        // Poll every 10 seconds for dashboard updates
        const interval = setInterval(fetchProjects, 10000);
        return () => clearInterval(interval);
    }, [fetchProjects]);

    const toggleSelect = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} projects?`)) return;
        setIsDeleting(true);
        try {
            for (const id of Array.from(selectedIds)) {
                await fetch(`/api/projects/${id}`, { method: 'DELETE' });
            }
            setSelectedIds(new Set());
            await fetchProjects();
        } catch (e) {
            alert('Deletion failed');
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Scanning Neural Archives...</p>
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
                    <h3 className="text-xl font-black uppercase tracking-widest">Workspace Empty</h3>
                    <p className="text-sm text-muted-foreground max-w-[200px]">Create your first project to see it here.</p>
                </div>
            </div>
        );
    }

    const completedProjects = projects.filter(p => p.status === 'completed');
    const inProgressProjects = projects.filter(p => p.status === 'processing' || p.status === 'pending' || p.status === 'failed');

    const renderProjectGrid = (projectList: Project[], title: string) => (
        <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                        {title} // {projectList.length} Items
                    </h2>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {projectList.map((project) => {
                    const isSelected = selectedIds.has(project.id);
                    const isCompleted = project.status === 'completed';
                    const isFailed = project.status === 'failed';

                    return (
                        <div key={project.id} className="relative group flex justify-center">
                            <Link
                                href={`/dashboard/project/${project.id}`}
                                className={`w-full max-w-[420px] flex flex-col p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-card/40 border transition-all duration-500 group/item shadow-2xl relative overflow-hidden backdrop-blur-sm ${isSelected
                                    ? 'border-indigo-500/50 bg-indigo-500/[0.08] ring-1 ring-indigo-500/20 scale-[0.98]'
                                    : 'border-white/5 hover:border-indigo-500/30 hover:bg-card/60 hover:translate-y-[-4px]'
                                    } ${isFailed ? 'border-red-500/20 bg-red-500/5' : ''}`}
                            >
                                <button
                                    onClick={(e) => toggleSelect(e, project.id)}
                                    className={`absolute right-6 top-6 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isSelected
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'bg-white/5 text-transparent group-hover:text-muted-foreground/40 border border-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    {isSelected ? <CheckCircle2 size={18} /> : <Square size={18} />}
                                </button>

                                <div className="space-y-4 sm:space-y-6 flex-1">
                                    <div className="space-y-2 sm:space-y-3">
                                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-400/80">
                                            <Box size={10} className="sm:w-3 sm:h-3" />
                                            <span>Project ID: {project.id.slice(0, 10)}</span>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-[3rem]">
                                            {project.title}
                                        </h3>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                        <Badge
                                            variant={isCompleted ? 'success' : (isFailed ? 'error' : 'warning')}
                                            className="px-3 sm:px-4 py-1 sm:py-1.5 text-[8px] sm:text-[9px] font-black tracking-widest border border-white/5"
                                        >
                                            <div className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full mr-1.5 sm:mr-2 ${isCompleted ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : (isFailed ? 'bg-red-500' : 'bg-yellow-500 animate-pulse')}`} />
                                            {project.status?.toUpperCase() || 'UNKNOWN'}
                                        </Badge>

                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                            <Clock size={12} />
                                            <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {!isCompleted && (
                                    <div className="mt-8 space-y-2">
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                                            <span>{isFailed ? 'Processing Failed' : 'Real-time Progress'}</span>
                                            <span>{project.progress || 0}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${isFailed ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${project.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 group-hover/item:text-indigo-500 transition-colors">
                                        {isCompleted ? 'Open Workspace' : 'View Details'}
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

    return (
        <div className="space-y-24">
            {inProgressProjects.length > 0 && renderProjectGrid(inProgressProjects, 'Active Operations')}

            {completedProjects.length > 0 && renderProjectGrid(completedProjects, 'Project Archive')}

            {selectedIds.size > 0 && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-500">
                    <Button
                        variant="danger"
                        size="lg"
                        className="px-12 py-6 rounded-[2rem] text-xs font-black tracking-[0.3em] shadow-[0_0_50px_rgba(239,68,68,0.3)] border border-red-500/20"
                        onClick={handleBulkDelete}
                        loading={isDeleting}
                    >
                        <Trash2 className="w-4 h-4 mr-3" />
                        PURGE {selectedIds.size} FILES
                    </Button>
                </div>
            )}
        </div>
    );
}
