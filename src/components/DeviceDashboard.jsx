// src/components/DeviceDashboard.jsx
import { useEffect, useState } from "react";
import mqttClient from "../services/mqttClient";
import DeviceInfoCard from "./DeviceInfoCard";
import ManualScheduleCard from "./ManualScheduleCard";
import AlgorithmControlCard from "./AlgorithmControlCard";
import WeatherAlertsCard from "./WeatherAlertsCard";
import PowerCutLogsCard from "./PowerCutLogsCard";

import wordmark from "../assets/wordmark.svg";
import footerWordmark from "../assets/footer-wordmark.svg";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";

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

  // ----------------- RELAY (MQTT) -----------------
  const [relayState, setRelayState] = useState(null);
  const [relayPending, setRelayPending] = useState(false);

  useEffect(() => {
    if (!device?.id) return;

    const relayStatusTopic = `${device.id}/relay/status`;
    const relayGetTopic = `${device.id}/relay/get`;

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
  }, [device?.id]);

  const toggleRelay = () => {
    if (relayPending || relayState === null) return;
    const newState = relayState === "ON" ? "OFF" : "ON";
    const setTopic = `${device.id}/relay/set`;
    mqttClient.publish(setTopic, newState);
    setRelayPending(true);
  };

  const requeryRelayStatus = () => {
    if (!device?.id) return;
    setRelayState(null);
    setRelayPending(false);
    const relayGetTopic = `${device.id}/relay/get`;
    mqttClient.publish(relayGetTopic, "STATUS");
  };

  // ----------------- ALGORITHM (MQTT) -----------------
  const [algorithmState, setAlgorithmState] = useState(null);
  const [algorithmPending, setAlgorithmPending] = useState(false);

  useEffect(() => {
    if (!device?.id) return;

    const algoStatusTopic = `${device.id}/algorithm/status`;
    const algoGetTopic = `${device.id}/algorithm/get`;

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
  }, [device?.id]);

  const toggleAlgorithm = () => {
    if (algorithmPending || algorithmState === null) return;
    const newState = algorithmState === "ON" ? "OFF" : "ON";
    const setTopic = `${device.id}/algorithm/set`;
    mqttClient.publish(setTopic, newState);
    setAlgorithmPending(true);
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
          <h1 className="devices-title">
            Dashboard
          </h1>
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
      {copied && (
        <div className="copy-notification">User ID copied to clipboard</div>
      )}

      {/* Mobile footer */}
      <div className="mobile-footer-brand">
        <img src={footerWordmark} alt="A project by nodamic" />
      </div>
    </div>
  );
}

export default DeviceDashboard;
