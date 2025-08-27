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
  const isActive = algorithmState === "ON";              // null = unknown/loading

  const handleSwitch = () => {
    if (algorithmPending || algorithmState === null) return;
    onToggleAlgorithm();
  };

  return (
    <div className="card algo-card">
      {/* Switch first, then title (per your spec) */}
      <div className="card-title-row big-toggle">
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          className={`mode-switch ${isActive ? "right" : "left"} ${
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
        Enable or disable the internal power anomaly detection algorithm. When active,
        the device will automatically react based on its learned patterns.
      </p>

      <div className="kv">
        <div className="kv-key">Internal Algorithm Status</div>
        <div
          className={`badge ${
            algorithmState === null
              ? "muted"
              : isActive
              ? "ok"
              : "err"
          }`}
        >
          {algorithmState === null
            ? "Loading…"
            : isActive
            ? "Activated"
            : "Deactivated"}
        </div>
      </div>
    </div>
  );
}
