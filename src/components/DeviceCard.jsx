// src/components/DeviceCard.jsx
import plugIcon from "../assets/plug-icon.svg";

function DeviceCard({ deviceId, device, status, onClick }) {
    const online = status === "Online";

    const handleClick = () => {
        if (online) {
            onClick();
        }
    };

    return (
        <div
            className={`device-card ${online ? 'online' : 'offline'}`}
            onClick={handleClick}
        >
            <div className={`device-icon ${online ? 'online' : 'offline'}`}>
                <img src={plugIcon} alt="Device Icon" />
            </div>
            <div className="device-info">
                <div className="device-name">{device.name || deviceId}</div>
                <div className="device-status">{status || "Offline"}</div>
            </div>
        </div>
    );
}

export default DeviceCard;