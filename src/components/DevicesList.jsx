// src/components/DevicesList.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { db, auth } from "../services/firebase";
import { ref, onValue } from "firebase/database";
import DeviceCard from "./DeviceCard";
import { signOut } from "firebase/auth";
import wordmark from "../assets/wordmark.svg";
import footerWordmark from "../assets/footer-wordmark.svg";
import mqttClient from "../services/mqttClient";

function DevicesList({ user, onSelectDevice, statuses, setStatuses, onLogout, connectionLost }) {
  const [devices, setDevices] = useState({});
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Presence thresholds (match firmware 2s heartbeat)
  const HEARTBEAT_MS = 2_000;
  const STALE_GRACE_MS = 1_000;
  const OFFLINE_THRESHOLD_MS = HEARTBEAT_MS * 2 + STALE_GRACE_MS; // ~5s

  // Track lastSeen timestamps (epoch-ms) per device from MQTT
  const lastSeenMapRef = useRef({});     // { [deviceId]: number }
  const presenceMapRef = useRef({});     // { [deviceId]: "online"|"offline"|undefined }

  // Subscribe to user's devices once (still via Firebase)
  useEffect(() => {
    if (!user) return;
    const devicesRef = ref(db, `users/${user.uid}/devices`);
    const unsubscribeDevices = onValue(devicesRef, (snapshot) => {
      setDevices(snapshot.val() || {});
    });
    return () => unsubscribeDevices();
  }, [user]);

  // Subscribe to MQTT topics for each device (presence + heartbeat)
  useEffect(() => {
    const ids = Object.keys(devices || {});
    if (ids.length === 0) return;

    const topics = [];
    ids.forEach((deviceId) => {
      topics.push(`${deviceId}/presence`);
      topics.push(`${deviceId}/lastSeen`);
    });

    // Subscribe all needed topics
    topics.forEach((t) => {
      mqttClient.subscribe(t, (err) => {
        if (err) console.error("Subscribe error:", t, err);
      });
    });

    const handleMessage = (topic, message) => {
      const payload = message.toString().trim().toLowerCase();

      // presence
      const pMatch = topic.match(/^(.+)\/presence$/);
      if (pMatch) {
        const deviceId = pMatch[1];
        presenceMapRef.current[deviceId] = payload === "online" ? "online" : "offline";
        return;
      }

      // lastSeen
      const lMatch = topic.match(/^(.+)\/lastSeen$/);
      if (lMatch) {
        const deviceId = lMatch[1];
        const ts = parseInt(payload, 10);
        if (!Number.isNaN(ts)) {
          lastSeenMapRef.current[deviceId] = ts;
        }
        return;
      }
    };

    mqttClient.on("message", handleMessage);

    return () => {
      // Unsubscribe and detach listener
      topics.forEach((t) => mqttClient.unsubscribe(t));
      mqttClient.off("message", handleMessage);
      // keep maps; they’ll repopulate on re-subscribe due to retained messages
    };
  }, [devices]);

  // Compute statuses every second from MQTT (heartbeat first, presence fallback)
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const next = {};
      Object.keys(devices || {}).forEach((deviceId) => {
        const lastSeen = lastSeenMapRef.current[deviceId];  // epoch ms
        let state = "Offline";

        if (typeof lastSeen === "number") {
          const age = now - lastSeen;
          state = age <= OFFLINE_THRESHOLD_MS ? "Online" : "Offline";
        } else {
          // Fallback to presence retained value if we’ve never seen lastSeen
          const p = presenceMapRef.current[deviceId];
          if (p === "online") state = "Online";
          else if (p === "offline") state = "Offline";
        }
        next[deviceId] = state;
      });
      setStatuses(next);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [devices, setStatuses]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    onLogout();
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="devices-page">
      {/* Mobile header with hamburger and logo */}
      <div className="mobile-header">
        <button className="sidebar-toggle" onClick={toggleSidebar}>☰</button>
        <img src={wordmark} alt="Nodamic" className="mobile-logo" />
      </div>

      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      ></div>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <img src={wordmark} alt="Nodamic" className="sidebar-logo" />
          </div>

          <div className="welcome-message">
            Hi, {user.displayName?.split(' ')[0] || "User"} {user.displayName?.split(' ')[1] || ""}!
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

          {/* Desktop footer - shown in sidebar */}
          <div className="sidebar-footer">
            <img src={footerWordmark} alt="A project by nodamic" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <div className="devices-header">
          <h1 className="devices-title">Your Devices</h1>
        </div>

        <div className="devices-container">
          <div className="devices-grid">
            {connectionLost ? (
              <div className="no-devices">Internet Connection Lost</div>
            ) : Object.entries(devices || {}).length === 0 ? (
              <div className="no-devices">No Devices Yet</div>
            ) : (
              Object.entries(devices).map(([deviceId, device]) => (
                <DeviceCard
                  key={deviceId}
                  deviceId={deviceId}
                  device={device}
                  status={statuses[deviceId] || "Offline"}
                  onClick={() => onSelectDevice({ ...device, id: deviceId })}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Copy notification */}
      {copied && <div className="copy-notification">User ID copied to clipboard</div>}

      {/* Mobile footer - shown at bottom of page */}
      <div className="mobile-footer-brand">
        <img src={footerWordmark} alt="A project by nodamic" />
      </div>
    </div>
  );
}

export default DevicesList;
