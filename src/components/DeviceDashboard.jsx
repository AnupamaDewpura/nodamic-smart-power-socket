// src/components/DeviceDashboard.jsx
function DeviceDashboard({ device, onBack }) {
    return (
        <div>
            <button onClick={onBack}>Back to Devices</button>
            <h2>{device.name} Dashboard</h2>
            <p>Device ID: {device.name || device.id}</p>
            {/* Future device controls go here */}
        </div>
    );
}

export default DeviceDashboard;
