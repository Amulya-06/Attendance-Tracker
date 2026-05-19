import { useEffect, useState } from "react"
import { db, type ISchedule } from "../db"
import { getDayDate } from "../components/DayDate"
import DayDate from "../components/DayDate"
import { Clock, Sparkles } from "lucide-react"
import PageHeader from "../components/PageHeader"
import useTitle from "@/hooks/useTitle"
import { Link, useSearchParams } from "react-router-dom"

interface Schedule {
    name: string
    scheduleData: ISchedule
}

const convertToSeconds = (time: string) => {
    const [hour, minute] = time.split(":").map(Number)
    return hour * 3600 + minute * 60
}

const checkForClassStatus = (startTime: string, endTime: string, now: Date, date: string) => {
    if(date) {
        const [y, m, d] = date.split("-").map(Number)
        const parsed = new Date(y, m - 1, d)
        if(parsed.toLocaleDateString() !== now.toLocaleDateString()) {
            if(parsed.getTime() > now.getTime()) return "Pending"
            else if(parsed.getTime() < now.getTime()) return "Finished"
        }
    }
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
    const startSec = convertToSeconds(startTime)
    const endSec = convertToSeconds(endTime)
    if (endSec > startSec) {
        if (nowSec < startSec) return "Pending"
        if (nowSec >= startSec && nowSec < endSec) return "Ongoing"
        return "Finished"
    }
    if (endSec < startSec) {
        if (nowSec >= startSec || nowSec < endSec) return "Ongoing"
        return "Pending"
    }
    if (nowSec === startSec) return "Ongoing"
    return "Finished"
}

type Status = "Ongoing" | "Pending" | "Finished"

const statusConfig: Record<Status, {
    borderColor: string
    badgeBg: string
    badgeBorder: string
    badgeText: string
    dotColor: string
    cardBg: string
    cardBorder: string
    dotPulse: boolean
    opacity: string
}> = {
    Ongoing: {
        borderColor: "var(--status-ongoing-border)",
        badgeBg: "var(--status-ongoing-bg)",
        badgeBorder: "var(--status-ongoing-border)",
        badgeText: "var(--status-ongoing-text)",
        dotColor: "var(--status-ongoing-text)",
        cardBg: "var(--status-ongoing-bg)",
        cardBorder: "var(--status-ongoing-border)",
        dotPulse: true,
        opacity: "1",
    },
    Pending: {
        borderColor: "var(--app-border-mid)",
        badgeBg: "var(--app-bg-muted)",
        badgeBorder: "var(--app-border)",
        badgeText: "var(--app-text-muted)",
        dotColor: "var(--app-text-faint)",
        cardBg: "var(--app-bg-card)",
        cardBorder: "var(--app-border)",
        dotPulse: false,
        opacity: "1",
    },
    Finished: {
        borderColor: "var(--status-present-border)",
        badgeBg: "var(--status-present-bg)",
        badgeBorder: "var(--status-present-border)",
        badgeText: "var(--status-present-text)",
        dotColor: "var(--status-present-text)",
        cardBg: "var(--app-bg-card)",
        cardBorder: "var(--app-border)",
        dotPulse: false,
        opacity: "0.55",
    },
}

