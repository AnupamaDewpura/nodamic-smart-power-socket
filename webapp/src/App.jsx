// src/App.jsx
import { useState, useEffect } from "react";
import Login from "./components/Login";
import DevicesList from "./components/DevicesList";
import DeviceDashboard from "./components/DeviceDashboard";
import "./index.css";

function App() {
  const [user, setUser] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(() => {
    const saved = localStorage.getItem("selectedDevice");
    return saved ? JSON.parse(saved) : null;
  });
  const [statuses, setStatuses] = useState({});
  const [connectionLost, setConnectionLost] = useState(!navigator.onLine);

  // Persist device selection in localStorage
  useEffect(() => {
    if (selectedDevice) {
      localStorage.setItem("selectedDevice", JSON.stringify(selectedDevice));
    } else {
      localStorage.removeItem("selectedDevice");
    }
  }, [selectedDevice]);

  // Track network status + deselect device if client goes offline
  useEffect(() => {
    // If we load while offline and a device is open, go back to list
    if (selectedDevice && navigator.onLine === false) {
      console.warn("Browser is offline on load; returning to devices list.");
      setSelectedDevice(null);
    }

    const handleOnline = () => {
      setConnectionLost(false);
      // no auto-select on reconnect; stay on Devices list
    };

    const handleOffline = () => {
      setConnectionLost(true);
      // If user is on a device dashboard, navigate back to the list
      if (selectedDevice) {
        console.warn("Browser went offline; returning to devices list.");
        setSelectedDevice(null);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [selectedDevice]);

  // Auto-deselect if the **IoT device itself** goes offline
  useEffect(() => {
    if (!selectedDevice) return;
    const deviceId = selectedDevice.id;
    const currentStatus = statuses[deviceId]?.toLowerCase?.();

    if (currentStatus && currentStatus !== "online") {
      console.log(`Device ${deviceId} went offline, going back to device list...`);
      setSelectedDevice(null);
    }
  }, [statuses, selectedDevice]);

  const handleLogout = () => {
    setSelectedDevice(null);
    localStorage.removeItem("selectedDevice");
    setUser(null);
  };

  return (
    <div className={`app-container ${!user ? "login-active" : ""}`}>
      {!user && <Login onLogin={setUser} />}

      {user && (
        <>
          {selectedDevice ? (
            <DeviceDashboard
              user={user}
              device={selectedDevice}
              onBack={() => setSelectedDevice(null)}
              onLogout={handleLogout}
            />
          ) : (
            <DevicesList
              user={user}
              onSelectDevice={setSelectedDevice}
              statuses={statuses}
              setStatuses={setStatuses}
              onLogout={handleLogout}
              connectionLost={connectionLost}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
