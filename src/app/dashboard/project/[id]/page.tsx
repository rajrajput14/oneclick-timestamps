import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { projects, timestamps } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/user';
import TimestampOutput from '@/components/output/TimestampOutput';
import Link from 'next/link';
import GenerateTimestampsButton from '@/components/output/GenerateTimestampsButton';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default async function ProjectPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;

    const { userId: clerkUserId } = await auth();
    // Middleware handles the redirect if not authenticated

    const user = await getCurrentUser();
    // Middleware handles the redirect if not authenticated
    if (!user) return null;

    // Diagnostic UI for database errors
    if ('error' in user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-6">
                <div className="text-4xl uppercase font-black text-red-500 underline decoration-red-500/30">DATABASE_ERROR</div>
                <p className="text-muted-foreground">Unable to fetch project data. Please check your database connection.</p>
                <Button asChild variant="outline">
                    <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
            </div>
        );
    }

    const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, id), eq(projects.userId, user.id)),
    });

    if (!project) notFound();

    const projectTimestamps = await db.query.timestamps.findMany({
        where: eq(timestamps.projectId, id),
        orderBy: (timestamps, { asc }) => [asc(timestamps.position)],
    });

    return (
        <div className="max-w-5xl mx-auto space-y-24 pb-32 font-outfit animate-in fade-in duration-1000">
            {/* Nav Back */}
            <div className="pt-8">
                <Link
                    href="/dashboard"
                    className="inline-flex glass-darker px-10 py-5 rounded-2xl text-[11px] font-bold uppercase tracking-wide text-indigo-500 hover:bg-secondary transition-all hover:scale-105 active:scale-95 border border-border/50 shadow-xl"
                >
                    ← BACK TO DASHBOARD
                </Link>
            </div>

            {/* Header with Title */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-16">
                <div className="flex-1 min-w-0 space-y-8">
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-foreground leading-tight drop-shadow-2xl italic">
                        {project.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-10">
                        <div className="bg-indigo-600/10 px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-wide text-indigo-500 border border-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.05)]">
                            {project.status === 'completed' ? 'READY ✨' : (project.status || 'processing').toUpperCase()}
                        </div>
                        {project.language && (
                            <div className="bg-secondary px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-wide text-muted-foreground border border-border">
                                {project.language.toUpperCase()}
                            </div>
                        )}
                        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/40 italic">
                            CREATED {new Date(project.createdAt || '').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase()}
                        </span>
                        {project.statusDescription?.includes('Refining') && (
                            <div className="flex items-center gap-3 animate-pulse bg-indigo-500/10 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-500 border border-indigo-500/20">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                                Refining in background...
                            </div>
                        )}
                    </div>
                </div>

                {project.youtubeUrl && (
                    <a
                        href={project.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-card/40 px-12 py-8 rounded-[2rem] text-xs font-black uppercase tracking-wide flex items-center gap-5 group hover:bg-red-500/5 hover:border-red-500/20 hover:text-red-500 transition-all shadow-2xl border border-border"
                    >
                        <span className="text-3xl group-hover:scale-125 transition-transform duration-500">📽️</span>
                        VIEW VIDEO
                    </a>
                )}
            </div>

            {/* Error Message */}
            {project.status === 'failed' && project.errorMessage && (
                <div className="space-y-12">
                    <Card variant="glass" className="p-16 text-center border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.05)] relative overflow-hidden group">
                        <div className="text-7xl mb-12">⚠️</div>
                        <h3 className="text-3xl font-black text-red-500 uppercase tracking-tighter mb-6 leading-none">Something went wrong</h3>
                        <p className="text-muted-foreground text-xl font-bold max-w-lg mx-auto leading-relaxed">We couldn't process this video. Please try again.</p>
                    </Card>

                    {project.transcript && (
                        <div className="max-w-md mx-auto">
                            <GenerateTimestampsButton
                                projectId={project.id}
                                hasTranscript={!!project.transcript}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Processing State */}
            {project.status === 'processing' && (
                <div className="p-32 rounded-[4rem] glass text-center flex flex-col items-center justify-center relative overflow-hidden shadow-2xl border-border">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500/10 animate-pulse" />
                    <div className="w-40 h-40 rounded-[2.5rem] glass-darker flex items-center justify-center mb-16 relative border border-border/50">
                        <div className="absolute inset-0 rounded-[2.5rem] border-4 border-indigo-500/10 animate-ping" />
                        <span className="text-6xl animate-bounce">🧵</span>
                    </div>
                    <h3 className="text-4xl font-black uppercase tracking-tighter mb-6 text-foreground leading-none">Understanding your video</h3>
                    <p className="text-muted-foreground text-lg font-bold opacity-60 max-w-md uppercase tracking-wide">Almost done...</p>
                </div>
            )}

            {/* Timestamps Output */}
            {project.status === 'completed' && projectTimestamps.length > 0 && (
                <div className="space-y-16">
                    <div className="flex items-center gap-8 px-8">
                        <div className="w-16 h-2 bg-indigo-600 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.3)]" />
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black uppercase tracking-wide text-foreground">Your Timestamps</h2>
                            <p className="text-xs font-bold text-muted-foreground/40 uppercase tracking-wide">Ready to use in your video</p>
                        </div>
                    </div>
                    <TimestampOutput
                        projectId={project.id}
                        timestamps={projectTimestamps}
                    />
                </div>
            )}

            {/* Empty Timestamps State */}
            {project.status === 'completed' && projectTimestamps.length === 0 && project.transcript && (
                <div className="glass p-24 rounded-[4rem] text-center shadow-2xl space-y-12 border-border">
                    <div className="space-y-6">
                        <h3 className="text-4xl font-black uppercase tracking-tighter text-foreground">Checking video</h3>
                        <p className="text-muted-foreground text-xl font-bold opacity-60 max-w-md mx-auto leading-relaxed">Getting audio from video...</p>
                    </div>
                    <div className="max-w-md mx-auto">
                        <GenerateTimestampsButton
                            projectId={project.id}
                            hasTranscript={!!project.transcript}
                        />
                    </div>
                </div>
            )}

            {/* Transcript Preview */}
            {project.transcript && (
                <div className="space-y-16">
                    <div className="flex items-center gap-8 px-8">
                        <div className="w-16 h-2 bg-purple-600 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black uppercase tracking-wide text-foreground">Master Video Record</h2>
                            <p className="text-xs font-bold text-muted-foreground/40 uppercase tracking-wide">Original timestamps and descriptions</p>
                        </div>
                    </div>
                    <Card variant="darker" className="p-16 border-border shadow-inner group">
                        <div className="max-h-[800px] overflow-y-auto pr-12 custom-scrollbar">
                            <p className="text-lg font-bold text-muted-foreground/20 leading-loose whitespace-pre-wrap group-hover:text-muted-foreground/80 transition-all duration-1000">
                                {project.transcript}
                            </p>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
