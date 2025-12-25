'use client';

import { UserButton, useUser, SignInButton, SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';

export default function Navbar() {
    const { isSignedIn, user, isLoaded } = useUser();
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Dashboard', href: '/dashboard', protected: true },
        { name: 'Pricing', href: '/pricing', protected: false },
        { name: 'Billing', href: '/dashboard/billing', protected: true },
    ];

    return (
        <nav className={`sticky top-0 z-50 transition-all duration-500 px-4 py-4`}>
            <div className={`max-w-7xl mx-auto glass rounded-[2rem] px-8 py-4 flex justify-between items-center transition-all ${scrolled ? 'shadow-xl' : ''}`}>
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                        <span className="text-white font-black text-xl">OT</span>
                    </div>
                    <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent hidden sm:block">
                        OneClick
                    </span>
                </Link>

                {/* Nav links */}
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

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <ThemeToggle />

                    {isLoaded && (
                        isSignedIn ? (
                            <div className="p-1 rounded-full border border-border">
                                <UserButton
                                    afterSignOutUrl="/"
                                    appearance={{ elements: { userButtonAvatarBox: 'w-9 h-9' } }}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <SignInButton mode="modal">
                                    <button className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all">
                                        Sign In
                                    </button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <button className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                                        Get Started
                                    </button>
                                </SignUpButton>
                            </div>
                        )
                    )}
                </div>
            </div>
        </nav>
    );
}
