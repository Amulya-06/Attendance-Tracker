import * as React from "react"
import { DayPicker, useDayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

// Uses DayPicker context — goToMonth works correctly here
function NavButton({ direction }: { direction: "prev" | "next" }) {
    const { previousMonth, nextMonth, goToMonth } = useDayPicker()
    const target = direction === "prev" ? previousMonth : nextMonth
    return (
        <button
            type="button"
            disabled={!target}
            onClick={() => target && goToMonth(target)}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 disabled:opacity-30"
            style={{
                background: "var(--app-bg-muted)",
                border: "1px solid var(--app-border)",
                color: "var(--app-text-secondary)",
            }}
        >
            {direction === "prev"
                ? <ChevronLeft className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />
            }
        </button>
    )
}

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={className}
            classNames={{
                months: "flex flex-col sm:flex-row gap-4",
                month: "flex flex-col gap-3 w-full",
                // Let MonthCaption control its own layout
                month_caption: "",
                caption_label: "",
                nav: "contents",
                button_previous: "hidden",
                button_next: "hidden",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "flex-1 text-center text-[0.75rem] font-semibold py-2",
                week: "flex w-full mt-1",
                day: "flex-1 text-center p-0",
                day_button: "w-8 h-8 mx-auto rounded-xl text-sm font-medium flex items-center justify-center transition-all duration-150",
                selected: "!rounded-xl",
                today: "font-bold",
                outside: "opacity-30",
                disabled: "opacity-20 cursor-not-allowed",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                MonthCaption: ({ calendarMonth }) => {
                    const label = calendarMonth.date.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                    })
                    return (
                        <div className="flex items-center justify-between w-full pb-1">
                            <NavButton direction="prev" />
                            <span
                                className="text-sm font-semibold"
                                style={{ color: "var(--app-text-primary)" }}
                            >
                                {label}
                            </span>
                            <NavButton direction="next" />
                        </div>
                    )
                },

                DayButton: ({ day, modifiers, children, ...buttonProps }) => {
                    const isPresent  = modifiers.present
                    const isAbsent   = modifiers.absent
                    const isSelected = modifiers.selected
                    const isToday    = modifiers.today

                    let style: React.CSSProperties = {
                        color: "var(--app-text-secondary)",
                        background: "transparent",
                        border: "1px solid transparent",
                    }

                    if (isPresent) {
                        style = {
                            background: "var(--status-present-bg)",
                            border: "1.5px solid var(--status-present-border)",
                            color: "var(--status-present-text)",
                            fontWeight: "700",
                        }
                    } else if (isAbsent) {
                        style = {
                            background: "var(--status-absent-bg)",
                            border: "1.5px solid var(--status-absent-border)",
                            color: "var(--status-absent-text)",
                            fontWeight: "700",
                        }
                    } else if (isSelected) {
                        style = {
                            background: "var(--app-accent)",
                            border: "1.5px solid var(--app-accent)",
                            color: "#fff",
                            fontWeight: "700",
                        }
                    } else if (isToday) {
                        style = {
                            background: "var(--app-accent-bg)",
                            border: "1.5px solid var(--app-accent-border)",
                            color: "var(--app-accent-text)",
                            fontWeight: "700",
                        }
                    }

                    return (
                        <button
                            {...buttonProps}
                            style={style}
                            className="w-8 h-8 mx-auto rounded-xl text-sm flex items-center justify-center transition-all duration-150 hover:scale-105"
                        >
                            {children}
                        </button>
                    )
                },
            }}
            {...props}
        />
    )
}

export { Calendar }