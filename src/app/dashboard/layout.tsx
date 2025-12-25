'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import MobileSidebar from '@/components/dashboard/MobileSidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-transparent text-foreground transition-all duration-500 selection:bg-indigo-500/30 font-outfit" suppressHydrationWarning>
            <Navbar
                onMenuClick={() => setIsSidebarOpen(true)}
                showDefaultMobileMenu={false}
            />

            {/* Main Dashboard Wrapper */}
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-12 min-h-[90vh]">
                {/* Main Content Hub - the primary glass shell */}
                <main className="glass-darker shadow-2xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 lg:p-16 border border-white/5 relative overflow-hidden h-full">
                    {/* Atmospheric Blurs */}
                    <div className="absolute -left-40 -top-40 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
                    <div className="absolute -right-40 -bottom-40 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

                    <div className="relative z-10 h-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile-only Slide-in Sidebar */}
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </div>
    );
}
