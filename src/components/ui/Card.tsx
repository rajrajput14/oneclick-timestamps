import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'darker';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
    const variants = {
        default: "bg-card text-card-foreground border-border shadow-sm",
        glass: "bg-card/40 backdrop-blur-3xl border-border/50 shadow-xl",
        darker: "bg-background/20 backdrop-blur-2xl border-border/30",
    };

    return (
        <div
            className={cn(
                "rounded-[2rem] border transition-all duration-300",
                variants[variant],
                className
            )}
            {...props}
        />
    );
}
