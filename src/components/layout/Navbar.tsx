'use client';

import { UserButton, useUser, SignInButton, SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
    const { isSignedIn, user, isLoaded } = useUser();
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menu when route changes
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    const navLinks = [
        { name: 'Dashboard', href: '/dashboard', protected: true },
        { name: 'Pricing', href: '/pricing', protected: false },
        { name: 'Billing', href: '/dashboard/billing', protected: true },
    ];

    return (
        <nav className={`sticky top-0 z-50 transition-all duration-500 px-4 py-4`}>
            <div className={`max-w-7xl mx-auto glass rounded-[1.5rem] md:rounded-[2rem] px-4 md:px-8 py-3 md:py-4 flex justify-between items-center transition-all ${scrolled ? 'shadow-xl' : ''}`}>
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 md:gap-3 group">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                        <span className="text-white font-black text-sm md:text-xl uppercase">OT</span>
                    </div>
                    <span className="text-lg md:text-xl font-black tracking-tighter bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent sm:block">
                        OneClick
                    </span>
                </Link>

                {/* Nav links - Desktop */}
                <div className="hidden md:flex items-center gap-2">
                    {navLinks.map((link) => (
                        (!link.protected || isSignedIn) && (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${pathname === link.href
                                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                    }`}
                            >
                                {link.name}
                            </Link>
                        )
                    ))}
                </div>

                {/* Actions & Hamburger */}
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden sm:block">
                        <ThemeToggle />
                    </div>

                    {isLoaded && (
                        isSignedIn ? (
                            <div className="p-1 rounded-full border border-border">
                                <UserButton
                                    afterSignOutUrl="/"
                                    appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8 md:w-9 md:h-9' } }}
                                />
                            </div>
                        ) : (
                            <div className="hidden sm:flex items-center gap-3">
                                <SignInButton mode="modal">
                                    <button className="px-4 md:px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all">
                                        Sign In
                                    </button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <button className="bg-primary text-primary-foreground px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                                        Join
                                    </button>
                                </SignUpButton>
                            </div>
                        )
                    )}

                    {/* Hamburger Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 rounded-xl glass-darker text-foreground hover:bg-secondary transition-all active:scale-95"
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="md:hidden fixed inset-x-4 top-24 z-40 animate-in slide-in-from-top duration-300">
                    <div className="glass rounded-[2rem] p-6 shadow-2xl border border-white/10 flex flex-col gap-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Navigation</span>
                            <div className="sm:hidden">
                                <ThemeToggle />
                            </div>
                        </div>

                        {navLinks.map((link) => (
                            (!link.protected || isSignedIn) && (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${pathname === link.href
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'glass-darker text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            )
                        ))}

                        {!isSignedIn && !isLoaded && (
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <SignInButton mode="modal">
                                    <button className="w-full py-4 rounded-2xl glass-darker text-xs font-black uppercase tracking-widest text-foreground">
                                        Sign In
                                    </button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg">
                                        Join
                                    </button>
                                </SignUpButton>
                            </div>
                        )}

                        {/* Mobile Auth (Visible only if not handled by UserButton or Hidden desktop buttons) */}
                        {!isSignedIn && isLoaded && (
                            <div className="grid grid-cols-2 gap-4 mt-2 sm:hidden">
                                <SignInButton mode="modal">
                                    <button className="w-full py-4 rounded-2xl glass-darker text-xs font-black uppercase tracking-widest text-foreground">
                                        Sign In
                                    </button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg">
                                        Join
                                    </button>
                                </SignUpButton>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
