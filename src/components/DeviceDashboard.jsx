// src/components/DeviceDashboard.jsx
import { useEffect, useState } from "react";
import mqttClient from "../services/mqttClient";

function DeviceDashboard({ device, onBack }) {
  const [relayState, setRelayState] = useState(null); // null = unknown until confirmed
  const [relayPending, setRelayPending] = useState(false);

  const [algorithmState, setAlgorithmState] = useState(null); // null = unknown
  const [algorithmPending, setAlgorithmPending] = useState(false);

  // ----------------- RELAY -----------------
  useEffect(() => {
    if (!device?.id) return;

    const relayStatusTopic = `${device.id}/relay/status`;
    const relayGetTopic = `${device.id}/relay/get`;

    mqttClient.subscribe(relayStatusTopic, (err) => {
      if (err) console.error("Subscribe error:", err);
    });

    const handleMessage = (topic, message) => {
      if (topic === relayStatusTopic) {
        const status = message.toString().toUpperCase();
        console.log("Relay status received:", status);
        setRelayState(status);
        setRelayPending(false);
      }
    };

    mqttClient.on("message", handleMessage);

    // Request current relay status on mount
    console.log("Requesting relay status...");
    mqttClient.publish(relayGetTopic, "STATUS");

    return () => {
      mqttClient.unsubscribe(relayStatusTopic);
      mqttClient.off("message", handleMessage);
    };
  }, [device?.id]);

  const toggleRelay = () => {
    if (relayPending || relayState === null) return;

    const newState = relayState === "ON" ? "OFF" : "ON";
    const setTopic = `${device.id}/relay/set`;

    console.log("Publishing relay set:", newState);
    mqttClient.publish(setTopic, newState);

    setRelayPending(true);
  };

  // ----------------- ALGORITHM (Power Anomaly Detection) -----------------
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
        console.log("Algorithm status received:", status);
        setAlgorithmState(status);
        setAlgorithmPending(false);
      }
    };

    mqttClient.on("message", handleMessage);

    // Request current algorithm status on mount
    console.log("Requesting algorithm status...");
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

    console.log("Publishing algorithm set:", newState);
    mqttClient.publish(setTopic, newState);

    setAlgorithmPending(true);
  };

  return (
    <div>
      <button onClick={onBack}>Back to Devices</button>
      <h2>{device.name} Dashboard</h2>
      <p>Device ID: {device.id}</p>

      {/* Relay Toggle */}
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={toggleRelay}
          disabled={relayPending || relayState === null}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "none",
            cursor:
              relayPending || relayState === null ? "not-allowed" : "pointer",
            backgroundColor:
              relayState === "ON" ? "#1fc5a9ff" : "#ac5353ff",
            color: "#fff",
            opacity: relayPending ? 0.6 : 1,
          }}
        >
          {relayState === null
            ? "Loading..."
            : relayPending
            ? "Pending..."
            : relayState === "ON"
            ? "Turn OFF Relay"
            : "Turn ON Relay"}
        </button>
      </div>

      {/* Algorithm Detection Toggle */}
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={toggleAlgorithm}
          disabled={algorithmPending || algorithmState === null}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "none",
            cursor:
              algorithmPending || algorithmState === null
                ? "not-allowed"
                : "pointer",
            backgroundColor:
              algorithmState === "ON" ? "#1f7ac5ff" : "#ac5353ff",
            color: "#fff",
            opacity: algorithmPending ? 0.6 : 1,
          }}
        >
          {algorithmState === null
            ? "Loading..."
            : algorithmPending
            ? "Pending..."
            : algorithmState === "ON"
            ? "Deactivate Algorithm"
            : "Activate Algorithm"}
        </button>
      </div>
    </div>
  );
}

export default DeviceDashboard;
