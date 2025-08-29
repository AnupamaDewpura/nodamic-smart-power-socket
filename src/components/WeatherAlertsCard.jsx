// src/components/WeatherAlertsCard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { db } from "../services/firebase";
import { ref, onValue, set } from "firebase/database";
import {
  searchLocations,
  fetchAlertsByLatLon,
  filterPowerCritical,
  summarizeAlertsOneLine,
} from "../services/weather";

import warnIcon from "../assets/weather-warn-icon.svg";
import safeIcon from "../assets/weather-safe-icon.svg";

export default function WeatherAlertsCard({ user, device }) {
  const deviceId = device?.id;
  const basePath = user?.uid && deviceId ? `users/${user.uid}/devices/${deviceId}` : null;
  const docPath = basePath ? `${basePath}/weather` : null;

  const [enabled, setEnabled] = useState(false);
  const [loc, setLoc] = useState(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [suppressLookup, setSuppressLookup] = useState(false);

  const [summary, setSummary] = useState("No critical weather alerts");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetching, setFetching] = useState(false);

  // Refs for positioning the portal dropdown
  const inputRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const pollTimer = useRef(null);
  const debounceTimer = useRef(null);

  const hasCoord = useMemo(
    () => loc && typeof loc.lat === "number" && typeof loc.lon === "number",
    [loc]
  );

  // Calculate dropdown position when suggestions change
  useEffect(() => {
    if (suggestions.length > 0 && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [suggestions]);

  // subscribe to /weather
  useEffect(() => {
    if (!docPath) return;
    const off = onValue(ref(db, docPath), (snap) => {
      const v = snap.val() || {};
      setEnabled(!!v.enabled);
      setLoc(v.location || null);
    });
    return () => off();
  }, [docPath]);

  // debounced search
  useEffect(() => {
    if (suppressLookup) {
      setSuggestions([]);
      return;
    }
    if (!query?.trim()) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setLookingUp(true);
      try {
        const hits = await searchLocations(query.trim());
        setSuggestions(
          (hits || []).slice(0, 8).map((h) => ({
            name: h.name,
            region: h.region,
            country: h.country,
            lat: h.lat,
            lon: h.lon,
          }))
        );
      } finally {
        setLookingUp(false);
      }
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [query, suppressLookup]);

  const pickSuggestion = (s) => {
    const text = `${s.name}${s.region ? ", " + s.region : ""}${s.country ? ", " + s.country : ""}`;
    setQuery(text);
    setSuggestions([]);
    setSuppressLookup(true);
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setSuppressLookup(false);
  };

  const resolveQueryToCoord = async () => {
    if (!query?.trim()) return loc || null;
    const hits = await searchLocations(query.trim());
    const s = (hits || [])[0];
    if (!s) return loc || null;
    return {
      name: s.name,
      region: s.region,
      country: s.country,
      lat: s.lat,
      lon: s.lon,
    };
  };

  const persistLocation = async () => {
    if (!docPath) return;
    const chosen = await resolveQueryToCoord();
    if (!chosen) return;
    await set(ref(db, docPath), {
      enabled,
      location: chosen,
    });
  };

  const toggleEnabled = async () => {
    if (!docPath) return;
    const newVal = !enabled;
    setEnabled(newVal);
    await set(ref(db, docPath), {
      enabled: newVal,
      location: newVal ? loc || null : null,
    });

    if (!newVal) {
      // reset UI when disabling
      setQuery("");
      setSuggestions([]);
      setSummary("No critical weather alerts");
      setLastUpdated(null);
    }
  };

  const fetchAndSummarize = async (locationObj = loc) => {
    if (!locationObj) return;
    setFetching(true);
    try {
      const { alerts } = await fetchAlertsByLatLon(locationObj.lat, locationObj.lon);
      const critical = filterPowerCritical(alerts);
      setSummary(summarizeAlertsOneLine(critical));
      setLastUpdated(Date.now());
    } catch {
      setSummary("Unable to fetch weather alerts");
    } finally {
      setFetching(false);
    }
  };

  // auto-fetch on mount / toggle / location change
  useEffect(() => {
    if (enabled && hasCoord) {
      fetchAndSummarize(loc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hasCoord, loc?.lat, loc?.lon]);

  // poll every 5 minutes
  useEffect(() => {
    clearInterval(pollTimer.current);
    if (enabled && hasCoord) {
      pollTimer.current = setInterval(() => fetchAndSummarize(loc), 5 * 60 * 1000);
    }
    return () => clearInterval(pollTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hasCoord, deviceId, loc?.lat, loc?.lon]);

  // last updated label (live)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return "Never updated";
    const mins = Math.max(0, Math.floor((Date.now() - lastUpdated) / 60000));
    if (mins === 0) return "Last updated just now";
    if (mins === 1) return "Last updated 1 min ago";
    return `Last updated ${mins} mins ago`;
  }, [lastUpdated, tick]);

  // derive chip text by state so it always shows the right prompt
  const chipText = useMemo(() => {
    if (!enabled) return "Please activate weather alerts";
    if (!hasCoord) return "Please select your device location";
    return fetching ? "Fetching latest alerts…" : summary;
  }, [enabled, hasCoord, fetching, summary]);

  const chipClass = useMemo(() => {
    // neutral/ok style for prompts and "No critical..." ; warn when an actual risk summary is shown
    if (
      chipText === "Please activate weather alerts" ||
      chipText === "Please select your device location" ||
      chipText === "No critical weather alerts" ||
      chipText === "Unable to fetch weather alerts" ||
      chipText === "Fetching latest alerts…"
    ) {
      return "ok";
    }
    return "warn";
  }, [chipText]);

  // Portal dropdown component
  const DropdownPortal = () => {
    if (suggestions.length === 0) return null;

    // Inside DropdownPortal
    return createPortal(
      <div
        className="suggestion-list-portal"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
      >
        {suggestions.map((s, i) => (
          <button
            key={`${s.name}-${s.lat}-${s.lon}-${i}`}
            className={`suggestion-item ${i === suggestions.length - 1 ? "last" : ""}`}
            type="button"
            onClick={() => pickSuggestion(s)}
          >
            {s.name}
            {s.region ? `, ${s.region}` : ""}
            {s.country ? `, ${s.country}` : ""}
          </button>
        ))}
      </div>,
      document.body
    );

  };

  return (
    <div className="card weather-card">
      <div className="card-title-row big-toggle">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`toggle-switch ${enabled ? "right" : "left"}`}
          onClick={toggleEnabled}
        >
          <span className="knob" />
        </button>
        <div className="card-title">Weather Alerts</div>
      </div>

      {/* Device Location */}
      <div className="field column">

        <div className="location-row">
          <div className="field-label">Location</div>
          <input
            ref={inputRef}
            className="text-input"
            placeholder={
              loc
                ? `${loc.name}${loc.region ? ", " + loc.region : ""}${loc.country ? ", " + loc.country : ""}`
                : "Search city / place"
            }
            value={query}
            onChange={handleQueryChange}
            disabled={!enabled}
          />
          <button
            className="pill-toggle"
            type="button"
            onClick={persistLocation}
            disabled={!enabled}
          >
            SET
          </button>
        </div>

        {/* Portal-based dropdown */}
        <DropdownPortal />
      </div>

      {/* Alert summary */}
      <div className="field column">
        <div className={`alert-chip ${chipClass}`}>
          <img
            src={(!enabled || chipClass === "warn") ? warnIcon : safeIcon}
            alt=""
            className="alert-chip-icon"
          />
          <div>
            {chipText}
            <div className="updated-text">{lastUpdatedText}</div>
          </div>

        </div>

      </div>
    </div>
  );
}