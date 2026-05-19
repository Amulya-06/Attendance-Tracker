import { useState } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { SettingsProvider } from "./context/SettingsContext"
import BottomNav from "./components/BottomNav"
import Home from "./pages/Home"
import Courses from "./pages/Courses"
import Schedule from "./pages/Schedule"
import Attendance from "./pages/Attendance"
import SplashScreen from "./components/SplashScreen"
import CourseNotes from "./pages/CourseNotes"

function AppShell() {

    return (
        <BrowserRouter>
            <div
                className="app-shell-frame relative min-h-screen overflow-x-hidden"
                style={{ backgroundColor: "var(--app-bg)", color: "var(--app-text-primary)" }}
            >
                <main className="relative z-10" style={{ paddingBottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/courses" element={<Courses />} />
                        <Route path="/courses/:id" element={<CourseNotes />} />
                        <Route path="/schedule" element={<Schedule />} />
                        <Route path="/attendance" element={<Attendance />} />
                    </Routes>
                </main>
                <BottomNav />
            </div>
        </BrowserRouter>
    )
}

function App() {
    const [splashDone, setSplashDone] = useState(true)

    return (
        <SettingsProvider>
            {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
            <AppShell />
        </SettingsProvider>
    )
}

export default App