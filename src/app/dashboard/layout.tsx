'use client';

import Navbar from '@/components/layout/Navbar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-transparent text-foreground transition-all duration-500 selection:bg-indigo-500/30 font-outfit" suppressHydrationWarning>
            <Navbar />

            {/* Main Content Container - subtle glass shell */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="glass-darker shadow-2xl rounded-[3rem] p-10 md:p-16 min-h-[85vh] border border-white/5 relative overflow-hidden">
                    <div className="absolute -left-40 -top-40 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
                    <div className="absolute -right-40 -bottom-40 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

                    <div className="relative z-10">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
