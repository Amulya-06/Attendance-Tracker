import { useEffect, useRef, useState } from "react"
import { db, type ICourse, type ISchedule } from "../db"
import PageHeader from "../components/PageHeader"
import {
    BookOpen, Plus, Trash2, Clock,
    ChevronLeft, Pencil, Check, X, AlertCircle
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
} from "@/components/ui/dialog"
import useTitle from "@/hooks/useTitle"

interface CourseWithSchedules {
    course: ICourse
    schedules: ISchedule[]
}

type View = { type: "list" } | { type: "detail"; courseId: number }

const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const groupByDay = (schedules: ISchedule[]) => {
    const grouped: Record<string, ISchedule[]> = {}
    schedules.forEach(s => {
        if (!grouped[s.day]) grouped[s.day] = []
        grouped[s.day].push(s)
    })
    return grouped
}

function Courses() {
    useTitle("Courses")
    const [items, setItems] = useState<CourseWithSchedules[] | null>(null)
    const [view, setView] = useState<View>({ type: "list" })

    const [dialogOpen, setDialogOpen] = useState(false)
    const [newName, setNewName] = useState("")
    const [addError, setAddError] = useState("")

    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState("")
    const [editError, setEditError] = useState("")
    const [initializing, setInitializing] = useState(true)

    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const courses = await db.courses.toArray()
                const schedules = await db.schedules.toArray()
                setItems(courses.map(course => ({
                    course,
                    schedules: schedules.filter(s => s.courseId === course.id),
                })))
            } finally {
                setInitializing(false)
            }
        }
        load()
    }, [])

    const openDialog = () => { setNewName(""); setAddError(""); setDialogOpen(true) }

    const handleAdd = async () => {
        const trimmed = newName.trim()
        if (!trimmed) { setAddError("Course name is required"); return }
        const exists = await db.courses.where("name").equalsIgnoreCase(trimmed).first()
        if (exists) { setAddError("Course already exists"); return }
        const id = await db.courses.add({ name: trimmed }) as number
        setItems(prev => [...prev!, { course: { id, name: trimmed }, schedules: [] }])
        setDialogOpen(false)
    }

    const handleDelete = async (courseId: number) => {
        await db.courses.delete(courseId)
        await db.schedules.where("courseId").equals(courseId).delete()
        await db.attendance.where("courseId").equals(courseId).delete()
        setItems(prev => prev!.filter(i => i.course.id !== courseId))
        if (view.type === "detail" && view.courseId === courseId) setView({ type: "list" })
    }

    const startEdit = (course: ICourse) => { setEditingId(course.id!); setEditName(course.name); setEditError("") }
    const cancelEdit = () => { setEditingId(null); setEditName(""); setEditError("") }
    const saveEdit = async (courseId: number) => {
        const trimmed = editName.trim()
        if (!trimmed) { setEditError("Name is required"); return }
        const exists = await db.courses.where("name").equalsIgnoreCase(trimmed).first()
        if (exists && exists.id !== courseId) { setEditError("Name already taken"); return }
        await db.courses.update(courseId, { name: trimmed })
        setItems(prev => prev!.map(i =>
            i.course.id === courseId ? { ...i, course: { ...i.course, name: trimmed } } : i
        ))
        cancelEdit()
    }

    // Detail view
    if (view.type === "detail") {
        const item = items!.find(i => i.course.id === view.courseId)
        if (!item) { setView({ type: "list" }); return null }
        const grouped = groupByDay(item.schedules)
        const scheduledDays = dayOrder.filter(d => grouped[d]?.length > 0)

        return (
            <div className="px-4 pt-6 pb-4">
                <PageHeader
                    eyebrow="Course Details"
                    eyebrowIcon={<BookOpen className="w-3.5 h-3.5" />}
                    title={
                        <div className="flex items-center gap-3">
                            <button onClick={() => setView({ type: "list" })}
                                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all app-btn-ghost">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--app-text-primary)" }}>
                                {item.course.name}
                            </h1>
                        </div>
                    }
                />
                {scheduledDays.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                            style={{ background: "var(--app-bg-muted)", border: "1px solid var(--app-border)" }}>
                            <Clock className="w-5 h-5" style={{ color: "var(--app-text-faint)" }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: "var(--app-text-secondary)" }}>No schedule yet</p>
                        <p className="text-xs mt-1" style={{ color: "var(--app-text-faint)" }}>Go to the <strong>Schedule</strong> tab to assign timings.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {scheduledDays.map(day => (
                            <div key={day} className="rounded-2xl px-4 py-3.5"
                                style={{ background: "var(--app-bg-card)", border: "1px solid var(--app-border)" }}>
                                <p className="text-xs font-semibold uppercase tracking-widest mb-2.5"
                                    style={{ color: "var(--app-accent)" }}>{day}</p>
                                <div className="space-y-2">
                                    {grouped[day].map((sch, i) => (
                                        <div key={sch.id} className="flex items-center gap-3">
                                            <span className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-mono"
                                                style={{ background: "var(--app-bg-muted)", border: "1px solid var(--app-border)", color: "var(--app-text-faint)" }}>
                                                {i + 1}
                                            </span>
                                            <div className="flex items-center gap-1.5 font-mono text-sm"
                                                style={{ color: "var(--app-text-secondary)" }}>
                                                <Clock className="w-3 h-3" style={{ color: "var(--app-text-faint)" }} />
                                                {sch.fromTime}
                                                <span style={{ color: "var(--app-border-strong)" }} className="mx-0.5">–</span>
                                                {sch.toTime}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // List view
    if (initializing) return null

    return (
        <div className="px-4 pt-6 pb-4 flex flex-col min-h-[calc(100vh-5rem)]">
            <PageHeader
                eyebrow="Courses"
                eyebrowIcon={<BookOpen className="w-3.5 h-3.5" />}
                title={
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--app-text-primary)" }}>
                        My Courses
                    </h1>
                }
            />

            <div className="flex-1 space-y-2 mb-6">
                {items === null ? null : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-14 h-14 rounded-3xl flex items-center justify-center mb-5"
                            style={{ background: "var(--app-bg-muted)", border: "1px solid var(--app-border)" }}>
                            <BookOpen className="w-6 h-6" style={{ color: "var(--app-text-faint)" }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: "var(--app-text-secondary)" }}>No courses yet</p>
                        <p className="text-xs mt-1" style={{ color: "var(--app-text-faint)" }}>Tap the button below to add your first course.</p>
                    </div>
                ) : (
                    items.map(({ course, schedules }) => {
                        const scheduledDays = dayOrder.filter(d => schedules.some(s => s.day === d))
                        const isEditing = editingId === course.id
                        return (
                            <div key={course.id}
                                className="rounded-2xl overflow-hidden transition-all duration-200"
                                style={{ background: "var(--app-bg-card)", border: "1px solid var(--app-border)" }}>
                                <div className="px-4 py-3">
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <input autoFocus type="text" value={editName}
                                                onChange={e => { setEditName(e.target.value); setEditError("") }}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") saveEdit(course.id!)
                                                    if (e.key === "Escape") cancelEdit()
                                                }}
                                                className="app-input" />
                                            {editError && (
                                                <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--status-absent-text)" }}>
                                                    <AlertCircle className="w-3 h-3" />{editError}
                                                </p>
                                            )}
                                            <div className="flex gap-2">
                                                <button onClick={() => saveEdit(course.id!)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                                                    style={{ background: "var(--app-accent-bg)", border: "1px solid var(--app-accent-border)", color: "var(--app-accent-text)" }}>
                                                    <Check className="w-3.5 h-3.5" /> Save
                                                </button>
                                                <button onClick={cancelEdit}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                                                    style={{ background: "var(--app-bg-muted)", border: "1px solid var(--app-border)", color: "var(--app-text-secondary)" }}>
                                                    <X className="w-3.5 h-3.5" /> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setView({ type: "detail", courseId: course.id! })}
                                                className="flex-1 flex items-center gap-3 min-w-0 text-left">
                                                <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center"
                                                    style={{ background: "var(--app-accent-bg)", border: "1px solid var(--app-accent-border)" }}>
                                                    <BookOpen className="w-4 h-4" style={{ color: "var(--app-accent)" }} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold truncate" style={{ color: "var(--app-text-primary)" }}>
                                                        {course.name}
                                                    </p>
                                                    <p className="text-xs mt-0.5" style={{ color: "var(--app-text-faint)" }}>
                                                        {scheduledDays.length > 0 ? scheduledDays.join(", ") : "No schedule yet"}
                                                    </p>
                                                </div>
                                            </button>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={() => startEdit(course)}
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                                    style={{ color: "var(--app-text-faint)" }}
                                                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "var(--app-accent)"; e.currentTarget.style.background = "var(--app-accent-bg)" }}
                                                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "var(--app-text-faint)"; e.currentTarget.style.background = "transparent" }}>
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(course.id!)}
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                                                    style={{ color: "var(--app-text-faint)" }}
                                                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "var(--status-absent-text)"; e.currentTarget.style.background = "var(--status-absent-bg)" }}
                                                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = "var(--app-text-faint)"; e.currentTarget.style.background = "transparent" }}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Full-width Add Course button pinned at bottom */}
            <button
                onClick={openDialog}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all app-btn-primary"
            >
                <Plus className="w-4 h-4" /> Add Course
            </button>

            {/* shadcn Dialog — stays centered, unaffected by keyboard */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                            New Course
                        </DialogTitle>
                    </DialogHeader>

                    {/* Body */}
                    <div className="px-4 pt-3 pb-5 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: "var(--app-text-faint)" }}>
                                Course name
                            </label>
                            <input
                                ref={inputRef}
                                autoFocus
                                type="text"
                                value={newName}
                                onChange={e => { setNewName(e.target.value); setAddError("") }}
                                onKeyDown={e => e.key === "Enter" && handleAdd()}
                                placeholder="e.g. Mathematics"
                                className="app-input"
                            />
                            {addError && (
                                <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--status-absent-text)" }}>
                                    <AlertCircle className="w-3 h-3" />{addError}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={handleAdd}
                            className="app-btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Course
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default Courses