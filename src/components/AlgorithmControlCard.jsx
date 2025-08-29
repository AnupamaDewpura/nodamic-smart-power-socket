// src/components/AlgorithmControlCard.jsx
/**
 * Props:
 * - algorithmState: "ON" | "OFF" | null
 * - algorithmPending: boolean
 * - onToggleAlgorithm: () => void
 */
export default function AlgorithmControlCard({
  algorithmState,
  algorithmPending,
  onToggleAlgorithm,
}) {
  const isActive = algorithmState === "ON"; // null = unknown/loading

  const handleSwitch = () => {
    if (algorithmPending || algorithmState === null) return;
    onToggleAlgorithm();
  };

  // Badge text + class with pending state reflected
  const badgeText =
    algorithmState === null
      ? "Loading…"
      : algorithmPending
      ? "Pending…"
      : isActive
      ? "Activated"
      : "Deactivated";

  const badgeClass =
    algorithmState === null
      ? "muted"
      : algorithmPending
      ? "muted"
      : isActive
      ? "ok"
      : "err";

  return (
    <div className="card algo-card">
      {/* Switch first, then title (per your spec) */}
      <div className="card-title-row big-toggle">
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          className={`toggle-switch ${isActive ? "right" : "left"} ${
            algorithmPending || algorithmState === null ? "disabled" : ""
          }`}
          onClick={handleSwitch}
          disabled={algorithmPending || algorithmState === null}
          title={
            algorithmState === null
              ? "Loading…"
              : algorithmPending
              ? "Pending…"
              : isActive
              ? "Deactivate"
              : "Activate"
          }
        >
          <span className="knob" />
        </button>

        <div className="card-title">Algorithm Control</div>
      </div>

      <p className="card-subtext">
        If Activated, the device’s internal algorithm will monitor frequent power cuts and if detected any, it will turn off the socket.
      </p>

      <div className="kv">
        <div className="kv-key">Internal Algorithm Status</div>
        <div className={`badge ${badgeClass}`}>{badgeText}</div>
      </div>
    </div>
  );
}
