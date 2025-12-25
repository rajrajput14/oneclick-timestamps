'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

    useEffect(() => {
        fetch('/api/projects').then(res => res.json()).then(data => {
            setProjects(Array.isArray(data) ? data : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return null;

    return (
        <div className="space-y-4 px-2">
            {projects.map((project) => (
                <Link
                    key={project.id}
                    href={`/dashboard/project/${project.id}`}
                    className="block p-8 rounded-[2.5rem] glass hover:bg-secondary transition-all duration-300 group shadow-lg hover:shadow-2xl"
                >
                    <div className="flex items-center justify-between gap-6">
                        <div className="min-w-0">
                            <h3 className="font-black text-xs uppercase tracking-tight text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {project.title}
                            </h3>
                            <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl glass-darker text-[9px] font-black uppercase tracking-widest ${project.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${project.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                                {project.status}
                            </div>
                        </div>
                        <div className="w-10 h-10 glass-darker rounded-xl flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all group-hover:scale-110">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
