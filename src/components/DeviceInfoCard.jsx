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
  const [fbName, setFbName] = useState(device?.name || "");
  const [fbStatus, setFbStatus] = useState("Offline");
  const deviceId = device?.id || "";

  useEffect(() => {
    if (!user?.uid || !deviceId) return;

    const devRef = ref(db, `users/${user.uid}/devices/${deviceId}`);
    const unsub = onValue(devRef, (snap) => {
      const data = snap.val() || {};
      setFbName(data.name || deviceId);
      setFbStatus(data.status || "Offline");
    });

    return () => unsub();
  }, [user?.uid, deviceId]);

  return (
    <div className="card">
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
        <div className={`badge ${fbStatus?.toLowerCase() === "online" ? "ok" : "err"}`}>
          {fbStatus || "Offline"}
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
