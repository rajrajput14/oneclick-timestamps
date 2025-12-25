'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import Navbar from '@/components/layout/Navbar';

export default function HomeClient() {
    const { isSignedIn } = useUser();

    return (
        <div className="min-h-screen bg-transparent selection:bg-indigo-500/30 font-outfit">
            <Navbar />

            <main className="relative z-10 px-4">
                {/* Hero Section */}
                <section className="max-w-5xl mx-auto pt-32 pb-24 text-center">
                    <div className="inline-block px-6 py-2 rounded-full glass text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-12 shadow-sm">
                        AI Content Intelligence
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-10 leading-[1.1] text-foreground">
                        Generate YouTube <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500 dark:from-indigo-400 dark:to-purple-400">Timestamps</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-16 font-medium leading-relaxed">
                        The ultimate glass-smooth experience for YouTube creators. Automate your metadata with precision AI and transparency.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Link
                            href={isSignedIn ? '/dashboard' : '/sign-up'}
                            className="w-full sm:w-auto px-12 py-5 bg-indigo-600 text-white text-base font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                        >
                            Get Started Free
                        </Link>
                        <Link
                            href="/pricing"
                            className="w-full sm:w-auto px-12 py-5 glass rounded-2xl text-base font-black uppercase tracking-widest text-foreground hover:bg-secondary transition-all active:scale-95"
                        >
                            View Pricing
                        </Link>
                    </div>
                </section>

                {/* Features Grid - Clean Glass Cards */}
                <section className="max-w-7xl mx-auto py-32">
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: '🌍',
                                title: 'Multi-Language',
                                text: 'Universal detection across 50+ languages with perfect semantic understanding.'
                            },
                            {
                                icon: '⚡',
                                title: 'Gemini 1.5 Pro',
                                text: 'Harness the depth of Google’s most advanced models for your content.'
                            },
                            {
                                icon: '🪄',
                                title: 'Magic Format',
                                text: 'Instant one-click exports perfectly tailored for the YouTube description box.'
                            }
                        ].map((fea, i) => (
                            <div key={i} className="p-10 rounded-[2.5rem] glass text-center group hover:-translate-y-2 transition-all duration-500 shadow-lg hover:shadow-2xl">
                                <div className="w-16 h-16 glass-darker rounded-2xl flex items-center justify-center text-3xl mx-auto mb-8 transition-transform group-hover:scale-110">
                                    {fea.icon}
                                </div>
                                <h3 className="text-xl font-black mb-4 uppercase tracking-tighter">{fea.title}</h3>
                                <p className="text-muted-foreground text-sm font-medium leading-relaxed">{fea.text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Bottom CTA */}
                <section className="max-w-5xl mx-auto py-32">
                    <div className="glass p-16 rounded-[4rem] text-center relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full" />

                        <h2 className="text-4xl md:text-6xl font-black mb-10 tracking-tighter relative z-10">
                            Create with <span className="text-indigo-600 dark:text-indigo-400 italic">Clarity.</span>
                        </h2>
                        <Link
                            href={isSignedIn ? '/dashboard' : '/sign-up'}
                            className="inline-block px-12 py-6 bg-foreground text-background text-base font-black uppercase tracking-widest rounded-2xl relative z-10 hover:opacity-90 active:scale-95 transition-all shadow-xl"
                        >
                            Ready to Start
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="py-20 text-center relative border-t border-border mt-32">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">Made for creators. Built for speed.</p>
            </footer>
        </div>
    );
}
