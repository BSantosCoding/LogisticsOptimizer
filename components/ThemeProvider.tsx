import React, { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../services/supabase"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    )

    useEffect(() => {
        const root = window.document.documentElement

        root.classList.remove("light", "dark")

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark"
                : "light"

            root.classList.add(systemTheme)
            return
        }

        root.classList.add(theme)
    }, [theme])

    // Sync from Supabase on load/auth
    useEffect(() => {
        const fetchPreferences = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('theme')
                    .eq('id', userId)
                    .single();

                if (data?.theme && !error) {
                    setTheme(data.theme as Theme);
                }
            } catch (e) {
                console.error("Failed to fetch theme preference", e);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchPreferences(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        theme,
        setTheme: async (newTheme: Theme) => {
            localStorage.setItem(storageKey, newTheme)
            setTheme(newTheme)

            // Persist to Supabase if logged in
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                supabase
                    .from('profiles')
                    .update({ theme: newTheme })
                    .eq('id', session.user.id)
                    .then(({ error }) => {
                        if (error) console.error("Failed to save theme preference:", error);
                    });
            }
        },
    }

    return (
        <ThemeProviderContext.Provider value={value} {...props}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}

const props = {}
