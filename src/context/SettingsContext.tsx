/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface AppSettings {
    minAttendance: number
    theme: "dark" | "light"
    fcmToken: string | null
}

const DEFAULTS: AppSettings = {
    minAttendance: 75,
    theme: "light",
    fcmToken: null,
}

const KEY = "app_settings"

const THEME_BG: Record<"light" | "dark", string> = {
    light: "#e0e8f7",
    dark: "#020205",
}

function applyTheme(theme: "dark" | "light") {
    const root = document.documentElement
    if (theme === "dark") {
        root.classList.add("dark")
        root.classList.remove("light")
    } else {
        root.classList.remove("dark")
        root.classList.add("light")
    }

    const color = THEME_BG[theme]

    document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach(el => { el.content = color })
}

const SettingsContext = createContext<{
    settings: AppSettings
    update: (patch: Partial<AppSettings>) => void
}>({ settings: DEFAULTS, update: () => { } })

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const raw = localStorage.getItem(KEY)
            return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
        } catch {
            return DEFAULTS
        }
    })

    const update = (patch: Partial<AppSettings>) => {
        setSettings(prev => {
            const next = { ...prev, ...patch }

            const prevStr = JSON.stringify(prev)
            const nextStr = JSON.stringify(next)

            if (prevStr === nextStr) return prev

            localStorage.setItem(KEY, JSON.stringify(next))
            return next
        })
    }

    useEffect(() => {
        applyTheme(settings.theme)
    }, [settings.theme])

    return (
        <SettingsContext.Provider value={{ settings, update }}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    return useContext(SettingsContext)
}