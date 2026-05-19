import { NavLink } from "react-router-dom"
import { Home, BookOpen, CalendarDays, ClipboardCheck } from "lucide-react"
import { Day, type TDay } from "@/enums/Days"

const days: TDay[] = [
    Day.Sunday,
    Day.Monday,
    Day.Tuesday,
    Day.Wednesday,
    Day.Thursday,
    Day.Friday,
    Day.Saturday
]

const today = days[new Date().getDay()]

const tabs = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/courses", icon: BookOpen, label: "Courses" },
    { to: `/schedule?day=${today}`, icon: CalendarDays, label: "Schedule" },
    { to: "/attendance", icon: ClipboardCheck, label: "Attendance" },
]

function BottomNav() {
    return (
        <nav
            className="fixed left-1/2 z-40 w-[min(calc(100%-1rem),42rem)] -translate-x-1/2 backdrop-blur-xl"
            style={{
                bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
                background: "color-mix(in oklch, var(--app-bg-elevated) 84%, transparent)",
                border: "1px solid var(--app-border)",
                borderRadius: "1.5rem",
                boxShadow: "0 18px 50px color-mix(in oklch, var(--app-accent) 14%, transparent)",
                paddingBottom: "env(safe-area-inset-bottom)",
            }}
        >
            <div className="flex items-center justify-around px-2 py-2">
                {tabs.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end
                        className="group flex flex-col items-center gap-1 px-4 py-1.5 transition-all duration-200"
                    >
                        {({ isActive }) => (
                            <>
                                <div
                                    className="relative rounded-2xl p-2 transition-all duration-200"
                                    style={{
                                        background: isActive ? "var(--app-accent-bg)" : "transparent",
                                        border: isActive
                                            ? "1px solid var(--app-accent-border)"
                                            : "1px solid transparent",
                                        boxShadow: isActive
                                            ? "0 10px 28px color-mix(in oklch, var(--app-accent) 22%, transparent)"
                                            : "none",
                                    }}
                                >
                                    {isActive && (
                                        <span
                                            className="absolute inset-x-2 -top-1 h-0.5 rounded-full"
                                            style={{ background: "var(--app-accent)" }}
                                        />
                                    )}
                                    <Icon
                                        className="w-5 h-5 transition-colors duration-200"
                                        style={{
                                            color: isActive
                                                ? "var(--app-accent)"
                                                : "var(--app-text-faint)",
                                        }}
                                    />
                                </div>
                                <span
                                    className="text-[10px] font-semibold tracking-[0.16em] uppercase transition-colors duration-200"
                                    style={{
                                        color: isActive
                                            ? "var(--app-accent)"
                                            : "var(--app-text-faint)",
                                    }}
                                >
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    )
}

export default BottomNav
