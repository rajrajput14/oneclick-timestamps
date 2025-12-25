'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CreditCard, FolderOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DashboardSidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth < 1024) setIsCollapsed(true);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const links = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Projects', href: '/dashboard', icon: FolderOpen, exact: true },
        { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    ];

    if (isMobile) {
        // Mobile Bottom Tab Bar (better for mobile than a sidebar)
        return (
            <div className="lg:hidden fixed bottom-6 inset-x-6 z-50">
                <div className="glass rounded-2xl p-2 shadow-2xl border border-white/10 flex justify-around items-center">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-muted-foreground'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">{link.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <aside
            className={`hidden lg:flex flex-col h-full glass-darker rounded-[2.5rem] p-6 transition-all duration-500 border border-white/5 relative group ${isCollapsed ? 'w-24' : 'w-72'
                }`}
        >
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-4 top-10 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95"
            >
                {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>

            <div className="flex flex-col gap-3 mt-8">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`flex items-center gap-4 p-4 rounded-2xl transition-all relative group/link ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                                }`}
                        >
                            <Icon size={22} className="shrink-0" />
                            {!isCollapsed && (
                                <span className="text-sm font-black uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                                    {link.name}
                                </span>
                            )}
                            {isCollapsed && (
                                <div className="absolute left-20 bg-foreground text-background text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg opacity-0 pointer-events-none group-hover/link:opacity-100 transition-opacity whitespace-nowrap z-50">
                                    {link.name}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>

            <div className="mt-auto p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                {!isCollapsed ? (
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Pro Tip</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">Use keyboard shortcuts to quickly navigate between projects.</p>
                    </div>
                ) : (
                    <div className="flex justify-center text-indigo-400">⚡</div>
                )}
            </div>
        </aside>
    );
}
