// src/components/Devices.jsx
import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { ref, onValue } from "firebase/database";
import client from "../services/mqttClient";   // shared client

function Devices({ user }) {
  const [devices, setDevices] = useState({});
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    if (!user) return;

    const devicesRef = ref(db, `users/${user.uid}/devices`);

    const unsubscribe = onValue(devicesRef, (snapshot) => {
      const data = snapshot.val() || {};
      setDevices(data);

      // Subscribe to MQTT topics for each device
      Object.keys(data).forEach((deviceId) => {
        const topic = `devices/${deviceId}/status`;
        client.subscribe(topic);

        client.on("message", (receivedTopic, message) => {
          if (receivedTopic === topic) {
            setStatuses((prev) => ({
              ...prev,
              [deviceId]: message.toString(),
            }));
          }
        });
      });
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div>
      <h2>Your Devices</h2>
      {Object.keys(devices).length === 0 ? (
        <p>No devices yet</p>
      ) : (
        <ul>
          {Object.entries(devices).map(([deviceId, device]) => (
            <li key={deviceId}>
              <strong>{device.name || deviceId}</strong>
              {" — "}
              {statuses[deviceId] || "Offline"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Devices;
