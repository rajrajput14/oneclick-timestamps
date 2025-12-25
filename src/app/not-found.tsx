import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { headers } from 'next/headers';

export default async function NotFound() {
    // Calling a dynamic function to ensure this page is never statically generated during build
    // This prevents Clerk initialization errors on build platforms like Railway
    await headers();

    return (
        <div className="min-h-screen bg-transparent selection:bg-indigo-500/30 font-outfit flex flex-col">
            <Navbar />

            <main className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
                {/* Decorative blurs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full -z-10 animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full -z-10 animate-pulse" style={{ animationDelay: '2s' }} />

                <div className="max-w-2xl w-full text-center space-y-12 relative z-10">
                    <div className="space-y-4">
                        <div className="inline-block px-6 py-2 rounded-full glass text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
                            Error 404
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground drop-shadow-sm italic">
                            Page <span className="text-indigo-600 dark:text-indigo-400">Lost.</span>
                        </h1>
                        <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-lg mx-auto">
                            The video has ended, or the link you followed is broken. Let's get you back to the hub.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link
                            href="/"
                            className="w-full sm:w-auto px-12 py-5 bg-indigo-600 text-white text-base font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                        >
                            Return Home
                        </Link>
                        <Link
                            href="/dashboard"
                            className="w-full sm:w-auto px-12 py-5 glass rounded-2xl text-base font-black uppercase tracking-widest text-foreground hover:bg-secondary transition-all active:scale-95"
                        >
                            Dashboard
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="py-20 text-center relative border-t border-border mt-32">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">OneClick Timestamps © 2025</p>
            </footer>
        </div>
    );
}
