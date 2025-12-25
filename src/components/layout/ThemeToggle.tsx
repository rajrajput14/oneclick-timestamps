"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="p-3 w-10 h-10 rounded-xl glass animate-pulse" />
    }

    const isDark = resolvedTheme === "dark"

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-3 rounded-xl glass text-indigo-500 dark:text-indigo-400 flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-sm"
            aria-label="Toggle theme"
        >
            {isDark ? (
                <Sun className="h-5 w-5 animate-in zoom-in duration-300" />
            ) : (
                <Moon className="h-5 w-5 animate-in zoom-in duration-300" />
            )}
        </button>
    )
}
