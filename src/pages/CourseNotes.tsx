import { db } from "@/db"
import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import {
    ChevronLeft, BookOpen, Clock, Camera,
    ImagePlus, Trash2, FileText, X, Plus,
    ChevronDown, ChevronUp, Check
} from "lucide-react"
import PageHeader from "@/components/PageHeader"
import { useDebounceValue } from "usehooks-ts"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getDayDate } from "@/components/DayDate"

interface CourseDetails {
    courseName: string
    day: string
    fromTime: string
    toTime: string
    scheduleId: number
    courseId: number
}

interface MediaItem {
    id: string
    file: File
    previewUrl: string
    type: "image" | "file"
    uploaded?: boolean
}

type MediaKind = "image" | "video" | "file"

const toDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

const resolveNoteDate = (dateParam: string | null) => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return dateParam
    return toDateKey(new Date())
}

const getMediaKindFromUrl = (url: string): MediaKind => {
    if (url.includes("/image/upload/")) return "image"

    const cleanUrl = url.split("?")[0].toLowerCase()
    if (/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(cleanUrl)) return "image"
    return "file"
}

const getFileNameFromUrl = (url: string) => {
    const path = url.split("?")[0]
    return decodeURIComponent(path.substring(path.lastIndexOf("/") + 1) || "Uploaded file")
}

// Camera modal
function CameraModal({
    onCapture,
    onClose,
}: {
    onCapture: (file: File) => void
    onClose: () => void
}) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        let cancelled = false

        navigator.mediaDevices
            .getUserMedia({ video: true, audio: false })
            .then((stream) => {
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
                streamRef.current = stream
                const video = videoRef.current
                if (video) {
                    video.srcObject = stream
                    video.onloadedmetadata = () => video.play().catch(() => { })
                }
            })
            .catch(() => {
                if (!cancelled) {
                    alert("Camera permission not allowed, allow from settings")
                    onClose()
                }
            })

        return () => {
            cancelled = true
            streamRef.current?.getTracks().forEach(t => t.stop())
        }
    }, [])

    // Called when the video element mounts — attach stream if already acquired
    const handleVideoRef = (el: HTMLVideoElement | null) => {
        ; (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el
        if (el && streamRef.current) {
            el.srcObject = streamRef.current
            el.onloadedmetadata = () => el.play().catch(() => { })
        }
    }

    const capture = () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        canvas.getContext("2d")?.drawImage(video, 0, 0)
        canvas.toBlob(
            (blob) => {
                if (!blob) return
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" })
                onCapture(file)
                onClose()
            },
            "image/jpeg",
            0.92
        )
    }

    return (
        <div
            className="fixed inset-0 z-50 overflow-hidden flex flex-col"
            style={{ background: "rgba(0,0,0,0.97)", width: "100vw", height: "100svh" }}
        >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-end px-5 pt-5">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-full w-10 h-10 shadow-lg"
                    style={{
                        background: "linear-gradient(145deg, rgba(255,255,255,0.8), rgba(150,150,150,0.55))",
                        color: "#111",
                        border: "1px solid rgba(255,255,255,0.45)",
                    }}
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col justify-between">
                <div className="flex-1 min-h-0 flex items-start justify-center px-0 overflow-hidden">
                    <video
                        ref={handleVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full max-h-full"
                        style={{ objectFit: "cover", background: "#1a1a1a" }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Black control area */}
                <div className="shrink-0 w-full flex items-center justify-center pb-8 pt-6" style={{ background: "#000" }}>
                    <button
                        onClick={capture}
                        aria-label="Capture photo"
                        className="w-20 h-20 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-100"
                        style={{
                            border: "4px solid white",
                            background: "rgba(255,255,255,0.15)",
                        }}
                    >
                        <div className="w-14 h-14 rounded-full bg-white" />
                    </button>
                </div>
            </div>
        </div>
    )
}

