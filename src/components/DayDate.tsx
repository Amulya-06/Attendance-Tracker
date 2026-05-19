import { Day, type TDay } from "@/enums/Days"

const days: TDay[] = [
    Day.Sunday, Day.Monday, Day.Tuesday, Day.Wednesday,
    Day.Thursday, Day.Friday, Day.Saturday
]

/**
 * Given an optional YYYY-MM-DD string, returns { day, date, dateInstance }.
 * Falls back to today if not provided or invalid.
 */
export function getDayDate(dateParam?: string | null): {
    day: TDay
    date: string
    dateInstance: Date
} {
    let dateInstance: Date

    if (dateParam) {
        // Parse YYYY-MM-DD without timezone shift
        const [y, m, d] = dateParam.split("-").map(Number)
        const parsed = new Date(y, m - 1, d)
        // Validate
        dateInstance = isNaN(parsed.getTime()) ? new Date() : parsed
    } else {
        dateInstance = new Date()
    }

    const dateToday = String(dateInstance.getDate()).padStart(2, "0")
    const monthToday = String(dateInstance.getMonth() + 1).padStart(2, "0")
    const date = `${dateToday}/${monthToday}/${dateInstance.getFullYear()}`
    const day = days[dateInstance.getDay()]

    return { date, day, dateInstance }
}

interface DayDateProps {
    /** YYYY-MM-DD — if provided, shows that date instead of today */
    dateParam?: string | null
}

function DayDate({ dateParam }: DayDateProps = {}) {
    const { day, date, dateInstance } = getDayDate(dateParam)

    const isToday = (() => {
        const t = new Date()
        return (
            dateInstance.getDate() === t.getDate() &&
            dateInstance.getMonth() === t.getMonth() &&
            dateInstance.getFullYear() === t.getFullYear()
        )
    })()

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <h1
                    className="text-3xl font-bold tracking-tight leading-none"
                    style={{ color: "var(--app-text-primary)" }}
                >
                    {day}
                </h1>
                {!isToday && (
                    <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{
                            background: "var(--app-accent-bg)",
                            color: "var(--app-accent-text)",
                            border: "1px solid var(--app-accent-border)",
                        }}
                    >
                        selected
                    </span>
                )}
            </div>
            <p
                className="text-xs font-mono mt-1.5 tracking-widest"
                style={{ color: "var(--app-text-faint)" }}
            >
                {date}
            </p>
        </div>
    )
}

export default DayDate