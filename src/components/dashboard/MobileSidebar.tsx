'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CreditCard, FolderOpen, X, LogOut } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';

export default function MobileSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const pathname = usePathname();

    const links = [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Projects', href: '/dashboard', icon: FolderOpen, exact: true },
        { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    ];

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Close on body click when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-500 lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Sidebar Content */}
            <aside
                className={`fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-card/95 backdrop-blur-xl z-[70] shadow-2xl border-r border-white/10 transition-transform duration-500 ease-in-out lg:hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="p-8 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-black text-xl uppercase">OT</span>
                        </div>
                        <span className="text-xl font-black tracking-tighter">OneClick</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
                    <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-6">Workspace Navigation</p>
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={onClose}
                                className={`flex items-center gap-4 p-5 rounded-[1.5rem] transition-all relative ${isActive
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20'
                                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent'
                                    }`}
                            >
                                <Icon size={22} className="shrink-0" />
                                <span className="text-sm font-black uppercase tracking-widest">{link.name}</span>
                                {isActive && (
                                    <div className="absolute right-6 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-8 border-t border-white/5 space-y-6">
                    <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 mb-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-400 mb-2">Pro Tip</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">Long press a project card to select multiple items for bulk deletion.</p>
                    </div>

                    <SignOutButton>
                        <button className="w-full flex items-center gap-4 p-4 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-black uppercase tracking-widest text-xs">
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </SignOutButton>
                </div>
            </aside>
        </>
    );
}
