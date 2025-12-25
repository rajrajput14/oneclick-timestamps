import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    const variants = {
        default: "bg-primary/10 text-primary border-primary/20",
        success: "bg-green-500/10 text-green-500 border-green-500/20",
        warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        error: "bg-red-500/10 text-red-500 border-red-500/20",
        info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        outline: "border-border text-foreground hover:bg-accent",
    };

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
                variants[variant],
                className
            )}
            {...props}
        />
    );
}
