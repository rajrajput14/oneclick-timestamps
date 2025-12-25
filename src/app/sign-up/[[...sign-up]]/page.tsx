import { SignUp } from '@clerk/nextjs'
import Navbar from '@/components/layout/Navbar'

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex flex-col font-outfit" suppressHydrationWarning>
            <Navbar />
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
                {/* Decorative blurs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full -z-10 animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full -z-10 animate-pulse" style={{ animationDelay: '2s' }} />

                <div className="w-full max-w-md space-y-8 flex flex-col items-center">
                    <div className="text-center mb-4">
                        <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">Join OneClick</h1>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Create your creator hub</p>
                    </div>

                    <div className="glass p-8 rounded-[2.5rem] shadow-2xl relative">
                        <SignUp
                            fallbackRedirectUrl="/dashboard"
                            appearance={{
                                elements: {
                                    rootBox: "mx-auto",
                                    card: "bg-transparent shadow-none border-none p-0",
                                    headerTitle: "hidden",
                                    headerSubtitle: "hidden",
                                    formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-sm font-black uppercase tracking-widest rounded-xl transition-all",
                                    footer: "bg-transparent",
                                    socialButtonsBlockButton: "glass-darker border-border/50 hover:bg-secondary transition-all",
                                    formFieldInput: "glass-darker border-border/50 rounded-xl px-4 py-3 text-foreground",
                                    dividerLine: "bg-border",
                                    dividerText: "text-muted-foreground text-[10px] font-black uppercase tracking-widest",
                                    footerActionText: "text-muted-foreground font-bold",
                                    footerActionLink: "text-indigo-600 dark:text-indigo-400 font-black hover:text-indigo-500 transition-colors"
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
