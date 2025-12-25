import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    loading?: boolean;
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, asChild = false, children, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"

        const variants = {
            primary: "bg-indigo-600 text-white shadow-[0_8px_30px_rgb(79,70,229,0.3)] hover:bg-indigo-500 hover:shadow-[0_8px_30px_rgb(79,70,229,0.4)]",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
            outline: "border-2 border-indigo-600/20 bg-transparent text-indigo-500 hover:bg-indigo-600/10",
            ghost: "hover:bg-accent text-muted-foreground hover:text-foreground",
            danger: "bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20",
        }

        const sizes = {
            sm: "h-11 px-6 rounded-xl text-sm font-bold",
            md: "h-14 px-8 rounded-2xl text-base font-bold",
            lg: "h-16 px-12 rounded-[1.5rem] text-lg font-extrabold",
            icon: "h-12 w-12 rounded-xl",
        }

        return (
            <Comp
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap uppercase tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                disabled={loading || props.disabled}
                {...props}
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Processing</span>
                    </div>
                ) : (
                    children
                )}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button }
