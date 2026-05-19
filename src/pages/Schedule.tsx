import React, { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { db, type ISchedule, type ICourse } from "../db"
import { Day, type TDay } from "../enums/Days"
import {
    CalendarDays, Clock, Plus, Pencil, Trash2, Check, X, AlertCircle, ChevronLeft, ChevronRight
} from "lucide-react"
import PageHeader from "@/components/PageHeader"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
} from "@/components/ui/dialog"
import useTitle from "@/hooks/useTitle"

const days: TDay[] = [
    Day.Sunday,
    Day.Monday,
    Day.Tuesday,
    Day.Wednesday,
    Day.Thursday,
    Day.Friday,
    Day.Saturday
]

function Schedule() {
    useTitle("Schedule")
    const [searchParams, setSearchParams] = useSearchParams()

    const getDayFromParams = (): TDay => {
        const day = searchParams.get("day")
        return Object.values(Day).includes(day as TDay) ? (day as TDay) : Day.Monday
    }

    const [today, setToday] = useState<TDay>(getDayFromParams())
    const dayIndex = days.indexOf(today)

    const [allCourses, setAllCourses] = useState<ICourse[]>([])
    const [schedules, setSchedules] = useState<ISchedule[] | null>(null)
    const [courseMap, setCourseMap] = useState<Record<number, ICourse>>({})

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)

    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
    const [customCourseName, setCustomCourseName] = useState("")
    const [showCourseDropdown, setShowCourseDropdown] = useState(false)
    const [fromTime, setFromTime] = useState("")
    const [toTime, setToTime] = useState("")
    const [error, setError] = useState("")
    const [initializing, setInitializing] = useState(true)

    const convertToMinutes = (time: string) => {
        const [hour, minute] = time.split(":").map(Number)
        return hour * 60 + minute
    }

    useEffect(() => {
        const day = searchParams.get("day")
        if (Object.values(Day).includes(day as TDay)) setToday(day as TDay)
    }, [searchParams])

    useEffect(() => {
        resetForm()
        setInitializing(true)
        const load = async () => {
            try {
                const [scheds, courses] = await Promise.all([
                    db.schedules.where("day").equals(today).toArray(),
                    db.courses.toArray()
                ])
                const map: Record<number, ICourse> = {}
                courses.forEach(c => { if (c.id !== undefined) map[c.id] = c })
                setAllCourses(courses)
                setCourseMap(map)
                setSchedules(scheds.sort((a, b) => convertToMinutes(a.fromTime) - convertToMinutes(b.fromTime)))
            } finally {
                setInitializing(false)
            }
        }
        load()
    }, [today])

    const resetForm = () => {
        setSelectedCourseId(null)
        setCustomCourseName("")
        setFromTime("")
        setToTime("")
        setEditingId(null)
        setError("")
        setShowCourseDropdown(false)
    }

    const openAddDialog = () => { resetForm(); setDialogOpen(true) }
    const openEditDialog = (sch: ISchedule) => {
        resetForm()
        setSelectedCourseId(sch.courseId)
        setFromTime(sch.fromTime)
        setToTime(sch.toTime)
        setEditingId(sch.id ?? null)
        setDialogOpen(true)
    }
    const closeDialog = () => { setDialogOpen(false); resetForm() }

    const getOrCreateCourse = async (name: string): Promise<number> => {
        const course = await db.courses.where("name").equalsIgnoreCase(name).first()
        if (!course) {
            const id = await db.courses.add({ name }) as number
            const newCourse = { id, name }
            setAllCourses(prev => [...prev, newCourse])
            setCourseMap(prev => ({ ...prev, [id]: newCourse }))
            return id
        }
        return course.id!
    }

    const getCourseName = (): string =>
        selectedCourseId ? courseMap[selectedCourseId]?.name ?? "" : customCourseName.trim()

    const validate = async (): Promise<boolean> => {
        const name = getCourseName()
        if (!name) { setError("Please select or enter a course"); return false }
        if (!fromTime) { setError("Start time is required"); return false }
        if (!toTime) { setError("End time is required"); return false }
        if (convertToMinutes(fromTime) >= convertToMinutes(toTime)) {
            setError("End time must be after start time"); return false
        }
        const newStart = convertToMinutes(fromTime)
        const newEnd = convertToMinutes(toTime)
        for (const s of schedules!) {
            if (s.id === editingId) continue
            if (newStart < convertToMinutes(s.toTime) && newEnd > convertToMinutes(s.fromTime)) {
                const c = courseMap[s.courseId]
                setError(`Clashes with ${c?.name ?? "another class"} (${s.fromTime}–${s.toTime})`)
                return false
            }
        }
        return true
    }

    const handleSubmit = async () => {
        setError("")
        if (!await validate()) return
        const courseId = await getOrCreateCourse(getCourseName())

        if (editingId) {
            const schedule = schedules!.find(s => s.id === editingId)
            if (!schedule) return
            const updated: ISchedule = { ...schedule, courseId, fromTime, toTime }
            await db.schedules.update(schedule.id!, updated)
            setSchedules(prev =>
                prev!.map(s => s.id === schedule.id ? updated : s)
                    .sort((a, b) => convertToMinutes(a.fromTime) - convertToMinutes(b.fromTime))
            )
        } else {
            const newSch: ISchedule = { courseId, day: today, fromTime, toTime }
            const id = await db.schedules.add(newSch)
            setSchedules(prev =>
                [...prev!, { ...newSch, id }].sort((a, b) => convertToMinutes(a.fromTime) - convertToMinutes(b.fromTime))
            )
        }
        setCourseMap(prev => ({ ...prev, [courseId]: { id: courseId, name: getCourseName() } }))
        closeDialog()
    }

    const handleDelete = async (sch: ISchedule) => {
        if (sch.id !== undefined) await db.schedules.delete(sch.id)
        setSchedules(prev => prev!.filter(s => s.id !== sch.id))
    }

    const filteredCourses = allCourses.filter(c =>
        c.name.toLowerCase().includes(customCourseName.toLowerCase())
    )
    const selectedCourseName = selectedCourseId ? courseMap[selectedCourseId]?.name : ""
    const isEditing = !!editingId

    const prev = () => setSearchParams({ day: days[dayIndex === 0 ? days.length - 1 : dayIndex - 1] })
    const next = () => setSearchParams({ day: days[dayIndex === days.length - 1 ? 0 : dayIndex + 1] })

    const DayNavigator = (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
                <button onClick={prev} className="rounded-lg flex items-center justify-center transition-all"
                    style={{ background: "var(--app-bg-muted)", border: "1px solid var(--app-border)", color: "var(--app-text-muted)" }}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight capitalize"
                    style={{ color: "var(--app-text-primary)" }}>{today}</h1>
                <button onClick={next} className="rounded-lg flex items-center justify-center transition-all"
                    style={{ background: "var(--app-bg-muted)", border: "1px solid var(--app-border)", color: "var(--app-text-muted)" }}>
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="flex items-center justify-center gap-1.5">
                {days.map((day, i) => (
                    <button key={day} onClick={() => setSearchParams({ day })}
                        className="rounded-full transition-all duration-200"
                        style={{
                            width: i === dayIndex ? "20px" : "6px",
                            height: "6px",
                            background: i === dayIndex ? "var(--app-accent)" : "var(--app-border-mid)",
                        }} />
                ))}
            </div>
        </div>
    )

    if (initializing) return null

    return (
        <div className="px-4 pt-6 pb-4 flex flex-col min-h-[calc(100vh-5rem)]">
            <PageHeader
                eyebrow="Schedule"
                eyebrowIcon={<CalendarDays className="w-3.5 h-3.5" />}
                title={DayNavigator}
            />

            {/* Schedule list */}
            <div className="flex-1 mb-6">
                {schedules === null ? null : schedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-14 h-14 rounded-3xl flex items-center justify-center mb-5"
                            style={{ background: "var(--app-bg-muted)", border: "1px solid var(--app-border)" }}>
                            <CalendarDays className="w-6 h-6" style={{ color: "var(--app-text-faint)" }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: "var(--app-text-secondary)" }}>No classes for {today}</p>
                        <p className="text-xs mt-1" style={{ color: "var(--app-text-faint)" }}>Tap the button below to add a class.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <p className="app-section-label">
                            {schedules!.length} class{schedules!.length !== 1 ? "es" : ""} scheduled
                        </p>
                        {schedules!.map((sch, index) => {
                            const course = courseMap[sch.courseId]
                            return (
                                <div key={sch.id}
                                    className="rounded-2xl px-4 py-3 transition-all duration-200"
                                    style={{ background: "var(--app-bg-card)", border: "1px solid var(--app-border)" }}>
                                    <div className="flex items-center gap-3">
                                        <span className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono"
                                            style={{ background: "var(--app-bg-muted)", border: "1px solid var(--app-border)", color: "var(--app-text-faint)" }}>
                                            {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate" style={{ color: "var(--app-text-primary)" }}>
                                                {course?.name}
                                            </p>
                                            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--app-text-faint)" }}>
                                                {sch.fromTime}
                                                <span className="mx-1" style={{ color: "var(--app-border-strong)" }}>–</span>
                                                {sch.toTime}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => openEditDialog(sch)}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                                style={{ color: "var(--app-text-faint)" }}
                                                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "var(--status-ongoing-text)"; e.currentTarget.style.background = "var(--status-ongoing-bg)" }}
                                                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "var(--app-text-faint)"; e.currentTarget.style.background = "transparent" }}>
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(sch)}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                                style={{ color: "var(--app-text-faint)" }}
                                                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "var(--status-absent-text)"; e.currentTarget.style.background = "var(--status-absent-bg)" }}
                                                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "var(--app-text-faint)"; e.currentTarget.style.background = "transparent" }}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Full-width Add Schedule button pinned at bottom */}
            <button
                onClick={openAddDialog}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all app-btn-primary"
            >
                <Plus className="w-4 h-4" /> Add Schedule
            </button>

            {/* shadcn Dialog — viewport-centered, keyboard-safe */}
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeDialog(); else setDialogOpen(true) }}>
                <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
                <DialogContent
                    className="w-[calc(100vw-2rem)] max-w-sm rounded-3xl p-0 gap-0 border-0"
                    style={{
                        background: "var(--app-bg-elevated)",
                        border: "1px solid var(--app-border-mid)",
                        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
                    }}
                >
                    {/* Header */}
                    <DialogHeader
                        className="flex flex-row items-center justify-between px-5 pt-3 pb-2"
                        style={{ borderBottom: "1px solid var(--app-border)" }}
                    >
                        <DialogTitle
                            className="text-base font-bold"
                            style={{ color: "var(--app-text-primary)" }}
                        >
                            {isEditing ? "Edit Class" : "New Class"}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Body */}
                    <div className="px-4 pt-3 pb-5 space-y-4">
                        {/* Course selector */}
                        <div className="space-y-1.5 relative">
                            <label className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: "var(--app-text-faint)" }}>Course</label>

                            {selectedCourseId ? (
                                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
                                    style={{ background: "var(--app-bg-input)", border: "1.5px solid var(--app-border-mid)" }}>
                                    <span className="flex-1 text-sm font-medium" style={{ color: "var(--app-text-primary)" }}>
                                        {selectedCourseName}
                                    </span>
                                    <button onClick={() => setSelectedCourseId(null)}
                                        style={{ color: "var(--app-text-faint)" }}>
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={customCourseName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setCustomCourseName(e.target.value); setShowCourseDropdown(true) }}
                                        onFocus={() => setShowCourseDropdown(true)}
                                        placeholder="Search or type a course name…"
                                        className="app-input"
                                    />
                                    {showCourseDropdown && (filteredCourses.length > 0 || customCourseName) && (
                                        <div className="mt-1.5 rounded-xl overflow-hidden shadow-xl"
                                            style={{ background: "var(--app-bg-elevated)", border: "1px solid var(--app-border-mid)" }}>
                                            {filteredCourses.map(c => (
                                                <button key={c.id}
                                                    onMouseDown={() => { setSelectedCourseId(c.id!); setCustomCourseName(""); setShowCourseDropdown(false) }}
                                                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                                                    style={{ color: "var(--app-text-primary)" }}
                                                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "var(--app-bg-muted)"}
                                                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = "transparent"}>
                                                    {c.name}
                                                </button>
                                            ))}
                                            {customCourseName.trim().length > 0 && !filteredCourses.find(c => c.name.toLowerCase() === customCourseName.toLowerCase()) && (
                                                <div className="px-4 py-2.5 text-xs"
                                                    style={{ color: "var(--app-text-faint)", borderTop: "1px solid var(--app-border)" }}>
                                                    Will create "{customCourseName}" as new course
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Times */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "From", value: fromTime, onChange: setFromTime },
                                { label: "To", value: toTime, onChange: setToTime },
                            ].map(({ label, value, onChange }) => (
                                <div key={label} className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                                        style={{ color: "var(--app-text-faint)" }}>
                                        <Clock className="w-3 h-3" /> {label}
                                    </label>
                                    <input type="time" value={value}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                                        className="app-input font-mono"
                                        style={{ colorScheme: "auto" }} />
                                </div>
                            ))}
                        </div>

                        {error && (
                            <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-sm"
                                style={{ background: "var(--status-absent-bg)", border: "1px solid var(--status-absent-border)", color: "var(--status-absent-text)" }}>
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                            style={{
                                background: isEditing ? "var(--status-ongoing-bg)" : "var(--app-accent)",
                                border: `1px solid ${isEditing ? "var(--status-ongoing-border)" : "var(--app-accent)"}`,
                                color: isEditing ? "var(--status-ongoing-text)" : "#fff",
                            }}
                        >
                            {isEditing
                                ? <><Check className="w-4 h-4" /> Save changes</>
                                : <><Plus className="w-4 h-4" /> Add class</>
                            }
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default Schedule