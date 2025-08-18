import { useState, useEffect } from "react";
import Login from "./components/Login";
import DevicesList from "./components/DevicesList";
import DeviceDashboard from "./components/DeviceDashboard";

function App() {
  const [user, setUser] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(() => {
    const saved = localStorage.getItem("selectedDevice");
    return saved ? JSON.parse(saved) : null;
  });
  const [statuses, setStatuses] = useState({});

  // Persist device selection in localStorage
  useEffect(() => {
    if (selectedDevice) {
      localStorage.setItem("selectedDevice", JSON.stringify(selectedDevice));
    } else {
      localStorage.removeItem("selectedDevice");
    }
  }, [selectedDevice]);

  // Auto-deselect if device goes offline
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
    <div>
      <h1>Nodamic Smart Socket</h1>
      <Login onLogin={setUser} />

      {user && (
        <>
          {selectedDevice ? (
            <DeviceDashboard
              device={selectedDevice}
              onBack={() => setSelectedDevice(null)}
            />
          ) : (
            <DevicesList
              user={user}
              onSelectDevice={setSelectedDevice}
              statuses={statuses}
              setStatuses={setStatuses}
              onLogout={handleLogout}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
