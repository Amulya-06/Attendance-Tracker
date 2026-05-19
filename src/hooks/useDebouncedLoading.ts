import { useCallback, useRef, useState } from "react";

export function useDebouncedLoading(delayMs = 200) {
    const [showLoader, setShowLoader] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const runWithLoading = useCallback(
        async (fn: () => Promise<void>) => {
        timerRef.current = setTimeout(() => setShowLoader(true), delayMs);
        try {
            await fn();
        } finally {
            if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
            }
            setShowLoader(false);
        }
        },
        [delayMs],
    );

    return [showLoader, runWithLoading] as const;
}
