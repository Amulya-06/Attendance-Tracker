import { useEffect, useRef, useState } from "react"
import { db, type ICourse } from "../db"
import { useSettings } from "../context/SettingsContext"
import { Calendar } from "@/components/ui/calendar"
import { ClipboardCheck, BookOpen, ChevronLeft, Check, X } from "lucide-react"
import type { DayEventHandler } from "react-day-picker"
import PageHeader from "@/components/PageHeader"
import useTitle from "@/hooks/useTitle"

interface PopoverPos { top: number; left: number }

interface CourseWithPct {
    course: ICourse
    pct: number | null
}

// Vibrant fixed colors — same across light/dark
const V = {
    present: "#22c55e",
    absent: "#f43f5e",
    ongoing: "#f59e0b",
}

function ringColor(pct: number | null, minAttendance: number) {
    if (pct === null) return "var(--app-border)"
    if (pct >= minAttendance) return V.present
    if (pct >= minAttendance - 10) return V.ongoing
    return V.absent
}

// Circular ring
function AttendanceRing({ pct, size = 44, stroke = 3.5, minAttendance = 75 }: {
    pct: number | null; size?: number; stroke?: number; minAttendance?: number
}) {
    const radius = (size - stroke) / 2
    const circ = 2 * Math.PI * radius
    const filled = pct !== null ? (pct / 100) * circ : 0
    const color = ringColor(pct, minAttendance)

    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke}
                    style={{ stroke: "var(--app-border)" }} />
                {pct !== null && (
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={`${filled} ${circ}`}
                        style={{ stroke: color, transition: "stroke-dasharray 0.4s ease" }} />
                )}
            </svg>
            <span className="relative z-10 font-bold font-mono leading-none"
                style={{ fontSize: size <= 44 ? "10px" : "12px", color }}>
                {pct !== null ? `${pct}%` : "—"}
            </span>
        </div>
    )
}

