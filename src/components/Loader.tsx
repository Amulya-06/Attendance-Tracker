function Loader() {
    return (
        <div
            className="flex flex-col items-center justify-center py-32"
            style={{ minHeight: "50vh" }}
        >
            <div className="relative flex items-center justify-center mb-6">
                <div
                    className="absolute w-16 h-16 rounded-full animate-ping"
                    style={{ background: "var(--app-accent)", opacity: 0.08, animationDuration: "1.6s" }}
                />
                <div
                    className="absolute w-11 h-11 rounded-full animate-ping"
                    style={{ background: "var(--app-accent)", opacity: 0.13, animationDuration: "1.6s", animationDelay: "0.25s" }}
                />
                <div
                    className="relative w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                        background: "var(--app-accent)",
                        boxShadow: "0 0 24px color-mix(in oklch, var(--app-accent) 40%, transparent)",
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                        <rect x="3" y="5" width="16" height="14" rx="3" stroke="white" strokeWidth="1.8" />
                        <path d="M3 9h16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M7 3v4M15 3v4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                        <circle cx="8" cy="13.5" r="1.2" fill="white" fillOpacity="0.9" />
                        <circle cx="11" cy="13.5" r="1.2" fill="white" fillOpacity="0.5" />
                        <circle cx="14" cy="13.5" r="1.2" fill="white" fillOpacity="0.5" />
                    </svg>
                </div>
            </div>
            <div className="flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "var(--app-accent)", opacity: 0.65, animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }} />
                ))}
            </div>
        </div>
    )
}

export default Loader