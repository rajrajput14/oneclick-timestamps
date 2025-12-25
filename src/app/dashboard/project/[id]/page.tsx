import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { projects, timestamps } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/user';
import TimestampOutput from '@/components/output/TimestampOutput';
import Link from 'next/link';

export default async function ProjectPage({ params }: { params: { id: string } }) {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) redirect('/sign-in');

    const user = await getCurrentUser();
    if (!user) redirect('/sign-in');

    const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, params.id), eq(projects.userId, user.id)),
    });

    if (!project) notFound();

    const projectTimestamps = await db.query.timestamps.findMany({
        where: eq(timestamps.projectId, params.id),
        orderBy: (timestamps, { asc }) => [asc(timestamps.position)],
    });

    return (
        <div className="max-w-5xl mx-auto space-y-16 font-outfit">
            {/* Nav Back */}
            <Link
                href="/dashboard"
                className="inline-flex glass-darker px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 hover:bg-secondary transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
                ← Workspace
            </Link>

            {/* Header with Title */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
                <div className="flex-1 min-w-0 space-y-6">
                    <h1 className="text-5xl md:text-8xl font-black tracking-[calc(-0.04em)] text-foreground leading-[1.1] drop-shadow-md">
                        {project.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6">
                        <div className="glass px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                            {project.status === 'completed' ? 'Synced ✨' : project.status}
                        </div>
                        {project.language && (
                            <div className="glass-darker px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {project.language.toUpperCase()} ENGINE
                            </div>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-30 italic">
                            Generated {new Date(project.createdAt || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                </div>

                {project.youtubeUrl && (
                    <a
                        href={project.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 group hover:bg-red-500/5 hover:border-red-500/20 hover:text-red-500 transition-all shadow-xl"
                    >
                        <span className="text-xl group-hover:scale-125 transition-transform">📽️</span>
                        Review Source
                    </a>
                )}
            </div>

            {/* Error Message */}
            {project.status === 'failed' && project.errorMessage && (
                <div className="glass p-12 rounded-[3.5rem] text-center border-red-500/20 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 font-black text-6xl italic">ERR</div>
                    <div className="text-5xl mb-8">⚠️</div>
                    <h3 className="text-2xl font-black text-red-500 uppercase tracking-tighter mb-4">Interruption Detected</h3>
                    <p className="text-muted-foreground text-lg font-black max-w-md mx-auto leading-relaxed">{project.errorMessage}</p>
                </div>
            )}

            {/* Processing State */}
            {project.status === 'processing' && (
                <div className="p-24 rounded-[4rem] glass text-center flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/10 animate-pulse" />
                    <div className="w-32 h-32 rounded-full glass-darker flex items-center justify-center mb-12 relative">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping" />
                        <span className="text-4xl animate-bounce">🧵</span>
                    </div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 text-foreground">Extracting Intelligence</h3>
                    <p className="text-muted-foreground text-lg font-black opacity-50 max-w-sm">Parsing visual vectors & narrative semantic maps...</p>
                </div>
            )}

            {/* Timestamps Output */}
            {project.status === 'completed' && projectTimestamps.length > 0 && (
                <div className="space-y-12">
                    <div className="flex items-center gap-6 px-4">
                        <div className="w-12 h-[2px] bg-indigo-500/30 rounded-full" />
                        <h2 className="text-xs font-black uppercase tracking-[0.5em] text-muted-foreground">Generated Intelligence</h2>
                    </div>
                    <TimestampOutput
                        projectId={project.id}
                        timestamps={projectTimestamps}
                    />
                </div>
            )}

            {/* Transcript Preview */}
            {project.transcript && (
                <div className="space-y-12">
                    <div className="flex items-center gap-6 px-4">
                        <div className="w-12 h-[2px] bg-purple-500/30 rounded-full" />
                        <h2 className="text-xs font-black uppercase tracking-[0.5em] text-muted-foreground">Raw Audio Data</h2>
                    </div>
                    <div className="glass-darker p-16 rounded-[4rem] border border-border shadow-inner group">
                        <div className="max-h-[600px] overflow-y-auto pr-10 custom-scrollbar">
                            <p className="text-base font-black text-muted-foreground/40 leading-relaxed whitespace-pre-wrap group-hover:text-muted-foreground/70 transition-colors duration-700">
                                {project.transcript}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
