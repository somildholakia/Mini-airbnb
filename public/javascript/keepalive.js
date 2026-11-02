(() => {
    "use strict";

    if (typeof window.io !== "function") return;

    const socket = window.io({
        path: "/socket.io",
        autoConnect: false,
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        timeout: 15000
    });

    const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000;
    let heartbeatTimer = null;

    function sendHeartbeat() {
        if (socket.connected) {
            socket.emit("site:keepalive");
        }
    }

    function startHeartbeat() {
        if (heartbeatTimer !== null) return;
        heartbeatTimer = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    }

    function stopHeartbeat() {
        if (heartbeatTimer !== null) {
            window.clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        socket.disconnect();
    }

    function ensureConnected() {
        if (navigator.onLine && !socket.connected) {
            socket.connect();
        }
    }

    socket.on("connect", sendHeartbeat);
    window.addEventListener("online", ensureConnected);
    window.addEventListener("pageshow", () => {
        startHeartbeat();
        ensureConnected();
    });
    window.addEventListener("pagehide", stopHeartbeat);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") ensureConnected();
    });

    startHeartbeat();
    ensureConnected();
})();
