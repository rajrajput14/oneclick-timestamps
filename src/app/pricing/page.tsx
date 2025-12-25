'use client';

import Navbar from '@/components/layout/Navbar';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import Link from 'next/link';

export default function PricingPage() {
    const { isSignedIn, user } = useUser();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const baseCheckoutUrl = 'https://raj-saas.lemonsqueezy.com/buy/8ea50f2e-496c-4129-aef5-9fa698b64070';
    const checkoutUrl = user
        ? `${baseCheckoutUrl}?checkout[email]=${encodeURIComponent(user.primaryEmailAddress?.emailAddress || '')}&checkout[custom][user_id]=${user.id}`
        : baseCheckoutUrl;

    const plans = [
        {
            name: 'Free Explorer',
            price: '0',
            description: 'For curious creators',
            features: ['3 generations / mo', 'Standard processing', 'Auto-language'],
            cta: 'Get Started',
            ctaHref: isSignedIn ? '/dashboard' : '/sign-up',
            highlighted: false
        },
        {
            name: 'Creator Pro',
            price: billingCycle === 'monthly' ? '9' : '89',
            period: billingCycle === 'monthly' ? '/mo' : '/yr',
            description: 'For power content machines',
            features: ['UNLIMITED generations', 'Priority AI processing', 'Batch support', 'Early access'],
            cta: 'Unlock Everything',
            ctaHref: checkoutUrl,
            highlighted: true
        }
    ];

    return (
        <div className="min-h-screen bg-transparent selection:bg-indigo-500/30 pb-24">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 pt-24 text-center">
                <div className="inline-block px-6 py-2 rounded-full glass pricing-badge uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-12 shadow-sm">
                    Flexible Investment
                </div>

                <h1 className="pricing-hero-heading mb-16 text-foreground drop-shadow-sm">
                    Transparent <span className="text-indigo-600 dark:text-indigo-400 italic">Value</span>
                </h1>

                {/* Billing Toggle - Glass style */}
                <div className="flex justify-center items-center gap-6 mb-20">
                    <span className={`pricing-badge uppercase tracking-widest ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
                    <button
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        className="w-20 h-10 glass-darker rounded-full p-1.5 transition-all relative group border-indigo-500/20"
                    >
                        <div className={`w-7 h-7 bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-500 shadow-md ${billingCycle === 'yearly' ? 'translate-x-10' : 'translate-x-0'}`} />
                    </button>
                    <span className={`pricing-badge uppercase tracking-widest ${billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>Yearly</span>
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className={`p-12 rounded-[3rem] glass transition-all duration-500 hover:-translate-y-2 flex flex-col items-center relative overflow-hidden ${plan.highlighted ? 'border-2 border-indigo-500/30 shadow-2xl' : 'shadow-xl'
                                }`}
                        >
                            {plan.highlighted && <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px]" />}

                            <h3 className="pricing-plan-title mb-4 relative z-10">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-6 relative z-10">
                                <span className="pricing-amount drop-shadow-sm">${plan.price}</span>
                                {plan.period && <span className="text-muted-foreground uppercase pricing-period tracking-widest">{plan.period}</span>}
                            </div>
                            <p className="pricing-description text-muted-foreground mb-12 relative z-10">{plan.description}</p>

                            <div className="w-full h-[1px] bg-border mb-12" />

                            <ul className="space-y-6 mb-16 text-left w-full relative z-10 px-4">
                                {plan.features.map((f, idx) => (
                                    <li key={idx} className="flex items-center gap-4 group">
                                        <div className="w-6 h-6 glass-darker rounded-lg flex items-center justify-center text-xs text-indigo-500 shadow-sm transition-transform group-hover:scale-110">✓</div>
                                        <span className="pricing-feature text-foreground/80">{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={plan.ctaHref}
                                className={`w-full py-5 rounded-2xl pricing-cta uppercase tracking-widest transition-all relative z-10 shadow-lg ${plan.highlighted
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
                                    : 'glass-darker text-foreground hover:bg-secondary'
                                    }`}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