function Attendance() {
    useTitle("Attendance")
    const { settings } = useSettings()
    const [coursesWithPct, setCoursesWithPct] = useState<CourseWithPct[] | null>(null)
    const [selectedCourse, setSelectedCourse] = useState<ICourse | null>(null)
    const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({})
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [popoverPos, setPopoverPos] = useState<PopoverPos>({ top: 0, left: 0 })
    const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
    const calendarRef = useRef<HTMLDivElement>(null)
    const popoverRef = useRef<HTMLDivElement>(null)
    const [initializing, setInitializing] = useState(true)

    // Load all courses + compute their attendance pct
    useEffect(() => {
        const load = async () => {
            const courses = await db.courses.toArray()
            const withPct: CourseWithPct[] = await Promise.all(
                courses.map(async course => {
                    if (!course.id) return { course, pct: null }
                    const records = await db.attendance.where("courseId").equals(course.id).toArray()
                    const marked = records.filter(r => r.status === "present" || r.status === "absent")
                    if (marked.length === 0) return { course, pct: null }
                    const present = marked.filter(r => r.status === "present").length
                    return { course, pct: Math.round((present / marked.length) * 100) }
                })
            )
            setCoursesWithPct(withPct)
            setInitializing(false)
        }
        load()
    }, [])

    // Load attendance for selected course
    useEffect(() => {
        if (!selectedCourse?.id) return
        db.attendance.where("courseId").equals(selectedCourse.id).toArray().then(records => {
            const map: Record<string, "present" | "absent"> = {}
            records.forEach(r => { if (r.status) map[r.date] = r.status })
            setAttendance(map)
        })
    }, [selectedCourse])

    // Close popover on outside click
    useEffect(() => {
        if (!popoverOpen) return
        const handler = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                calendarRef.current && !calendarRef.current.contains(e.target as Node)
            ) {
                setPopoverOpen(false)
                setSelectedDate(null)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [popoverOpen])

    const dateKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

    const handleDayClick: DayEventHandler<React.MouseEvent> = (day, _modifiers, e) => {
        setSelectedDate(day)
        const btn = e.currentTarget as HTMLElement
        const calRect = calendarRef.current?.getBoundingClientRect()
        const btnRect = btn.getBoundingClientRect()
        if (calRect) {
            const MENU_W = 164
            const top = btnRect.bottom - calRect.top + 6
            let left = btnRect.left - calRect.left + btnRect.width / 2 - MENU_W / 2
            left = Math.max(4, Math.min(left, calRect.width - MENU_W - 4))
            setPopoverPos({ top, left })
        }
        setPopoverOpen(true)
    }

    // Update attendance + refresh the pct in the course list
    const refreshCoursePct = (courseId: number, updatedAttendance: Record<string, "present" | "absent">) => {
        const marked = Object.values(updatedAttendance)
        const pct = marked.length === 0 ? null
            : Math.round(marked.filter(v => v === "present").length / marked.length * 100)
        setCoursesWithPct(prev =>
            prev!.map(c => c.course.id === courseId ? { ...c, pct } : c)
        )
    }

    const setStatus = async (status: "present" | "absent") => {
        if (!selectedDate || !selectedCourse?.id) return
        const key = dateKey(selectedDate)
        const existing = await db.attendance
            .where("courseId").equals(selectedCourse.id)
            .filter(r => r.date === key).first()
        if (existing?.id) {
            await db.attendance.update(existing.id, { status })
        } else {
            await db.attendance.add({ courseId: selectedCourse.id, date: key, status })
        }
        const updated = { ...attendance, [key]: status }
        setAttendance(updated)
        refreshCoursePct(selectedCourse.id, updated)
        setPopoverOpen(false)
        setSelectedDate(null)
    }

    const clearStatus = async () => {
        if (!selectedDate || !selectedCourse?.id) return
        const key = dateKey(selectedDate)
        await db.attendance
            .where("courseId").equals(selectedCourse.id)
            .filter(r => r.date === key).delete()
        const updated = { ...attendance }
        delete updated[key]
        setAttendance(updated)
        refreshCoursePct(selectedCourse.id, updated)
        setPopoverOpen(false)
        setSelectedDate(null)
    }

    const presentDates = Object.entries(attendance).filter(([, v]) => v === "present").map(([k]) => new Date(k))
    const absentDates = Object.entries(attendance).filter(([, v]) => v === "absent").map(([k]) => new Date(k))
    const presentCount = presentDates.length
    const absentCount = absentDates.length
    const total = presentCount + absentCount
    const pct = total > 0 ? Math.round((presentCount / total) * 100) : null
    const minRatio = settings.minAttendance / 100
    const bunkable = total > 0 ? Math.max(0, Math.floor(presentCount / minRatio - total)) : null
    const needToAttend = pct !== null && pct < settings.minAttendance
        ? Math.ceil((minRatio * total - presentCount) / (1 - minRatio)) : 0

    const currentStatus = selectedDate ? attendance[dateKey(selectedDate)] : undefined

    const pctColor = ringColor(pct, settings.minAttendance)
    const barColor = pct === null ? "var(--app-border)" : pctColor

    if (initializing) return null

    return (
        <div className="px-4 pt-6 pb-4">
            <PageHeader
                eyebrow="Attendance"
                eyebrowIcon={<ClipboardCheck className="w-3.5 h-3.5" />}
                title={
                    <div className="flex items-center gap-3">
                        {selectedCourse && (
                            <button
                                onClick={() => { setSelectedCourse(null); setAttendance({}); setPopoverOpen(false); setSelectedDate(null) }}
                                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all app-btn-ghost"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--app-text-primary)" }}>
                            {selectedCourse ? selectedCourse.name : "Attendance"}
                        </h1>
                    </div>
                }
            />

            {/* Step 1 — Course picker */}
            {!selectedCourse ? (
                <div className="space-y-2">
                    <p className="app-section-label mb-3">Select a course</p>
                    {coursesWithPct === null ? null : coursesWithPct.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-3xl flex items-center justify-center mb-5"
                                style={{ background: "var(--app-bg-muted)", border: "1px solid var(--app-border)" }}>
                                <BookOpen className="w-6 h-6" style={{ color: "var(--app-text-faint)" }} />
                            </div>
                            <p className="text-sm font-medium" style={{ color: "var(--app-text-secondary)" }}>No courses found</p>
                            <p className="text-xs mt-1" style={{ color: "var(--app-text-faint)" }}>Add courses in the <strong>Courses</strong> tab first.</p>
                        </div>
                    ) : (
                        coursesWithPct!.map(({ course, pct: coursePct }) => (
                            <button
                                key={course.id}
                                onClick={() => setSelectedCourse(course)}
                                className="w-full text-left rounded-2xl transition-all duration-200"
                                style={{ background: "var(--app-bg-card)", border: "1px solid var(--app-border)" }}
                                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.currentTarget.style.borderColor = "var(--app-accent-border)"
                                    e.currentTarget.style.background = "var(--app-accent-bg)"
                                }}
                                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.currentTarget.style.borderColor = "var(--app-border)"
                                    e.currentTarget.style.background = "var(--app-bg-card)"
                                }}
                            >
                                <div className="px-4 py-3 flex items-center gap-3">
                                    <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center"
                                        style={{ background: "var(--app-accent-bg)", border: "1px solid var(--app-accent-border)" }}>
                                        <BookOpen className="w-4 h-4" style={{ color: "var(--app-accent)" }} />
                                    </div>
                                    <span className="flex-1 text-sm font-semibold text-left" style={{ color: "var(--app-text-primary)" }}>
                                        {course.name}
                                    </span>
                                    {/* Attendance ring on the right */}
                                    <AttendanceRing pct={coursePct} size={44} stroke={3.5} minAttendance={settings.minAttendance} />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            ) : (
                <div>
                    {/* Calendar card */}
                    <div
                        ref={calendarRef}
                        className="rounded-2xl p-4 mb-4 relative"
                        style={{ background: "var(--app-bg-card)", border: "1px solid var(--app-border)" }}
                    >
                        <Calendar
                            mode="single"
                            month={calendarMonth}
                            onMonthChange={m => { setCalendarMonth(m); setSelectedDate(null); setPopoverOpen(false) }}
                            selected={selectedDate ?? undefined}
                            onSelect={setSelectedDate}
                            modifiers={{ present: presentDates, absent: absentDates }}
                            required={true}
                            onDayClick={handleDayClick}
                        />

                        {/* Floating menu anchored to clicked day */}
                        {popoverOpen && selectedDate && (
                            <div ref={popoverRef}
                                className="absolute z-50 rounded-2xl overflow-hidden"
                                style={{
                                    top: popoverPos.top,
                                    left: popoverPos.left,
                                    width: "164px",
                                    background: "var(--app-bg-elevated)",
                                    border: "1px solid var(--app-border-mid)",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)",
                                }}>
                                <div className="p-1 flex flex-col gap-0.5">
                                    {!currentStatus && (<>
                                        <button onClick={() => setStatus("present")}
                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all"
                                            style={{ color: "var(--status-present-text)" }}
                                            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "var(--status-present-bg)"}
                                            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "transparent"}>
                                            <Check className="w-3.5 h-3.5 shrink-0" /> Present
                                        </button>
                                        <button onClick={() => setStatus("absent")}
                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all"
                                            style={{ color: "var(--status-absent-text)" }}
                                            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "var(--status-absent-bg)"}
                                            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "transparent"}>
                                            <X className="w-3.5 h-3.5 shrink-0" /> Absent
                                        </button>
                                    </>)}
                                    {currentStatus === "present" && (<>
                                        <button onClick={() => setStatus("absent")}
                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all"
                                            style={{ color: "var(--status-absent-text)" }}
                                            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "var(--status-absent-bg)"}
                                            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "transparent"}>
                                            <X className="w-3.5 h-3.5 shrink-0" /> Absent
                                        </button>
                                        <div style={{ height: "1px", background: "var(--app-border)", margin: "2px 0" }} />
                                        <button onClick={clearStatus}
                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all"
                                            style={{ color: "var(--status-clear-text)" }}
                                            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "var(--status-clear-bg)"}
                                            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "transparent"}>
                                            <X className="w-3 h-3 shrink-0 opacity-60" /> Clear
                                        </button>
                                    </>)}
                                    {currentStatus === "absent" && (<>
                                        <button onClick={() => setStatus("present")}
                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all"
                                            style={{ color: "var(--status-present-text)" }}
                                            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "var(--status-present-bg)"}
                                            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "transparent"}>
                                            <Check className="w-3.5 h-3.5 shrink-0" /> Present
                                        </button>
                                        <div style={{ height: "1px", background: "var(--app-border)", margin: "2px 0" }} />
                                        <button onClick={clearStatus}
                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all"
                                            style={{ color: "var(--status-clear-text)" }}
                                            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "var(--status-clear-bg)"}
                                            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "transparent"}>
                                            <X className="w-3 h-3 shrink-0 opacity-60" /> Clear
                                        </button>
                                    </>)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mb-4">
                        {[
                            { bg: "var(--status-present-bg)", border: "var(--status-present-border)", label: "Present" },
                            { bg: "var(--status-absent-bg)", border: "var(--status-absent-border)", label: "Absent" },
                            { bg: "var(--app-accent-bg)", border: "var(--app-accent-border)", label: "Today" },
                        ].map(({ bg, border, label }) => (
                            <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--app-text-faint)" }}>
                                <span className="w-3 h-3 rounded-md" style={{ background: bg, border: `1px solid ${border}` }} />
                                {label}
                            </div>
                        ))}
                    </div>

                    {/* Stats card */}
                    <div className="rounded-2xl overflow-hidden"
                        style={{ background: "var(--app-bg-card)", border: "1px solid var(--app-border)" }}>

                        {/* Progress bar header */}
                        <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--app-border)" }}>
                            <div className="flex items-end justify-between mb-2">
                                <span className="app-section-label mb-0">Attendance</span>
                                <span className="text-xl font-black font-mono" style={{ color: pctColor }}>
                                    {pct !== null ? `${pct}%` : "—"}
                                </span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--app-bg-muted)" }}>
                                <div className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct ?? 0}%`, background: barColor }} />
                            </div>
                            <div className="flex justify-between mt-1.5">
                                <span className="text-[10px]" style={{ color: "var(--app-text-faint)" }}>0%</span>
                                <span className="text-[10px]" style={{ color: "var(--app-text-faint)" }}>Min: {settings.minAttendance}%</span>
                                <span className="text-[10px]" style={{ color: "var(--app-text-faint)" }}>100%</span>
                            </div>
                        </div>

                        {/* 2×2 grid */}
                        <div className="grid grid-cols-2" style={{ borderBottom: "1px solid var(--app-border)" }}>
                            {[
                                { label: "Present", value: presentCount, color: V.present },
                                { label: "Percentage", value: pct !== null ? `${pct}%` : "—", color: pctColor },
                                { label: "Absent", value: absentCount, color: V.absent },
                                {
                                    label: needToAttend > 0 ? "Need to attend" : "Can bunk",
                                    value: total === 0 ? "—" : `${needToAttend > 0 ? needToAttend : (bunkable ?? 0)}`,
                                    color: needToAttend > 0 ? V.absent : bunkable === 0 ? V.ongoing : V.present,
                                },
                            ].map(({ label, value, color }, i) => (
                                <div key={label}
                                    className="flex justify-between items-center px-4 py-3.5"
                                    style={{
                                        borderRight: i % 2 === 0 ? "1px solid var(--app-border)" : "none",
                                        borderTop: i >= 2 ? "1px solid var(--app-border)" : "none",
                                    }}>
                                    <p className="text-xs" style={{ color: "var(--app-text-faint)" }}>{label}</p>
                                    <p className="text-xl font-bold font-mono" style={{ color }}>{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="px-4 py-3.5 flex items-center justify-between">
                            <p className="text-xs" style={{ color: "var(--app-text-faint)" }}>Total classes marked</p>
                            <p className="text-xl font-bold font-mono" style={{ color: "var(--app-accent)" }}>{total}</p>
                        </div>
                    </div>

                    {needToAttend > 0 && (
                        <div className="mt-3 px-4 py-3 rounded-2xl"
                            style={{ background: "var(--status-absent-bg)", border: "1px solid var(--status-absent-border)" }}>
                            <p className="text-xs text-center" style={{ color: "var(--status-absent-text)" }}>
                                Attend <span className="font-bold">{needToAttend}</span> more classes to meet {settings.minAttendance}% criteria
                            </p>
                        </div>
                    )}
                    {bunkable !== null && bunkable > 0 && (
                        <div className="mt-3 px-4 py-3 rounded-2xl"
                            style={{ background: "var(--status-present-bg)", border: "1px solid var(--status-present-border)" }}>
                            <p className="text-xs text-center" style={{ color: "var(--status-present-text)" }}>
                                You can skip up to <span className="font-bold">{bunkable}</span> class{bunkable !== 1 ? "es" : ""} and still meet {settings.minAttendance}%
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default Attendance