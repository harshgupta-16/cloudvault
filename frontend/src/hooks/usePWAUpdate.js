import { useEffect, useState } from "react";

export function usePWAUpdate() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState(null);

    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker.getRegistration().then((reg) => {
            if (!reg) return;

            // If new SW already waiting
            if (reg.waiting) {
                setWaitingWorker(reg.waiting);
                setUpdateAvailable(true);
            }

            reg.addEventListener("updatefound", () => {
                const newWorker = reg.installing;

                if (!newWorker) return;

                newWorker.addEventListener("statechange", () => {
                    if (
                        newWorker.state === "installed" &&
                        navigator.serviceWorker.controller
                    ) {
                        setWaitingWorker(newWorker);
                        setUpdateAvailable(true);
                    }
                });
            });
        });
    }, []);

    const refreshApp = () => {
        if (!waitingWorker) return;

        waitingWorker.postMessage("SKIP_WAITING");

        waitingWorker.addEventListener("statechange", () => {
            if (waitingWorker.state === "activated") {
                window.location.reload();
            }
        });
    };

    return { updateAvailable, refreshApp };
}
