// src/components/DeviceInfoCard.jsx
import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { ref, onValue } from "firebase/database";
import deviceInfoIcon from "../assets/info-icon.svg";

/**
 * Props:
 * - user: Firebase auth user
 * - device: { id, name? }
 * - relayState: "ON" | "OFF" | null
 */
function DeviceInfoCard({ user, device, relayState }) {
  const deviceId = device?.id || "";
  const [fbName, setFbName] = useState(device?.name || deviceId);
  const [lastSeen, setLastSeen] = useState(0);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [fbStatus, setFbStatus] = useState("Offline");

  // Match firmware (heartbeat every 2s)
  const HEARTBEAT_MS = 2_000;
  const STALE_GRACE_MS = 1_000; // tiny cushion for jitter
  const OFFLINE_THRESHOLD_MS = HEARTBEAT_MS * 2 + STALE_GRACE_MS; // ~5s

  // Subscribe to server time offset (use server clock, not browser clock)
  useEffect(() => {
    const offsetRef = ref(db, ".info/serverTimeOffset");
    const unsub = onValue(offsetRef, (snap) => {
      const v = snap.val();
      setServerOffsetMs(typeof v === "number" ? v : 0);
    });
    return () => unsub();
  }, []);

  // Subscribe to this device node (read name + lastSeen)
  useEffect(() => {
    if (!user?.uid || !deviceId) return;
    const devRef = ref(db, `users/${user.uid}/devices/${deviceId}`);
    const unsub = onValue(devRef, (snap) => {
      const data = snap.val() || {};
      setFbName(data.name || deviceId);
      setLastSeen(typeof data.lastSeen === "number" ? data.lastSeen : 0);
    });
    return () => unsub();
  }, [user?.uid, deviceId]);

  // Recompute status every second from lastSeen + server time
  useEffect(() => {
    const compute = () => {
      const serverNow = Date.now() + serverOffsetMs;
      const age = lastSeen ? serverNow - lastSeen : Infinity;
      setFbStatus(age <= OFFLINE_THRESHOLD_MS ? "Online" : "Offline");
    };
    compute(); // run immediately
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [lastSeen, serverOffsetMs]);

  return (
    <div className="card info-card">
      <div className="card-title">
        <img src={deviceInfoIcon} alt="Device Info" />
        Device Information
      </div>

      <div className="kv">
        <div className="kv-key">Device Name</div>
        <div className="kv-val">{fbName || deviceId}</div>
      </div>

      <div className="kv">
        <div className="kv-key">Device ID</div>
        <div className="kv-val">{deviceId}</div>
      </div>

      <div className="kv">
        <div className="kv-key">Device Status</div>
        <div className={`badge ${fbStatus.toLowerCase() === "online" ? "ok" : "err"}`}>
          {fbStatus}
        </div>
      </div>

      <div className="kv">
        <div className="kv-key">Socket Status</div>
        <div
          className={`badge ${
            relayState === "ON" ? "ok" : relayState === "OFF" ? "warn" : "muted"
          }`}
        >
          {relayState === null ? "Loading…" : relayState}
        </div>
      </div>
    </div>
  );
}

export default DeviceInfoCard;
