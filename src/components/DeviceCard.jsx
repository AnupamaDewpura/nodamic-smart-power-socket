// src/components/DeviceCard.jsx
function DeviceCard({ deviceId, device, status, onClick }) {
  const online = status === "Online";

  const handleClick = () => {
    if (online) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        padding: "16px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        width: "200px",
        cursor: online ? "pointer" : "not-allowed",
        backgroundColor: online ? "#1fc5a9ff" : "#ac5353ff",
        opacity: online ? 1 : 0.5,
        textAlign: "center",
        margin: "8px",
        pointerEvents: online ? "auto" : "none",
      }}
    >
      <h3>{device.name || deviceId}</h3>
      <p>{status || "Offline"}</p>
    </div>
  );
}

export default DeviceCard;
