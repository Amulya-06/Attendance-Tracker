import { useState } from "react"
import { useSettings } from "../context/SettingsContext"
import { SlidersHorizontal, GraduationCap, Sun, Moon, X, Check, Bell } from "lucide-react"

interface Props {
    open: boolean
    onClose: () => void
}

function SettingsDrawer({ open, onClose }: Props) {
    const { settings, update } = useSettings()
    const [editingAttendance, setEditingAttendance] = useState(false)
    const [attendanceInput, setAttendanceInput] = useState(String(settings.minAttendance))
    const [inputError, setInputError] = useState("")

    const startEdit = () => {
        setAttendanceInput(String(settings.minAttendance))
        setInputError("")
        setEditingAttendance(true)
    }

    const saveAttendance = () => {
        const val = Number(attendanceInput)
        if (isNaN(val) || val < 1 || val > 100) {
            setInputError("Enter a value between 1 and 100")
            return
        }
        update({ minAttendance: val })
        setEditingAttendance(false)
        setInputError("")
    }

    const cancelEdit = () => {
        setEditingAttendance(false)
        setInputError("")
    }

    const isLight = settings.theme === "light"

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                style={{ background: "rgba(0,0,0,0.5)" }}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-full z-50 w-[85vw] max-w-sm flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"
                    }`}
                style={{
                    backgroundColor: "var(--app-bg)",
                    borderLeft: "1px solid var(--app-border)",
                    paddingBottom: "env(safe-area-inset-bottom)",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 pt-12 pb-5 shrink-0"
                    style={{ borderBottom: "1px solid var(--app-border)" }}
                >
                    <div>
                        <div className="app-eyebrow">
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Preferences</span>
                        </div>
                        <h2
                            className="text-xl font-bold tracking-tight"
                            style={{ color: "var(--app-text-primary)" }}
                        >
                            Settings
                        </h2>
                    </div>
                    <button onClick={onClose} className="app-btn-ghost w-9 h-9">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">

                    {/* Theme toggle */}
                    <div
                        className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                        style={{
                            border: "1px solid var(--app-border)",
                            background: "var(--app-bg-card)",
                        }}
                    >
                        <div className="flex items-center gap-3">
                            {isLight
                                ? <Sun className="w-4 h-4" style={{ color: "#f59e0b" }} />
                                : <Moon className="w-4 h-4" style={{ color: "var(--app-accent)" }} />
                            }
                            <div>
                                <p
                                    className="text-sm font-semibold"
                                    style={{ color: "var(--app-text-primary)" }}
                                >
                                    {isLight ? "Light Mode" : "Dark Mode"}
                                </p>
                            </div>
                        </div>

                        {/* Toggle pill */}
                        <button
                            onClick={() => update({ theme: isLight ? "dark" : "light" })}
                            className="relative w-12 h-6 rounded-full transition-all duration-300 shrink-0"
                            style={{
                                background: isLight ? "rgba(245,158,11,0.2)" : "var(--app-accent-bg)",
                                border: isLight ? "1px solid rgba(245,158,11,0.4)" : "1px solid var(--app-accent-border)",
                            }}
                        >
                            <span
                                className="absolute top-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300"
                                style={{
                                    left: isLight ? "2px" : "calc(100% - 22px)",
                                    background: isLight ? "#f59e0b" : "var(--app-accent)",
                                }}
                            >
                                {isLight
                                    ? <Sun className="w-2.5 h-2.5 text-white" />
                                    : <Moon className="w-2.5 h-2.5" style={{ color: "var(--app-bg)" }} />
                                }
                            </span>
                        </button>
                    </div>

                    {/* Min attendance */}
                    <div
                        className="rounded-2xl overflow-hidden"
                        style={{
                            border: "1px solid var(--app-border)",
                            background: "var(--app-bg-card)",
                        }}
                    >
                        <div
                            className="flex items-center justify-between px-4 py-3.5 transition-colors"
                            style={{ cursor: editingAttendance ? "default" : "pointer" }}
                            onClick={() => { if (!editingAttendance) startEdit() }}
                        >
                            <div className="flex items-center gap-3">
                                <GraduationCap
                                    className="w-4 h-4 shrink-0"
                                    style={{ color: "var(--app-accent)" }}
                                />
                                <div>
                                    <p
                                        className="text-sm font-semibold"
                                        style={{ color: "var(--app-text-primary)" }}
                                    >
                                        Min. Attendance
                                    </p>
                                    <p
                                        className="text-xs mt-0.5"
                                        style={{ color: "var(--app-text-muted)" }}
                                    >
                                        Required by your college
                                    </p>
                                </div>
                            </div>
                            {!editingAttendance && (
                                <span
                                    className="text-sm font-bold font-mono px-2.5 py-1 rounded-lg"
                                    style={{
                                        color: "var(--app-accent-text)",
                                        background: "var(--app-accent-bg)",
                                        border: "1px solid var(--app-accent-border)",
                                    }}
                                >
                                    {settings.minAttendance}%
                                </span>
                            )}
                        </div>

                        {editingAttendance && (
                            <div
                                className="px-4 pb-4 pt-3 space-y-2"
                                style={{ borderTop: "1px solid var(--app-border)" }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            autoFocus
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={attendanceInput}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setAttendanceInput(e.target.value); setInputError("") }}
                                            onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
                                                if (e.key === "Enter") saveAttendance()
                                                if (e.key === "Escape") cancelEdit()
                                            }}
                                            className="app-input [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            placeholder="e.g. 75"
                                        />
                                        <span
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono pointer-events-none"
                                            style={{ color: "var(--app-text-muted)" }}
                                        >
                                            %
                                        </span>
                                    </div>
                                    <button
                                        onClick={saveAttendance}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
                                        style={{
                                            background: "var(--app-accent-bg)",
                                            border: "1px solid var(--app-accent-border)",
                                            color: "var(--app-accent-text)",
                                        }}
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        className="app-btn-ghost w-10 h-10 shrink-0"
                                        style={{
                                            background: "var(--app-bg-muted)",
                                            border: "1px solid var(--app-border-mid)",
                                        }}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                {inputError && (
                                    <p
                                        className="text-xs px-1"
                                        style={{ color: "var(--status-absent-text)" }}
                                    >
                                        {inputError}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div
                        className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                        style={{
                            border: "1px solid var(--app-border)",
                            background: "var(--app-bg-card)",
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <Bell
                                className="w-4 h-4"
                                style={{ color: "var(--app-accent)" }}
                            />
                            <div>
                                <p
                                    className="text-sm font-semibold"
                                    style={{ color: "var(--app-text-primary)" }}
                                >
                                    Notifications
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    )
}

export default SettingsDrawer