// Main component
function CourseNotes() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const dateParam = searchParams.get("date")
    const noteDate = resolveNoteDate(dateParam)

    const [details, setDetails] = useState<CourseDetails | null>(null)
    const [initializing, setInitializing] = useState(true)

    // Single textarea note
    const [noteText, setNoteText] = useState("")
    const [notesOpen, setNotesOpen] = useState(true)
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
    const [debouncedNote] = useDebounceValue(noteText, 2000)
    const noteDbId = useRef<number | null>(null)
    const isFirstMount = useRef(true)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const saveStatusTimerRef = useRef<number | null>(null)

    // Media
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
    const [savedMediaUrls, setSavedMediaUrls] = useState<string[]>([])
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
    const [showCamera, setShowCamera] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isUploaded, setIsUploaded] = useState(false)
    const uploadDoneTimerRef = useRef<number | null>(null)

    const uploadImage = async (files: MediaItem[]) => {
        if (!details || files.length === 0) return
        const pendingItems = files.filter(item => !item.uploaded)
        if (pendingItems.length === 0) return
        setIsUploading(true)
        setIsUploaded(false)
        try {
            const urls: string[] = [];

            for (const item of pendingItems) {
                if (!item.file.type.startsWith("image/")) {
                    throw new Error("Only image uploads are allowed")
                }
                const formData = new FormData();
                formData.append("file", item.file);
                formData.append("upload_preset", "attend-ease");
    
                const res = await fetch(
                "https://api.cloudinary.com/v1_1/dmmlsf8wm/image/upload",
                {
                    method: "POST",
                    body: formData,
                }
                );
    
                const data = await res.json();
                if (!res.ok || !data.secure_url) {
                    throw new Error(data?.error?.message || "Cloudinary upload failed")
                }
                urls.push(data.secure_url);
            }
            const existing = await db.notes
                .where("courseId").equals(details.courseId)
                .and(note => note.date === noteDate)
                .sortBy("date")

            if (existing.length > 0 && noteDbId.current === null) {
                noteDbId.current = existing[existing.length - 1].id ?? null
            }

            const previousUrls = existing[existing.length - 1]?.mediaUrls ?? []
            const mergedUrls = [...previousUrls, ...urls]

            if(existing.length === 0 && noteDbId.current === null) {
                const newId = await db.notes.add({
                    courseId: details.courseId,
                    date: noteDate,
                    content: debouncedNote,
                    mediaUrls: mergedUrls
                })
                noteDbId.current = newId as number
            }
            if(noteDbId.current !== null) {
                await db.notes.update(noteDbId.current, { mediaUrls: mergedUrls })
            }
            // Keep current local previews visible to avoid a visual gap while remote images load.
            // Persisted URLs are saved in IndexedDB and will be used on next page load.
            // console.log("fs", urls)
            const uploadedIds = new Set(pendingItems.map(item => item.id))
            setMediaItems(prev => prev.map(item => (
                uploadedIds.has(item.id)
                    ? { ...item, uploaded: true }
                    : item
            )))
            setIsUploaded(true)
            if (uploadDoneTimerRef.current !== null) {
                window.clearTimeout(uploadDoneTimerRef.current)
            }
            uploadDoneTimerRef.current = window.setTimeout(() => {
                setIsUploaded(false)
                uploadDoneTimerRef.current = null
            }, 1500)
        } catch (error) {
            console.error(error)
            alert("Failed to upload one or more files. Please try again.")
        } finally {
            setIsUploading(false)
        }
    };

    // Load
    useEffect(() => {
        if (!id) return
        const load = async () => {
            try {
                const schedule = await db.schedules.get(Number(id))
                if (!schedule) return
                const course = await db.courses.get(schedule.courseId)
                setDetails({
                    courseName: course?.name ?? "Unknown",
                    day: schedule.day,
                    fromTime: schedule.fromTime,
                    toTime: schedule.toTime,
                    scheduleId: schedule.id!,
                    courseId: schedule.courseId,
                })
                const existing = await db.notes
                    .where("courseId").equals(schedule.courseId)
                    .and(note => note.date === noteDate)
                    .sortBy("date")
                if (existing.length > 0) {
                    const latest = existing[existing.length - 1]
                    noteDbId.current = latest.id ?? null
                    setNoteText(latest.content)
                    setSavedMediaUrls(latest.mediaUrls ?? [])
                } else {
                    setSavedMediaUrls([])
                }
            } finally {
                setInitializing(false)
            }
        }
        load()
    }, [id])

    // Auto-save
    useEffect(() => {
        if (isFirstMount.current) { isFirstMount.current = false; return }
        if (!details) return
        const save = async () => {
            const existing = await db.notes
                .where("courseId").equals(details.courseId)
                .and(note => note.date === noteDate)
                .sortBy("date")

            if (existing.length > 0 && noteDbId.current === null) {
                noteDbId.current = existing[existing.length - 1].id ?? null
            }

            if (debouncedNote.trim() === "") {
                if (noteDbId.current !== null) {
                    await db.notes.delete(noteDbId.current)
                    noteDbId.current = null
                }
            } else if (noteDbId.current !== null) {
                await db.notes.update(noteDbId.current, { content: debouncedNote })
            } else {
                const newId = await db.notes.add({
                    courseId: details.courseId,
                    date: noteDate,
                    content: debouncedNote,
                    mediaUrls: []
                })
                noteDbId.current = newId as number
            }
            setSaveStatus("saved")
            setTimeout(() => setSaveStatus("idle"), 2000)
        }
        save()
    }, [debouncedNote])

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value
        setNoteText(next)

        // If already-empty value is cleared again, debounced value may not change,
        // so autosave won't run. Mark as saved explicitly to avoid stuck "Saving...".
        if (next.trim() === "" && debouncedNote.trim() === "" && noteDbId.current === null) {
            setSaveStatus("saved")
            if (saveStatusTimerRef.current !== null) {
                window.clearTimeout(saveStatusTimerRef.current)
            }
            saveStatusTimerRef.current = window.setTimeout(() => {
                setSaveStatus("idle")
                saveStatusTimerRef.current = null
            }, 1200)
        } else {
            setSaveStatus("saving")
        }
        autoResize(e.target)
    }

    useEffect(() => {
        return () => {
            if (saveStatusTimerRef.current !== null) {
                window.clearTimeout(saveStatusTimerRef.current)
            }
            if (uploadDoneTimerRef.current !== null) {
                window.clearTimeout(uploadDoneTimerRef.current)
            }
        }
    }, [])

    const autoResize = (el: HTMLTextAreaElement | null) => {
        if (!el) return
        el.style.height = "auto"
        el.style.height = `${el.scrollHeight}px`
    }

    useEffect(() => {
        if (notesOpen) setTimeout(() => autoResize(textareaRef.current), 50)
    }, [notesOpen])

    // Media helpers
    const addFiles = (files: FileList | File[] | null) => {
        if (!files) return
        const imageFiles = Array.from(files).filter(file => file.type.startsWith("image/"))
        if (imageFiles.length !== Array.from(files).length) {
            alert("Only image files are allowed.")
        }
        const newItems: MediaItem[] = imageFiles.map(file => ({
            id: `${Date.now()}-${Math.random()}`,
            file,
            previewUrl: URL.createObjectURL(file),
            type: "image",
            uploaded: false,
        }))
        if (newItems.length > 0) setIsUploaded(false)
        setMediaItems(prev => [...prev, ...newItems])
    }

    const removeMedia = (itemId: string) => {
        setMediaItems(prev => {
            const item = prev.find(m => m.id === itemId)
            if (item) URL.revokeObjectURL(item.previewUrl)
            return prev.filter(m => m.id !== itemId)
        })
    }

    const removeSavedMediaUrl = async (urlToRemove: string) => {
        if (!details) return

        const previousUrls = savedMediaUrls
        const nextUrls = previousUrls.filter(url => url !== urlToRemove)
        setSavedMediaUrls(nextUrls)

        try {
            if (noteDbId.current === null) {
                const existing = await db.notes
                    .where("courseId").equals(details.courseId)
                    .and(note => note.date === noteDate)
                    .sortBy("date")

                if (existing.length > 0) {
                    noteDbId.current = existing[existing.length - 1].id ?? null
                }
            }

            if (noteDbId.current !== null) {
                await db.notes.update(noteDbId.current, { mediaUrls: nextUrls })
            }
        } catch (error) {
            console.error(error)
            setSavedMediaUrls(previousUrls)
            alert("Unable to remove image. Please try again.")
        }
    }

    const hasAnyMedia = savedMediaUrls.length > 0 || mediaItems.length > 0
    const savedVisualMedia = savedMediaUrls.filter(url => getMediaKindFromUrl(url) === "image")
    const savedFileMedia = savedMediaUrls.filter(url => getMediaKindFromUrl(url) === "file")
    const pendingUploadCount = mediaItems.filter(item => !item.uploaded).length

    const { date } = getDayDate(dateParam)

    const fmtDate = (d: string) => {
        const [day, month, year] = d.split("/").map(Number)
        const localDate = new Date(year, month - 1, day) // local time
        return localDate.toLocaleDateString("en-GB", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    if (initializing) return null
    if (!details) return null

    return (
        <div className="px-4 pt-6 pb-8 min-h-screen" style={{ background: "var(--app-bg)" }}>

            {/* Header */}
            <PageHeader
                eyebrow="Course Notes"
                eyebrowIcon={<BookOpen className="w-3.5 h-3.5" />}
                title={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="rounded-xl shrink-0 w-8 h-8 app-btn-ghost"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="min-w-0">
                            <h1
                                className="text-2xl font-bold tracking-tight truncate"
                                style={{ color: "var(--app-text-primary)" }}
                            >
                                {details.courseName}
                            </h1>
                        </div>
                    </div>
                }
            />

            {/* Course meta */}
            <div className="mb-6 -mt-1">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg font-semibold" style={{ color: "var(--app-text-secondary)" }}>
                        {details.day}
                    </span>
                    <span style={{ color: "var(--app-border-strong)" }}>·</span>
                    <span className="text-lg font-semibold" style={{ color: "var(--app-text-secondary)" }}>
                        {fmtDate(date)}
                        {/* {date} */}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: "var(--app-text-faint)" }}>
                    <Clock className="w-3 h-3" />
                    <span>{details.fromTime}</span>
                    <span style={{ color: "var(--app-border-strong)" }}>–</span>
                    <span>{details.toTime}</span>
                </div>
            </div>

            {/* NOTES SECTION */}
            <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <p className="app-section-label mb-0">Notes</p>
                    <div className="flex items-center gap-2">
                        {notesOpen && saveStatus !== "idle" && (
                            <span
                                className="flex items-center gap-1 text-xs font-medium"
                                style={{
                                    color: saveStatus === "saved"
                                        ? "var(--status-present-text)"
                                        : "var(--app-text-faint)",
                                }}
                            >
                                {saveStatus === "saved" && <Check className="w-3 h-3" />}
                                {saveStatus === "saved" ? "Saved" : "Saving…"}
                            </span>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNotesOpen(o => !o)}
                            className="h-7 px-2.5 rounded-xl text-xs gap-1"
                            style={{ color: "var(--app-text-faint)" }}
                        >
                            {notesOpen
                                ? <><ChevronUp className="w-3.5 h-3.5" /> Hide</>
                                : <><ChevronDown className="w-3.5 h-3.5" /> Show</>
                            }
                        </Button>
                    </div>
                </div>

                {notesOpen && (
                    <div
                        className="rounded-xl overflow-hidden"
                        style={{
                            background: "var(--app-bg-card)",
                            border: "1.5px solid var(--app-accent)",
                            boxShadow: "0 0 0 3px var(--app-accent-bg)",
                        }}
                    >
                        <Textarea
                            ref={textareaRef}
                            value={noteText}
                            onChange={handleNoteChange}
                            placeholder="Start typing your notes…"
                            className="w-full text-xs min-h-35 p-3.5 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            style={{
                                color: "var(--app-text-primary)",
                            }}
                            onFocus={e => autoResize(e.target)}
                        />
                    </div>
                )}
            </section>

            {/* MEDIA SECTION */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <p className="app-section-label mb-0">Media</p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCamera(true)}
                            className="h-7 px-2.5 rounded-xl text-xs gap-1.5"
                            style={{
                                background: "var(--app-bg-muted)",
                                color: "var(--app-text-secondary)",
                                border: "1px solid var(--app-border)",
                            }}
                        >
                            <Camera className="w-3.5 h-3.5" /> Camera
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-7 px-2.5 rounded-xl text-xs gap-1.5"
                            style={{
                                background: "var(--app-accent-bg)",
                                color: "var(--app-accent-text)",
                                border: "1px solid var(--app-accent-border)",
                            }}
                        >
                            <ImagePlus className="w-3.5 h-3.5" /> Upload
                        </Button>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => { addFiles(e.target.files); e.target.value = "" }}
                />

                {!hasAnyMedia ? (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full rounded-xl flex flex-col items-center justify-center py-10 transition-all"
                        style={{
                            background: "var(--app-bg-card)",
                            border: "1.5px dashed var(--app-border-mid)",
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "var(--app-accent-border)"
                            e.currentTarget.style.background = "var(--app-accent-bg)"
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "var(--app-border-mid)"
                            e.currentTarget.style.background = "var(--app-bg-card)"
                        }}
                    >
                        <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
                            style={{ background: "var(--app-bg-muted)", border: "1px solid var(--app-border)" }}
                        >
                            <ImagePlus className="w-5 h-5" style={{ color: "var(--app-text-faint)" }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: "var(--app-text-secondary)" }}>
                            Tap to upload images
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--app-text-faint)" }}>
                            Or use the Camera button to capture
                        </p>
                    </button>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {savedVisualMedia.map(url => (
                                <div key={url} className="relative aspect-square">
                                    <img
                                        src={url}
                                        alt=""
                                        className="w-full h-full object-cover rounded-xl cursor-pointer"
                                        onClick={() => setLightboxSrc(url)}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            void removeSavedMediaUrl(url)
                                        }}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                                        style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                                        aria-label="Remove image"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {mediaItems
                                .filter(m => m.type === "image")
                                .map(item => (
                                    <div key={item.id} className="relative aspect-square">
                                        <img
                                            src={item.previewUrl}
                                            alt=""
                                            className="w-full h-full object-cover rounded-xl cursor-pointer"
                                            onClick={() => setLightboxSrc(item.previewUrl)}
                                        />
                                        <button
                                            onClick={() => removeMedia(item.id)}
                                            className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                                            style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            }
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
                                style={{
                                    background: "var(--app-bg-muted)",
                                    border: "1.5px dashed var(--app-border-mid)",
                                    color: "var(--app-text-faint)",
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = "var(--app-accent-border)"
                                    e.currentTarget.style.background = "var(--app-accent-bg)"
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = "var(--app-border-mid)"
                                    e.currentTarget.style.background = "var(--app-bg-muted)"
                                }}
                            >
                                <Plus className="w-5 h-5" />
                                <span className="text-[10px] font-semibold">Add more</span>
                            </button>
                        </div>

                        {(savedFileMedia.length > 0 || mediaItems.filter(m => m.type === "file").length > 0) && (
                            <div className="space-y-2">
                                {savedFileMedia.map(url => (
                                    <a
                                        key={url}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                                        style={{
                                            background: "var(--app-bg-card)",
                                            border: "1px solid var(--app-border)",
                                        }}
                                    >
                                        <div
                                            className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center"
                                            style={{
                                                background: "var(--app-accent-bg)",
                                                border: "1px solid var(--app-accent-border)",
                                            }}
                                        >
                                            <FileText className="w-4 h-4" style={{ color: "var(--app-accent)" }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: "var(--app-text-primary)" }}>
                                                {getFileNameFromUrl(url)}
                                            </p>
                                            <p className="text-xs" style={{ color: "var(--app-text-faint)" }}>
                                                Uploaded file
                                            </p>
                                        </div>
                                    </a>
                                ))}
                                {mediaItems
                                    .filter(m => m.type === "file")
                                    .map(item => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                                            style={{
                                                background: "var(--app-bg-card)",
                                                border: "1px solid var(--app-border)",
                                            }}
                                        >
                                            <div
                                                className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center"
                                                style={{
                                                    background: "var(--app-accent-bg)",
                                                    border: "1px solid var(--app-accent-border)",
                                                }}
                                            >
                                                <FileText className="w-4 h-4" style={{ color: "var(--app-accent)" }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate" style={{ color: "var(--app-text-primary)" }}>
                                                    {item.file.name}
                                                </p>
                                                <p className="text-xs" style={{ color: "var(--app-text-faint)" }}>
                                                    {(item.file.size / 1024).toFixed(0)} KB
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeMedia(item.id)}
                                                className="w-8 h-8 rounded-xl shrink-0"
                                                style={{ color: "var(--app-text-faint)" }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))
                                }
                            </div>
                        )}

                        {pendingUploadCount > 0 && (
                            <Button
                                className="w-full mt-4 rounded-2xl gap-2 app-btn-primary"
                                onClick={() => uploadImage(mediaItems)}
                                disabled={isUploading}
                            >
                                <ImagePlus className="w-4 h-4" />
                                {isUploading ? (
                                    <span>Uploading...</span>
                                ) : isUploaded ? (
                                    <span>Uploaded</span>
                                ) : (
                                    <span>Upload {pendingUploadCount} file{pendingUploadCount !== 1 ? "s" : ""}</span>
                                )}
                            </Button>
                        )}
                    </>
                )}
            </section>

            {/* Camera modal */}
            {showCamera && (
                <CameraModal
                    onCapture={(file) => addFiles([file])}
                    onClose={() => setShowCamera(false)}
                />
            )}

            {/* Lightbox */}
            {lightboxSrc && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
                    onClick={() => setLightboxSrc(null)}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-6 right-5 rounded-full text-white hover:bg-white/20 w-9 h-9"
                        onClick={() => setLightboxSrc(null)}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                    <img
                        src={lightboxSrc}
                        alt=""
                        className="max-w-full max-h-[90vh] rounded-2xl object-contain"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    )
}

export default CourseNotes