function Home() {
    useTitle("AttendEase")
    const [searchParams] = useSearchParams()
    const dateParam = searchParams.get("date") // YYYY-MM-DD or null

    const [scheduleWithStatus, setScheduleWithStatus] = useState<Schedule[] | null>(null)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [initializing, setInitializing] = useState(true)

    // Derive the day name from the date param (or today)
    const { day } = getDayDate(dateParam)
    const totalClasses = scheduleWithStatus?.length ?? 0

    useEffect(() => {
        setInitializing(true)
        setScheduleWithStatus(null)
        const load = async () => {
            try {
                const scheduleData = await db.schedules.where("day").equals(day).toArray()
                const arr: Schedule[] = await Promise.all(
                    scheduleData.map(async (sch) => {
                        const course = await db.courses.get(sch.courseId)
                        return { scheduleData: sch, name: course?.name ?? "Unknown" }
                    })
                )
                setScheduleWithStatus(
                    arr.sort((a, b) =>
                        convertToSeconds(a.scheduleData.fromTime) -
                        convertToSeconds(b.scheduleData.fromTime)
                    )
                )
            } finally {
                setInitializing(false)
            }
        }
        load()
    }, [day])

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    if (initializing) return null

    return (
        <div className="px-4 pt-6 pb-4 space-y-4">
            <div
                className="overflow-hidden rounded-[1.75rem] px-4 py-4 sm:px-5"
                style={{
                    background: "linear-gradient(135deg, color-mix(in oklch, var(--app-accent) 16%, var(--app-bg-card)), var(--app-bg-card))",
                    border: "1px solid var(--app-border)",
                    boxShadow: "0 18px 48px rgba(0, 0, 0, 0.06)",
                }}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="app-section-label">Today at a glance</p>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--app-text-primary)" }}>
                            Keep your day in view
                        </h1>
                        <p className="mt-2 max-w-md text-sm leading-6" style={{ color: "var(--app-text-secondary)" }}>
                            Track what is happening now, what comes next, and jump to any date without losing context.
                        </p>
                    </div>
                    <div
                        className="shrink-0 rounded-2xl px-3 py-2 text-right"
                        style={{
                            background: "var(--app-bg-elevated)",
                            border: "1px solid var(--app-border)",
                        }}
                    >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--app-text-faint)" }}>
                            Classes
                        </p>
                        <p className="text-xl font-bold" style={{ color: "var(--app-text-primary)" }}>
                            {totalClasses}
                        </p>
                    </div>
                </div>
            </div>

            <PageHeader
                eyebrow="Today's Classes"
                eyebrowIcon={<Sparkles className="w-3.5 h-3.5" />}
                title={<DayDate dateParam={dateParam} />}
            />

            {scheduleWithStatus === null ? null : scheduleWithStatus.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center rounded-[1.75rem] px-5 py-20 text-center"
                    style={{
                        background: "color-mix(in oklch, var(--app-bg-card) 86%, transparent)",
                        border: "1px solid var(--app-border)",
                    }}
                >
                    <div
                        className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl"
                        style={{
                            background: "var(--app-accent-bg)",
                            border: "1px solid var(--app-border)",
                        }}
                    >
                        <Sparkles className="w-7 h-7" style={{ color: "var(--app-accent)" }} />
                    </div>
                    <h1 className="mb-1 text-lg font-bold" style={{ color: "var(--app-text-primary)" }}>
                        No classes {dateParam ? "on this day" : "today"}
                    </h1>
                    <p className="text-sm" style={{ color: "var(--app-text-faint)" }}>
                        {dateParam ? "Nothing scheduled for this date." : "Enjoy your free day."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {scheduleWithStatus.map((item, index) => {
                        const status = checkForClassStatus(item.scheduleData.fromTime, item.scheduleData.toTime, currentTime, dateParam!) as Status
                        const cfg = statusConfig[status]

                        return (
                            <Link
                                key={item.scheduleData.id}
                                to={`/courses/${item.scheduleData.id}?date=${dateParam}`}
                                className="block"
                            >
                                <div
                                    className="overflow-hidden rounded-[1.5rem] transition-all duration-300"
                                    style={{
                                        background: "color-mix(in oklch, var(--app-bg-card) 88%, transparent)",
                                        border: `1px solid ${cfg.cardBorder}`,
                                        boxShadow: `inset 5px 0 0 ${cfg.borderColor}, 0 8px 24px rgba(0, 0, 0, 0.04)`,
                                        opacity: cfg.opacity,
                                    }}
                                >
                                    <div className="px-4 py-3.5">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span
                                                    className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-xs font-mono"
                                                    style={{
                                                        background: "var(--app-bg-muted)",
                                                        border: "1px solid var(--app-border)",
                                                        color: "var(--app-text-faint)",
                                                    }}
                                                >
                                                    {String(index + 1).padStart(2, "0")}
                                                </span>
                                                <span
                                                    className="font-semibold truncate text-sm"
                                                    style={{ color: "var(--app-text-primary)" }}
                                                >
                                                    {item.name}
                                                </span>
                                            </div>
                                            <span
                                                className="shrink-0 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5"
                                                style={{
                                                    background: cfg.badgeBg,
                                                    border: `1px solid ${cfg.badgeBorder}`,
                                                    color: cfg.badgeText,
                                                }}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${cfg.dotPulse ? "animate-pulse" : ""}`}
                                                    style={{ background: cfg.dotColor }}
                                                />
                                                {status}
                                            </span>
                                        </div>
                                        <div
                                            className="mt-2 ml-9 flex items-center gap-1.5 text-xs"
                                            style={{ color: "var(--app-text-faint)" }}
                                        >
                                            <Clock className="w-3 h-3" />
                                            <span className="font-mono">
                                                {item.scheduleData.fromTime}
                                                <span className="mx-1.5" style={{ color: "var(--app-border-strong)" }}>–</span>
                                                {item.scheduleData.toTime}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default Home