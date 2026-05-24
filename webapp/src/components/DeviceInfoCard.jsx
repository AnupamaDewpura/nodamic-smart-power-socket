// src/components/DeviceInfoCard.jsx
import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { ref, onValue } from "firebase/database";
import mqttClient from "../services/mqttClient";
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

  // MQTT presence/heartbeat-driven status
  const [lastSeenMs, setLastSeenMs] = useState(0);
  const [presence, setPresence] = useState("offline"); // "online"|"offline"
  const [fbStatus, setFbStatus] = useState("Offline");

  // Power status from `{deviceId}/power/status` -> "HAS" | "NO"
  const [powerState, setPowerState] = useState(null); // "HAS POWER" | "NO POWER" | null

  // Heartbeat thresholds
  const HEARTBEAT_MS = 2_000;
  const STALE_GRACE_MS = 1_000;
  const OFFLINE_THRESHOLD_MS = HEARTBEAT_MS * 2 + STALE_GRACE_MS; // ~5s

  // Subscribe to this device node for the name (Firebase metadata)
  useEffect(() => {
    if (!user?.uid || !deviceId) return;
    const devRef = ref(db, `users/${user.uid}/devices/${deviceId}`);
    const unsub = onValue(devRef, (snap) => {
      const data = snap.val() || {};
      setFbName(data.name || deviceId);
    });
    return () => unsub();
  }, [user?.uid, deviceId]);

  // Subscribe to MQTT presence + lastSeen
  useEffect(() => {
    if (!deviceId) return;

    const presenceTopic = `${deviceId}/presence`;
    const lastSeenTopic = `${deviceId}/lastSeen`;

    mqttClient.subscribe(presenceTopic, (err) => {
      if (err) console.error("Subscribe error:", presenceTopic, err);
    });
    mqttClient.subscribe(lastSeenTopic, (err) => {
      if (err) console.error("Subscribe error:", lastSeenTopic, err);
    });

    const handleMessage = (topic, message) => {
      if (topic === presenceTopic) {
        const val = message.toString().trim().toLowerCase();
        setPresence(val === "online" ? "online" : "offline");
      } else if (topic === lastSeenTopic) {
        const ts = parseInt(message.toString(), 10);
        if (!Number.isNaN(ts)) setLastSeenMs(ts);
      }
    };

    mqttClient.on("message", handleMessage);

    return () => {
      mqttClient.unsubscribe(presenceTopic);
      mqttClient.unsubscribe(lastSeenTopic);
      mqttClient.off("message", handleMessage);
    };
  }, [deviceId]);

  // Recompute online/offline every second
  useEffect(() => {
    const compute = () => {
      const now = Date.now();
      let isOnline = false;

      if (typeof lastSeenMs === "number" && lastSeenMs > 0) {
        const age = now - lastSeenMs;
        isOnline = age <= OFFLINE_THRESHOLD_MS;
      } else {
        isOnline = presence === "online";
      }
      setFbStatus(isOnline ? "Online" : "Offline");
    };

    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [lastSeenMs, presence]);

  // --- Power status subscribe & initial query ---
  useEffect(() => {
    if (!deviceId) return;

    const powerStatusTopic = `${deviceId}/power/status`;
    const powerGetTopic = `${deviceId}/power/get`;

    mqttClient.subscribe(powerStatusTopic, (err) => {
      if (err) console.error("Subscribe error:", powerStatusTopic, err);
    });

    const handleMessage = (topic, message) => {
      if (topic !== powerStatusTopic) return;
      const raw = message.toString().trim().toUpperCase();

      // EXACT protocol: "HAS" or "NO"
      if (raw === "HAS") setPowerState("HAS POWER");
      else if (raw === "NO") setPowerState("NO POWER");
      else setPowerState(null); // unknown payload -> keep loading
    };

    mqttClient.on("message", handleMessage);

    // Ask device for current power status when card mounts
    mqttClient.publish(powerGetTopic, "STATUS");

    return () => {
      mqttClient.unsubscribe(powerStatusTopic);
      mqttClient.off("message", handleMessage);
    };
  }, [deviceId]);

  // Combined chip logic
  const bothKnown = relayState !== null && powerState !== null;
  const combinedText = bothKnown ? `${relayState} | ${powerState}` : "Loading…";
  const isGood = bothKnown && relayState === "ON" && powerState === "HAS POWER";
  const badgeClass = bothKnown ? (isGood ? "ok" : "err") : "muted";

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
        <div className={`badge ${badgeClass}`}>{combinedText}</div>
      </div>
    </div>
  );
}

export default DeviceInfoCard;
