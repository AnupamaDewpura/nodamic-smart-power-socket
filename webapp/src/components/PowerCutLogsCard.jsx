// src/components/PowerCutLogsCard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../services/firebase";
import { ref, onValue, update } from "firebase/database";
import logsIcon from "../assets/logs-icon.svg";

export default function PowerCutLogsCard({ user, device }) {
  const deviceId = device?.id;
  const logsPath =
    user?.uid && deviceId
      ? `users/${user.uid}/devices/${deviceId}/logs`
      : null;

  const [rows, setRows] = useState([]);
  const trimmingRef = useRef(false);

  // track first row id to detect new top log
  const prevFirstRef = useRef(null);

  // refs to measure heights
  const bodyRef = useRef(null);
  const tableRef = useRef(null);
  const [bodyMaxHeight, setBodyMaxHeight] = useState(null); // px number

  // Subscribe and keep newest first; also trims to latest 10 in DB
  useEffect(() => {
    if (!logsPath) return;
    const off = onValue(ref(db, logsPath), async (snap) => {
      const v = snap.val();
      let list = [];
      if (v && typeof v === "object") {
        list = Object.entries(v).map(([key, val]) => ({
          id: key,
          ts: key,
          details: typeof val === "string" ? val : (val?.details ?? ""),
        }));
      }
      list.sort((a, b) => epochFromKey(b.ts) - epochFromKey(a.ts));
      const top10 = list.slice(0, 10);
      setRows(top10);

      const excess = list.slice(10);
      if (excess.length > 0 && !trimmingRef.current) {
        try {
          trimmingRef.current = true;
          const updates = {};
          for (const r of excess) updates[`${logsPath}/${r.id}`] = null;
          await update(ref(db), updates);
        } finally {
          trimmingRef.current = false;
        }
      }
    });
    return () => off();
  }, [logsPath]);

  // --- helpers ---
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

  // Measure first 3 rows and set body max-height accordingly
  const recomputeBodyHeight = () => {
    const bodyEl = bodyRef.current;
    if (!bodyEl) return;
    const rowEls = bodyEl.querySelectorAll(".logs-row");
    if (!rowEls.length) {
      setBodyMaxHeight(null);
      return;
    }
    let total = 0;
    for (let i = 0; i < Math.min(3, rowEls.length); i++) {
      const rect = rowEls[i].getBoundingClientRect();
      total += rect.height;
    }
    setBodyMaxHeight(Math.ceil(total));
  };

  // Recompute on rows change
  useEffect(() => {
    recomputeBodyHeight();
  }, [rows]);

  // Resize observers & font load
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      recomputeBodyHeight();
    });
    if (tableRef.current) ro.observe(tableRef.current);
    if (bodyRef.current) ro.observe(bodyRef.current);

    const onWinResize = () => recomputeBodyHeight();
    window.addEventListener("resize", onWinResize);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => recomputeBodyHeight());
    }

    return () => {
      window.removeEventListener("resize", onWinResize);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to top when a *newer first log* appears
  useEffect(() => {
    const firstId = rows[0]?.id || null;

    // If there's a new first row (newest log), jump to top.
    if (firstId && prevFirstRef.current && prevFirstRef.current !== firstId) {
      // Use setTimeout to ensure rows are rendered before scrolling
      setTimeout(() => {
        if (bodyRef.current) {
          bodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 0);
    }

    // Initialize or update the tracker
    if (firstId) prevFirstRef.current = firstId;
  }, [rows]);

  return (
    <div className="card logs-card">
      <div className="card-title">
        <img src={logsIcon} alt="Power Cut Logs" />
        Power Cut Logs
      </div>

      <div className="logs-table" ref={tableRef}>
        {/* Sticky header */}
        <div className="logs-header">
          <div className="col ts">Timestamp</div>
          <div className="col details">Details</div>
        </div>

        {/* Scrollable body showing exactly 3 rows (dynamic height) */}
        <div
          className="logs-body three-rows"
          ref={bodyRef}
          style={bodyMaxHeight ? { maxHeight: `${bodyMaxHeight}px` } : undefined}
        >
          {empty ? (
            <div className="logs-empty">No logs yet</div>
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
