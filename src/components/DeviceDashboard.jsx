// src/components/DeviceDashboard.jsx
import { useEffect, useRef, useState } from "react";
import mqttClient from "../services/mqttClient";
import DeviceInfoCard from "./DeviceInfoCard";
import ManualScheduleCard from "./ManualScheduleCard";
import AlgorithmControlCard from "./AlgorithmControlCard";
import WeatherAlertsCard from "./WeatherAlertsCard";
import PowerCutLogsCard from "./PowerCutLogsCard";

import wordmark from "../assets/wordmark.svg";
import footerWordmark from "../assets/footer-wordmark.svg";
import { signOut } from "firebase/auth";
import { auth, db } from "../services/firebase";
import { ref, onValue } from "firebase/database";

function DeviceDashboard({ user, device, onBack, onLogout }) {
  // -------- Sidebar UI --------
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((s) => !s);
  const closeSidebar = () => setSidebarOpen(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    onLogout?.();
  };

  // ----------------- PRESENCE WATCH (lastSeen → auto-back) -----------------
  const deviceId = device?.id || "";
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [lastSeen, setLastSeen] = useState(0);

  const presenceReadyRef = useRef(false);     // becomes true after first lastSeen snapshot
  const navigatedRef = useRef(false);         // guard: call onBack once
  const mountedAtRef = useRef(Date.now());    // local-time holdoff start
  const offlineStreakRef = useRef(0);         // require 2 consecutive offline ticks

  // Match firmware heartbeat (2s)
  const HEARTBEAT_MS = 2_000;
  const STALE_GRACE_MS = 1_000; // tiny cushion
  const OFFLINE_THRESHOLD_MS = HEARTBEAT_MS * 2 + STALE_GRACE_MS; // ~5s

  // Don’t bounce right away when entering dashboard
  const NAV_HOLDOFF_MS = 1500; // ~1.5s before we allow auto-back

  // Subscribe to Firebase server time offset
  useEffect(() => {
    const offsetRef = ref(db, ".info/serverTimeOffset");
    const unsub = onValue(offsetRef, (snap) => {
      const v = snap.val();
      setServerOffsetMs(typeof v === "number" ? v : 0);
    });
    return () => unsub();
  }, []);

  // Subscribe to this device's lastSeen
  useEffect(() => {
    if (!user?.uid || !deviceId) return;
    navigatedRef.current = false;
    presenceReadyRef.current = false;
    offlineStreakRef.current = 0;
    mountedAtRef.current = Date.now();

    const devLastSeenRef = ref(db, `users/${user.uid}/devices/${deviceId}/lastSeen`);
    const unsub = onValue(devLastSeenRef, (snap) => {
      const v = snap.val();
      setLastSeen(typeof v === "number" ? v : 0);
      presenceReadyRef.current = true; // we have at least one snapshot
    });
    return () => unsub();
  }, [user?.uid, deviceId]);

  // Recompute Online/Offline every second; navigate back if truly Offline
  useEffect(() => {
    const tick = () => {
      if (!presenceReadyRef.current || navigatedRef.current) return;

      const serverNow = Date.now() + serverOffsetMs;
      const age = lastSeen ? serverNow - lastSeen : Infinity;
      const isOnline = age <= OFFLINE_THRESHOLD_MS;

      if (isOnline) {
        offlineStreakRef.current = 0;
        return;
      }

      // Require a short holdoff after entering the page
      if (Date.now() - mountedAtRef.current < NAV_HOLDOFF_MS) return;

      // Require two consecutive offline ticks to avoid flicker
      offlineStreakRef.current += 1;
      if (offlineStreakRef.current >= 2) {
        navigatedRef.current = true;
        onBack?.();
      }
    };

    tick(); // run immediately
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastSeen, serverOffsetMs, onBack]);

  // ----------------- RELAY (MQTT) -----------------
  const [relayState, setRelayState] = useState(null);
  const [relayPending, setRelayPending] = useState(false);

  useEffect(() => {
    if (!deviceId) return;

    const relayStatusTopic = `${deviceId}/relay/status`;
    const relayGetTopic = `${deviceId}/relay/get`;

    mqttClient.subscribe(relayStatusTopic, (err) => {
      if (err) console.error("Subscribe error:", err);
    });

    const handleMessage = (topic, message) => {
      if (topic === relayStatusTopic) {
        const status = message.toString().toUpperCase(); // ON / OFF
        setRelayState(status);
        setRelayPending(false);
      }
    };

    mqttClient.on("message", handleMessage);
    mqttClient.publish(relayGetTopic, "STATUS"); // request current status

    return () => {
      mqttClient.unsubscribe(relayStatusTopic);
      mqttClient.off("message", handleMessage);
    };
  }, [deviceId]);

  const toggleRelay = () => {
    if (relayPending || relayState === null || !deviceId) return;
    const newState = relayState === "ON" ? "OFF" : "ON";
    const setTopic = `${deviceId}/relay/set`;
    mqttClient.publish(setTopic, newState);
    setRelayPending(true);

    // watchdog: clear pending if no MQTT response within 10s
    setTimeout(() => {
      setRelayPending((prev) => (prev ? false : prev));
    }, 10000);
  };

  const requeryRelayStatus = () => {
    if (!deviceId) return;
    setRelayState(null);
    setRelayPending(false);
    const relayGetTopic = `${deviceId}/relay/get`;
    mqttClient.publish(relayGetTopic, "STATUS");
  };

  // ----------------- ALGORITHM (MQTT) -----------------
  const [algorithmState, setAlgorithmState] = useState(null);
  const [algorithmPending, setAlgorithmPending] = useState(false);

  useEffect(() => {
    if (!deviceId) return;

    const algoStatusTopic = `${deviceId}/algorithm/status`;
    const algoGetTopic = `${deviceId}/algorithm/get`;

    mqttClient.subscribe(algoStatusTopic, (err) => {
      if (err) console.error("Subscribe error:", err);
    });

    const handleMessage = (topic, message) => {
      if (topic === algoStatusTopic) {
        const status = message.toString().toUpperCase(); // ON / OFF
        setAlgorithmState(status);
        setAlgorithmPending(false);
      }
    };

    mqttClient.on("message", handleMessage);
    mqttClient.publish(algoGetTopic, "STATUS");

    return () => {
      mqttClient.unsubscribe(algoStatusTopic);
      mqttClient.off("message", handleMessage);
    };
  }, [deviceId]);

  const toggleAlgorithm = () => {
    if (algorithmPending || algorithmState === null || !deviceId) return;
    const newState = algorithmState === "ON" ? "OFF" : "ON";
    const setTopic = `${deviceId}/algorithm/set`;
    mqttClient.publish(setTopic, newState);
    setAlgorithmPending(true);

    // watchdog: clear pending if no MQTT response within 10s
    setTimeout(() => {
      setAlgorithmPending((prev) => (prev ? false : prev));
    }, 10000);
  };

  return (
    <div className="devices-page">
      {/* Mobile header */}
      <div className="mobile-header">
        <button className="sidebar-toggle" onClick={toggleSidebar}>☰</button>
        <img src={wordmark} alt="Nodamic" className="mobile-logo" />
      </div>

      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "active" : ""}`}
        onClick={closeSidebar}
      ></div>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <img src={wordmark} alt="Nodamic" className="sidebar-logo" />
          </div>

          <div className="welcome-message">
            Hi, {user.displayName?.split(" ")[0] || "User"}{" "}
            {user.displayName?.split(" ")[1] || ""}!
          </div>

          <div className="user-details">
            <div className="user-detail-item">
              <div className="user-detail-label">Your Email</div>
              <div className="user-email">{user.email}</div>
            </div>

            <div className="user-detail-item">
              <div className="user-detail-label">Your User ID</div>
              <button className="user-id" onClick={handleCopy}>
                {user.uid}
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>

          <div className="sidebar-footer">
            <img src={footerWordmark} alt="A project by nodamic" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <div className="devices-header">
          <button className="dashboard-back-button" onClick={onBack}>Go Back</button>
        <h1 className="devices-title">Dashboard</h1>
        </div>

        <div className="devices-container">
          <div className="dashboard-grid">
            {/* Device Information */}
            <DeviceInfoCard user={user} device={device} relayState={relayState} />

            {/* Manual Control / Schedule */}
            <ManualScheduleCard
              user={user}
              device={device}
              relayState={relayState}
              relayPending={relayPending}
              onToggleRelay={toggleRelay}
              onEnterManual={requeryRelayStatus}
            />

            {/* Algorithm Control */}
            <AlgorithmControlCard
              algorithmState={algorithmState}
              algorithmPending={algorithmPending}
              onToggleAlgorithm={toggleAlgorithm}
            />

            {/* Weather Alerts */}
            <WeatherAlertsCard user={user} device={device} />

            {/* Power Cut Logs */}
            <PowerCutLogsCard user={user} device={device} />
          </div>
        </div>
      </div>

      {/* Copy notification */}
      {copied && <div className="copy-notification">User ID copied to clipboard</div>}

      {/* Mobile footer */}
      <div className="mobile-footer-brand">
        <img src={footerWordmark} alt="A project by nodamic" />
      </div>
    </div>
  );
}

export default DeviceDashboard;
