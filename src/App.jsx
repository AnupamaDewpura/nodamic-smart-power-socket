import { useState, useEffect } from "react";
import Login from "./components/Login";
import DevicesList from "./components/DevicesList";
import DeviceDashboard from "./components/DeviceDashboard";
import AccountMenu from "./components/AccountMenu";

function App() {
  const [user, setUser] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [statuses, setStatuses] = useState({});

  // 👇 Watch selected device status
  useEffect(() => {
    if (!selectedDevice) return;

    const deviceId = selectedDevice.id;
    const currentStatus = statuses[deviceId]?.toLowerCase?.(); // normalize

    if (currentStatus && currentStatus !== "online") {
      console.log(
        `Device ${deviceId} went offline, going back to device list...`
      );
      setSelectedDevice(null);
    }
  }, [statuses, selectedDevice]);

  return (
    <div>
      <h1>Nodamic Smart Socket</h1>
      <Login onLogin={setUser} />

      {user && (
        <>
          <AccountMenu user={user} onLogout={() => setUser(null)} />
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
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
