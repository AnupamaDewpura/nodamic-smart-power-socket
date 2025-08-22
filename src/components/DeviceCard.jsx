// src/components/DeviceCard.jsx
import checkIcon from "../assets/check-icon.svg";
import crossIcon from "../assets/cross-icon.svg";

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
            <div className={`device-status-icon ${online ? 'online' : 'offline'}`}>
                {online ? (
                    <img src={checkIcon} alt="Online" className="status-icon" />
                ) : (
                    <img src={crossIcon} alt="Offline" className="status-icon" />
                )}
            </div>
            <div className="device-info">
                <div className="device-name">{device.name || deviceId}</div>
                <div className="device-status">{status || "Offline"}</div>
            </div>
        </div>
    );
}

export default DeviceCard;