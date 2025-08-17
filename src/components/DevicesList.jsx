// src/components/DevicesList.jsx
import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { ref, onValue } from "firebase/database";
import DeviceCard from "./DeviceCard";

function DevicesList({ user, onSelectDevice, statuses, setStatuses }) {
  const [devices, setDevices] = useState({});

  useEffect(() => {
    if (!user) return;

    const devicesRef = ref(db, `users/${user.uid}/devices`);

    // Watch devices list
    const unsubscribeDevices = onValue(devicesRef, (snapshot) => {
      const data = snapshot.val() || {};
      setDevices(data);

      // For each device, subscribe to its status
      Object.keys(data).forEach((deviceId) => {
        const statusRef = ref(db, `users/${user.uid}/devices/${deviceId}/status`);
        onValue(statusRef, (snap) => {
          setStatuses((prev) => ({
            ...prev,
            [deviceId]: snap.val() || "Offline",
          }));
        });
      });
    });

    return () => unsubscribeDevices();
  }, [user, setStatuses]);

  return (
    <div>
      <h2>Your Devices</h2>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {Object.entries(devices).length === 0 ? (
          <p>No devices yet</p>
        ) : (
          Object.entries(devices).map(([deviceId, device]) => (
            <DeviceCard
              key={deviceId}
              deviceId={deviceId}
              device={device}
              status={statuses[deviceId]}
              onClick={() => onSelectDevice({ ...device, id: deviceId })}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default DevicesList;
