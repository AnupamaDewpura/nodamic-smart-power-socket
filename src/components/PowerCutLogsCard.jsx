// src/components/PowerCutLogsCard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../services/firebase";
import { ref, onValue, update } from "firebase/database";

/**
 * RTDB shape with timestamp as the key:
 * users/{uid}/devices/{deviceId}/logs = {
 *   "2025-08-23T14:21:00Z": { details: "..." }  // ISO key
 *   "1692790860000":        { details: "..." }  // or ms-since-epoch key
 * }
 */
export default function PowerCutLogsCard({ user, device }) {
  const deviceId = device?.id;
  const logsPath =
    user?.uid && deviceId
      ? `users/${user.uid}/devices/${deviceId}/logs`
      : null;

  const [rows, setRows] = useState([]);
  const trimmingRef = useRef(false); // prevent re-entrant trim loops

  // Subscribe and keep newest first
  useEffect(() => {
    if (!logsPath) return;
    const off = onValue(ref(db, logsPath), async (snap) => {
      const v = snap.val();

      // Normalize entries: [{ id:key, ts:key, details }]
      let list = [];
      if (v && typeof v === "object") {
        list = Object.entries(v).map(([key, val]) => ({
          id: key,
          ts: key,
          details: typeof val === "string" ? val : (val?.details ?? ""),
        }));
      }

      // Sort by timestamp key (supports ISO or numeric)
      list.sort((a, b) => epochFromKey(b.ts) - epochFromKey(a.ts));

      // Keep only the latest 10 in UI (still allows scrolling beyond first 3)
      const top10 = list.slice(0, 10);
      setRows(top10);

      // Auto-trim older ones from RTDB
      const excess = list.slice(10);
      if (excess.length > 0 && !trimmingRef.current) {
        try {
          trimmingRef.current = true;
          const updates = {};
          for (const r of excess) {
            updates[`${logsPath}/${r.id}`] = null; // delete
          }
          await update(ref(db), updates);
        } finally {
          trimmingRef.current = false;
        }
      }
    });

    return () => off();
  }, [logsPath]);

  // ---- helpers ----
  function epochFromKey(key) {
    if (!key) return 0;
    const n = Number(key);
    if (!Number.isNaN(n) && Number.isFinite(n)) {
      return n < 1e12 ? n * 1000 : n; // seconds vs ms
    }
    const ms = new Date(key).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }

  const pad2 = (n) => String(n).padStart(2, "0");
  function fmt(tsKey) {
    const ms = epochFromKey(tsKey);
    if (!ms) return "—";
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
      d.getHours()
    )}:${pad2(d.getMinutes())}`;
  }

  const empty = useMemo(() => rows.length === 0, [rows]);

  return (
    <div className="card logs-card">
      <div className="card-title-row">
        <div className="card-title">Power Cut Logs</div>
      </div>

      <div className="logs-table">
        {/* Sticky header */}
        <div className="logs-header">
          <div className="col ts">Timestamp</div>
          <div className="col details">Details</div>
        </div>

        {/* Scrollable body showing 3 rows at a time */}
        <div className="logs-body three-rows">
          {empty ? (
            <div className="logs-empty">No power cut logs yet</div>
          ) : (
            rows.map((r) => (
              <div className="logs-row" key={r.id}>
                <div className="col ts">{fmt(r.ts)}</div>
                <div className="col details">{r.details || "—"}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
