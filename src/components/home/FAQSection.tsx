'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
    {
        question: "How long does it take to generate timestamps?",
        answer: "Most videos are processed in under 2 minutes. We use Google's Gemini 1.5 Pro to analyze your content in real-time. You can watch the progress live on your dashboard."
    },
    {
        question: "Which languages do you support?",
        answer: "We support over 50 languages including English, Spanish, French, German, Japanese, and Hindi. Our AI automatically detects the language spoken in your video."
    },
    {
        question: "Is there a limit to video length?",
        answer: "Free users can process videos up to 20 minutes long. Creator and Pro plans support much longer durations of up to 4 hours per video."
    },
    {
        question: "Can I edit the generated timestamps?",
        answer: "Absolutely! Once the timestamps are generated, you can refine titles, adjust times, or add new chapters directly from the project editor before exporting to YouTube."
    }
];

export function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="max-w-4xl mx-auto py-32 px-4">
            <div className="text-center mb-20">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-darker text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6">
                    <HelpCircle className="w-3 h-3" />
                    Support & Info
                </div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground">
                    Frequently Asked <span className="italic text-indigo-500">Questions</span>
                </h2>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, i) => {
                    const isOpen = openIndex === i;
                    return (
                        <div
                            key={i}
                            className={`glass rounded-[2rem] overflow-hidden transition-all duration-500 border border-white/5 ${isOpen ? 'bg-indigo-600/5 shadow-2xl' : 'hover:bg-secondary/30'
                                }`}
                        >
                            <button
                                onClick={() => setOpenIndex(isOpen ? null : i)}
                                className="w-full px-8 py-8 flex items-center justify-between text-left group"
                            >
                                <span className={`text-lg font-bold uppercase tracking-tight transition-colors duration-300 ${isOpen ? 'text-indigo-500' : 'text-foreground'
                                    }`}>
                                    {faq.question}
                                </span>
                                <ChevronDown className={`w-5 h-5 transition-transform duration-500 ${isOpen ? 'rotate-180 text-indigo-500' : 'text-muted-foreground/50 group-hover:text-foreground'
                                    }`} />
                            </button>

                            <div className={`transition-all duration-500 ease-in-out px-8 overflow-hidden ${isOpen ? 'max-h-60 pb-8 opacity-100' : 'max-h-0 opacity-0'
                                }`}>
                                <p className="text-muted-foreground font-medium leading-relaxed text-sm">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
