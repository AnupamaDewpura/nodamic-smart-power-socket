// src/components/Devices.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

function Devices({ user }) {
  const [devices, setDevices] = useState({});

  useEffect(() => {
    if (!user) return;

    const devicesRef = ref(db, `users/${user.uid}/devices`);

    // Listen for device changes in realtime
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      const data = snapshot.val();
      setDevices(data || {}); // fallback empty if no devices yet
    });

    return () => unsubscribe(); // cleanup listener
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Devices;
