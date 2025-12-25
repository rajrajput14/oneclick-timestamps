'use client';

import Navbar from '@/components/layout/Navbar';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import Link from 'next/link';
import { CHECKOUT_LINKS } from '../../../config/urls';
import { getCheckoutUrl } from '@/lib/payments/lemonsqueezy';

export default function PricingClient() {
    const { isSignedIn, user } = useUser();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const handleCheckout = (url: string, metadata: any = {}) => {
        if (!isSignedIn) {
            window.location.href = '/sign-in';
            return;
        }
        window.location.href = getCheckoutUrl(url, user!.id, metadata);
    };

    const plans = [
        {
            name: 'Free',
            price: '0',
            description: 'Try it for free',
            features: [
                '60 minutes total',
                'Perfect timestamps',
                'All languages included'
            ],
            cta: 'Start Free',
            ctaHref: isSignedIn ? '/dashboard' : '/sign-up',
            highlighted: false
        },
        {
            name: 'Creator',
            price: billingCycle === 'monthly' ? '299' : '3299',
            period: billingCycle === 'monthly' ? '/mo' : '/yr',
            description: 'For active creators',
            features: [
                billingCycle === 'monthly' ? '500 minutes per month' : '6,000 minutes per year',
                'Priority processing',
                'Premium support',
                'Unlimited projects'
            ],
            cta: 'Upgrade to Creator',
            checkoutUrl: CHECKOUT_LINKS.creator,
            metadata: {
                plan_name: 'Creator',
                minutes_limit: billingCycle === 'monthly' ? 500 : 6000
            },
            highlighted: true
        },
        {
            name: 'Pro Creator',
            price: billingCycle === 'monthly' ? '899' : '9599',
            period: billingCycle === 'monthly' ? '/mo' : '/yr',
            description: 'For power users',
            features: [
                billingCycle === 'monthly' ? '1,500 minutes per month' : '18,000 minutes per year',
                'Fastest AI models',
                'Early access to features',
                'Personalized help'
            ],
            cta: 'Upgrade to Pro',
            checkoutUrl: CHECKOUT_LINKS.pro,
            metadata: {
                plan_name: 'Pro Creator',
                minutes_limit: billingCycle === 'monthly' ? 1500 : 18000
            },
            highlighted: false
        }
    ];

    const addons = [
        { name: '+100 Minutes', price: '79', checkoutUrl: CHECKOUT_LINKS.addon_100, metadata: { minutes: 100, type: 'addon' } },
        { name: '+500 Minutes', price: '299', checkoutUrl: CHECKOUT_LINKS.addon_500, metadata: { minutes: 500, type: 'addon' } },
        { name: '+1000 Minutes', price: '549', checkoutUrl: CHECKOUT_LINKS.addon_1000, metadata: { minutes: 1000, type: 'addon' } }
    ];

    return (
        <div className="min-h-screen bg-transparent selection:bg-indigo-500/30 pb-24">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 pt-24 text-center">
                <div className="inline-block px-6 py-2 rounded-full glass pricing-badge uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-12 shadow-sm">
                    Pricing
                </div>

                <h1 className="pricing-hero-heading mb-16 text-foreground drop-shadow-sm">
                    Simple pricing for <span className="text-indigo-600 dark:text-indigo-400 italic">creators</span>
                </h1>
                <p className="text-xl text-muted-foreground mb-20">Pay only for what you use. No hidden charges.</p>

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
                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className={`p-12 rounded-[3rem] glass transition-all duration-500 hover:-translate-y-2 flex flex-col items-center relative overflow-hidden ${plan.highlighted ? 'border-2 border-indigo-500/30 shadow-2xl' : 'shadow-xl'
                                }`}
                        >
                            {plan.highlighted && <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px]" />}

                            <h3 className="pricing-plan-title mb-4 relative z-10">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-6 relative z-10">
                                <span className="pricing-amount drop-shadow-sm">₹{plan.price}</span>
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

                            {plan.name === 'Free' ? (
                                <Link
                                    href={plan.ctaHref || '/dashboard'}
                                    className={`w-full py-5 rounded-2xl text-center pricing-cta uppercase tracking-widest transition-all relative z-10 shadow-lg ${plan.highlighted
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
                                        : 'glass-darker text-foreground hover:bg-secondary'
                                        }`}
                                >
                                    {plan.cta}
                                </Link>
                            ) : (
                                <button
                                    onClick={() => handleCheckout(plan.checkoutUrl || '', plan.metadata)}
                                    className={`w-full py-5 rounded-2xl pricing-cta uppercase tracking-widest transition-all relative z-10 shadow-lg ${plan.highlighted
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
                                        : 'glass-darker text-foreground hover:bg-secondary'
                                        }`}
                                >
                                    {plan.cta}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add-ons Section */}
                <div className="mt-32 pb-24">
                    <div className="inline-block px-6 py-2 rounded-full glass pricing-badge uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-12 shadow-sm">
                        Extra Minutes
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter text-foreground mb-16">
                        Add-on <span className="text-indigo-600 dark:text-indigo-400 italic">Credit Packs</span>
                    </h2>

                    <div className="grid sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {addons.map((addon, idx) => (
                            <div key={idx} className="p-10 rounded-[2.5rem] glass hover:-translate-y-2 transition-all duration-500 shadow-xl flex flex-col items-center">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">One-time purchase</p>
                                <h3 className="text-2xl font-black tracking-tighter text-foreground mb-6">{addon.name}</h3>
                                <div className="text-5xl font-black tracking-tighter mb-8 text-foreground">₹{addon.price}</div>
                                <button
                                    onClick={() => handleCheckout(addon.checkoutUrl, addon.metadata)}
                                    className="w-full py-4 rounded-xl glass-darker text-xs font-black uppercase tracking-widest hover:bg-secondary transition-all shadow-md"
                                >
                                    Buy Now
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="mt-12 text-muted-foreground text-sm font-medium">Add-on minutes never expire and are used after plan minutes.</p>
                </div>
            </main>
        </div>
    );
}
