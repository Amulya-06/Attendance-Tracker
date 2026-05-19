import { useEffect, useState } from "react"

function SplashScreen({ onDone }: { onDone: () => void }) {
    const [phase, setPhase] = useState<"in" | "hold" | "out">("in")

    useEffect(() => {
        const t1 = setTimeout(() => setPhase("hold"), 400)
        const t2 = setTimeout(() => setPhase("out"), 1200)
        const t3 = setTimeout(() => onDone(), 1600)
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        }
    }, [onDone])

    return (
        <div
            className="fixed inset-0 z-999 flex flex-col items-center justify-center"
            style={{
                background: "var(--app-bg)",
                opacity: phase === "out" ? 0 : 1,
                transition: phase === "out" ? "opacity 0.4s ease" : "none",
                pointerEvents: "none",
            }}
        >
            {/* Icon */}
            <div
                style={{
                    transform: phase === "in" ? "scale(0.7)" : "scale(1)",
                    opacity: phase === "in" ? 0 : 1,
                    transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
                }}
            >
                {/* Glow ring */}
                <div className="relative flex items-center justify-center">
                    <div
                        className="absolute rounded-full"
                        style={{
                            width: 96,
                            height: 96,
                            background: "var(--app-accent)",
                            opacity: 0.12,
                            filter: "blur(20px)",
                        }}
                    />
                    {/* App icon tile */}
                    <div
                        className="relative flex items-center justify-center"
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 22,
                            background: "var(--app-accent)",
                            boxShadow: "0 8px 32px color-mix(in oklch, var(--app-accent) 45%, transparent), 0 2px 8px rgba(0,0,0,0.15)",
                        }}
                    >
                        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                            {/* Calendar body */}
                            <rect x="5" y="9" width="28" height="24" rx="5" stroke="white" strokeWidth="2.2" />
                            {/* Header fill */}
                            <rect x="5" y="9" width="28" height="10" rx="5" fill="white" fillOpacity="0.18" />
                            <rect x="5" y="14" width="28" height="5" fill="white" fillOpacity="0.18" />
                            {/* Divider */}
                            <path d="M5 19h28" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
                            {/* Binder pins */}
                            <path d="M13 5v8M25 5v8" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                            {/* Dots grid */}
                            <circle cx="13" cy="26" r="2" fill="#4ade80" />
                            <circle cx="19" cy="26" r="2" fill="white" fillOpacity="0.45" />
                            <circle cx="25" cy="26" r="2" fill="white" fillOpacity="0.45" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* App name */}
            <div
                className="mt-6 text-center"
                style={{
                    opacity: phase === "in" ? 0 : 1,
                    transform: phase === "in" ? "translateY(8px)" : "translateY(0)",
                    transition: "opacity 0.4s ease 0.15s, transform 0.4s ease 0.15s",
                }}
            >
                <p
                    className="text-xl font-bold tracking-tight"
                    style={{ color: "var(--app-text-primary)" }}
                >
                    AttendEase
                </p>
                <p
                    className="text-xs mt-1"
                    style={{ color: "var(--app-text-faint)" }}
                >
                    Your schedule, your attendance
                </p>
            </div>

            {/* Subtle loading bar at bottom */}
            <div
                className="absolute bottom-16 left-8 right-8 rounded-full overflow-hidden"
                style={{
                    height: 2,
                    background: "var(--app-border)",
                    opacity: phase === "in" ? 0 : 1,
                    transition: "opacity 0.3s ease 0.3s",
                }}
            >
                <div
                    className="h-full rounded-full"
                    style={{
                        background: "var(--app-accent)",
                        width: phase === "hold" || phase === "out" ? "100%" : "0%",
                        transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s",
                    }}
                />
            </div>
        </div>
    )
}

export default SplashScreen