// src/components/ManualScheduleCard.jsx
import { useEffect, useRef, useState } from "react";
import { db } from "../services/firebase";
import { ref, onValue, update, set } from "firebase/database";

/**
 * Props:
 * - user, device
 * - relayState: "ON" | "OFF" | null
 * - relayPending: boolean
 * - onToggleRelay: () => void
 * - onEnterManual?: () => void
 */
export default function ManualScheduleCard({
    user,
    device,
    relayState,
    relayPending,
    onToggleRelay,
    onEnterManual,
}) {
    const deviceId = device?.id;
    const schedulePath =
        user?.uid && deviceId
            ? `users/${user.uid}/devices/${deviceId}/schedule`
            : null;

    const [modeTab, setModeTab] = useState("MANUAL"); // "MANUAL" | "SCHEDULE"
    const isManual = modeTab === "MANUAL";

    // local schedule state
    const [enabled, setEnabled] = useState(false);
    const [startTime, setStartTime] = useState("19:00");
    const [endTime, setEndTime] = useState("22:00");
    const [repeat, setRepeat] = useState(true);
    const [schedulePower, setSchedulePower] = useState("ON"); // "ON" | "OFF"

    const applyingRemote = useRef(false);

    // ---------- helpers ----------
    const hhmm = (val) => {
        if (!val || !/^\d{1,2}:\d{1,2}$/.test(val)) return "00:00";
        let [h, m] = val.split(":").map((n) => parseInt(n, 10));
        if (isNaN(h)) h = 0;
        if (isNaN(m)) m = 0;
        h = Math.max(0, Math.min(23, h));
        m = Math.max(0, Math.min(59, m));
        const z = (n) => String(n).padStart(2, "0");
        return `${z(h)}:${z(m)}`;
    };

    const writeSchedule = async (partial) => {
        if (!schedulePath) return;
        await update(ref(db, schedulePath), partial);
    };

    const ensureScheduleInitialized = async () => {
        if (!schedulePath) return;
        await set(ref(db, schedulePath), {
            enabled: true,
            start: startTime,
            end: endTime,
            repeat,
            mode: schedulePower,
        });
    };

    // ---------- subscribe to /schedule ----------
    useEffect(() => {
        if (!schedulePath) return;
        const off = onValue(ref(db, schedulePath), (snap) => {
            const data = snap.val();
            if (!data) return;
            applyingRemote.current = true;
            try {
                if (typeof data.enabled === "boolean") setEnabled(data.enabled);
                if (typeof data.start === "string") setStartTime(hhmm(data.start));
                if (typeof data.end === "string") setEndTime(hhmm(data.end));
                if (typeof data.repeat === "boolean") setRepeat(data.repeat);
                if (data.mode === "ON" || data.mode === "OFF") setSchedulePower(data.mode);
            } finally {
                setTimeout(() => (applyingRemote.current = false), 0);
            }
        });
        return () => off();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schedulePath]);

    // ---------- tab switching ----------
    const switchToManual = async () => {
        setModeTab("MANUAL");
        onEnterManual?.();
        if (schedulePath) await writeSchedule({ enabled: false });
    };

    const switchToSchedule = async () => {
        setModeTab("SCHEDULE");
        if (schedulePath) {
            await ensureScheduleInitialized().catch(async () => {
                await writeSchedule({ enabled: true });
            });
            await writeSchedule({ enabled: true });
        }
    };

    const toggleHeaderSwitch = async () => {
        if (isManual) await switchToSchedule();
        else await switchToManual();
    };

    // ---------- field handlers (write-through) ----------
    const onChangeStart = async (val) => {
        const v = hhmm(val);
        setStartTime(v);
        if (!applyingRemote.current) await writeSchedule({ start: v });
    };

    const onChangeEnd = async (val) => {
        const v = hhmm(val);
        setEndTime(v);
        if (!applyingRemote.current) await writeSchedule({ end: v });
    };

    const onToggleRepeat = async () => {
        const v = !repeat;
        setRepeat(v);
        if (!applyingRemote.current) await writeSchedule({ repeat: v });
    };

    const onToggleMode = async () => {
        const v = schedulePower === "ON" ? "OFF" : "ON";
        setSchedulePower(v);
        if (!applyingRemote.current) await writeSchedule({ mode: v });
    };

    return (
        <div className="card manual-card">
            {/* ===== Title row like mock: Manual | [switch] | Schedule ===== */}
            <div className="card-title-row big-toggle">
                <span className={`title-label ${isManual ? "active" : "muted"}`}>
                    Manual Control
                </span>

                <button
                    type="button"
                    role="switch"
                    aria-checked={!isManual}
                    className={`mode-switch ${isManual ? "left" : "right"}`}
                    onClick={toggleHeaderSwitch}
                >
                    <span className="knob" />
                </button>

                <span className={`title-label ${!isManual ? "active" : "muted"}`}>
                    Schedule
                </span>
            </div>


            {/* Subtext */}
            {isManual ? (
                <p className="card-subtext">
                    Instantly switch the socket on or off. This overrides any schedules while active.
                </p>
            ) : (
                <p className="card-subtext">
                    Pick a start and end time. Choose whether the socket should turn ON or OFF
                    during that window, and whether to repeat every day.
                </p>
            )}

            {/* Body */}
            <div className="manual-card-body">
                {isManual ? (
                    <div className="manual-pane">
                        <div className="kv inline">
                            <div className="kv-key">Socket</div>
                            <div>
                                <button
                                    onClick={onToggleRelay}
                                    disabled={relayPending || relayState === null}
                                    className={`btn relay ${relayState === "ON" ? "on" : "off"} ${relayPending ? "pending" : ""
                                        }`}
                                    type="button"
                                >
                                    {relayState === null
                                        ? "Loading..."
                                        : relayPending
                                            ? "Pending..."
                                            : relayState === "ON"
                                                ? "Turn Off"
                                                : "Turn On"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="schedule-pane">
                        <div className="field">
                            <label className="field-label">Start Time</label>
                            <input
                                type="time"
                                className="time-input"
                                value={startTime}
                                onChange={(e) => onChangeStart(e.target.value)}
                                step="60"
                            />
                        </div>

                        <div className="field">
                            <label className="field-label">End Time</label>
                            <input
                                type="time"
                                className="time-input"
                                value={endTime}
                                onChange={(e) => onChangeEnd(e.target.value)}
                                step="60"
                            />
                        </div>

                        <div className="field">
                            <label className="field-label">Mode</label>
                            <button className="pill-toggle" type="button" onClick={onToggleMode}>
                                {schedulePower}
                            </button>
                        </div>

                        <div className="field">
                            <label className="field-label">Repeat</label>
                            <button className="pill-toggle" type="button" onClick={onToggleRepeat}>
                                {repeat ? "Yes" : "No"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
