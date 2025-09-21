// src/components/ManualScheduleCard.jsx
import { useEffect, useRef, useState } from "react";
import CustomTimePicker from "./CustomTimePicker";
import {
  pubScheduleSet,
  pubScheduleEnable,
  reqScheduleStatus,
  subScheduleStatus,
} from "../services/scheduleMqtt";

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

  const [modeTab, setModeTab] = useState("MANUAL"); // "MANUAL" | "SCHEDULE"
  const isManual = modeTab === "MANUAL";

  const pad2 = (n) => String(n).padStart(2, "0");
  const hhmm = (val) => {
    if (!val || !/^\d{1,2}:\d{1,2}$/.test(val)) return "00:00";
    let [h, m] = val.split(":").map((n) => parseInt(n, 10));
    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;
    h = Math.max(0, Math.min(23, h));
    m = Math.max(0, Math.min(59, m));
    return `${pad2(h)}:${pad2(m)}`;
  };

  function initialTimes() {
    const d = new Date();
    const mins = d.getMinutes();
    const nextQuarter = Math.ceil(mins / 15) * 15;
    if (nextQuarter === 60) {
      d.setHours(d.getHours() + 1);
      d.setMinutes(0, 0, 0);
    } else {
      d.setMinutes(nextQuarter, 0, 0);
    }
    const start = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    const endDate = new Date(d.getTime() + 60 * 60 * 1000);
    const end = `${pad2(endDate.getHours())}:${pad2(endDate.getMinutes())}`;
    return { start, end };
  }

  const { start: initStart, end: initEnd } = initialTimes();

  // Local schedule state (mirrors device)
  const [enabled, setEnabled] = useState(false);
  const [startTime, setStartTime] = useState(initStart);
  const [endTime, setEndTime] = useState(initEnd);
  const [repeat, setRepeat] = useState(true);
  const [schedulePower, setSchedulePower] = useState("ON"); // "ON" | "OFF"
  const [inside, setInside] = useState(false);              // from device

  // Prevent write-through loops
  const applyingRemote = useRef(false);

  // Optimistic guard: ignore conflicting status during transitions
  const ignoreEnabledUntil = useRef(0);          // ms timestamp
  const desiredEnabledRef = useRef(null);        // true/false for the current toggle, or null

  function getTzOffsetMin() {
    return -new Date().getTimezoneOffset(); // e.g., +330 for Asia/Colombo
  }

  // Publish schedule config (retained) — NOTE: no "enabled" inside
  const pushSchedule = (partial = {}) => {
    if (!deviceId) return;
    const cfg = {
      start: startTime,
      end: endTime,
      repeat,
      mode: schedulePower,
      tz_offset_min: getTzOffsetMin(),
      ...partial,
    };
    pubScheduleSet(deviceId, cfg);
  };

  // Subscribe to retained /schedule/status
  useEffect(() => {
    if (!deviceId) return;
    const unsub = subScheduleStatus(deviceId, (data) => {
      applyingRemote.current = true;
      try {
        // Enabled/modeTab with optimistic guard
        if (typeof data.enabled === "boolean") {
          const now = Date.now();
          const inGuard = now < ignoreEnabledUntil.current;
          const desired = desiredEnabledRef.current;

          // If we're in a transition and this status contradicts what we just commanded,
          // ignore it to prevent UI flicker.
          if (inGuard && desired !== null && data.enabled !== desired) {
            // ignore this conflicting update
          } else {
            setEnabled(data.enabled);
            setModeTab(data.enabled ? "SCHEDULE" : "MANUAL");
            // If this matches our desired state, clear the guard.
            if (desired !== null && data.enabled === desired) {
              ignoreEnabledUntil.current = 0;
              desiredEnabledRef.current = null;
            }
          }
        }

        if (typeof data.start === "string") setStartTime(hhmm(data.start));
        if (typeof data.end === "string") setEndTime(hhmm(data.end));
        if (typeof data.repeat === "boolean") setRepeat(data.repeat);
        if (data.mode === "ON" || data.mode === "OFF") setSchedulePower(data.mode);
        if (typeof data.inside === "boolean") setInside(data.inside);
      } finally {
        setTimeout(() => (applyingRemote.current = false), 0);
      }
    });

    // Initial kick so we have something before the device changes anything
    reqScheduleStatus(deviceId);

    return () => unsub();
  }, [deviceId]); // eslint-disable-line

  // Mode switching
  const switchToManual = async () => {
    // Start optimistic guard (ignore stray "enabled:true" for a moment)
    desiredEnabledRef.current = false;
    ignoreEnabledUntil.current = Date.now() + 1500;

    setModeTab("MANUAL");
    onEnterManual?.();
    setEnabled(false);
    pubScheduleEnable(deviceId, false);
  };

  const switchToSchedule = async () => {
    // Start optimistic guard (ignore a transient "enabled:false")
    desiredEnabledRef.current = true;
    ignoreEnabledUntil.current = Date.now() + 2000;

    setModeTab("SCHEDULE");
    setEnabled(true);

    // 1) Push times/mode/tz first (retained) — device may publish status with enabled:false
    pushSchedule();

    // 2) Now enable (device snapshots preserved manual state and publishes enabled:true)
    pubScheduleEnable(deviceId, true);

    // (Optional) No /get here—avoids forcing an immediate stale status publish
  };

  const toggleHeaderSwitch = async () => {
    if (isManual) await switchToSchedule();
    else await switchToManual();
  };

  // Field handlers (MQTT write-through)
  const onChangeStart = async (val) => {
    const v = hhmm(val);
    setStartTime(v);
    if (!applyingRemote.current) pushSchedule({ start: v });
  };
  const onChangeEnd = async (val) => {
    const v = hhmm(val);
    setEndTime(v);
    if (!applyingRemote.current) pushSchedule({ end: v });
  };
  const onToggleRepeat = async () => {
    const v = !repeat;
    setRepeat(v);
    if (!applyingRemote.current) pushSchedule({ repeat: v });
  };
  const onToggleMode = async () => {
    const v = schedulePower === "ON" ? "OFF" : "ON";
    setSchedulePower(v);
    if (!applyingRemote.current) pushSchedule({ mode: v });
  };

  return (
    <div className="card manual-card">
      {/* Title row */}
      <div className="card-title-row big-toggle">
        <span className={`title-label ${isManual ? "active" : "muted"}`}>Manual</span>
        <button
          type="button"
          role="switch"
          aria-checked={!isManual}
          className={`mode-switch ${isManual ? "left" : "right"}`}
          onClick={toggleHeaderSwitch}
        >
          <span className="knob" />
        </button>
        <span className={`title-label ${!isManual ? "active" : "muted"}`}>Schedule</span>
      </div>

      {/* Subtext */}
      {isManual ? (
        <p className="card-subtext">
          Manual Control lets you turn the socket on or off anytime. This overrides schedules while active.
        </p>
      ) : (
        <p className="card-subtext">
          Schedule keeps the socket {schedulePower === "ON" ? "ON" : "OFF"} between the selected times
          {repeat ? " each day" : " once"}.
          <br />
          Status: <strong>{inside ? "Inside window" : "Outside window"}</strong>
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
                  className={`btn relay ${relayState === "ON" ? "on" : "off"} ${
                    relayPending ? "pending" : ""
                  }`}
                  type="button"
                >
                  {relayState === null
                    ? "LOADING..."
                    : relayPending
                    ? "PENDING..."
                    : relayState === "ON"
                    ? "TURN OFF"
                    : "TURN ON"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="schedule-pane">
            <div className="field">
              <label className="field-label">Start Time</label>
              <CustomTimePicker value={startTime} onChange={onChangeStart} />
            </div>
            <div className="field">
              <label className="field-label">End Time</label>
              <CustomTimePicker value={endTime} onChange={onChangeEnd} />
            </div>
            <div className="field">
              <label className="field-label">Mode</label>
              <button
                className={`pill-toggle ${schedulePower === "OFF" ? "red" : ""}`}
                type="button"
                onClick={onToggleMode}
              >
                {schedulePower}
              </button>
            </div>
            <div className="field">
              <label className="field-label">Repeat</label>
              <button
                className={`pill-toggle ${repeat ? "" : "red"}`}
                type="button"
                onClick={onToggleRepeat}
              >
                {repeat ? "YES" : "NO"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
