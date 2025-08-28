// src/services/weather.js

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const BASE = "https://api.weatherapi.com/v1";

// Search locations for an input query
export async function searchLocations(q) {
  if (!API_KEY || !q?.trim()) return [];
  const url = `${BASE}/search.json?key=${encodeURIComponent(API_KEY)}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

// Fetch alerts via forecast endpoint (alerts=yes) for lat/lon
export async function fetchAlertsByLatLon(lat, lon) {
  if (!API_KEY || lat == null || lon == null) return { alerts: [] };
  const q = `${lat},${lon}`;
  const url = `${BASE}/forecast.json?key=${encodeURIComponent(API_KEY)}&q=${encodeURIComponent(q)}&days=1&alerts=yes`;
  const res = await fetch(url);
  if (!res.ok) return { alerts: [] };
  const data = await res.json();
  return { alerts: data?.alerts?.alert || [] };
}

/* ------------------------------------------------------------------ */
/* Power-critical filter + one-line summarizer with ranking            */
/* ------------------------------------------------------------------ */

// What we consider "power-risk" and how to label them
const CRITICAL_HAZARDS = [
  { rx: /(lightning|thunder|thunderstorm)/i, label: "Thunderstorm / Lightning", weight: 3 },
  { rx: /(high\s*wind|gale|\bwind(?!\s?chill))/i, label: "High Wind", weight: 3 },
  { rx: /(heavy\s*rain|rainstorm|torrential)/i, label: "Heavy Rain", weight: 2 },
];

// Severity ranking (typical WeatherAPI/CAP severities)
const SEVERITY_RANK = {
  extreme: 4,
  severe: 3,
  moderate: 2,
  minor: 1,
};

// 1) Keep only alerts that match our power-critical hazards.
//    Map each to a canonical { label, severityText, severityRank } form.
export function filterPowerCritical(alerts) {
  const out = [];

  for (const a of alerts || []) {
    const text = `${a?.event || ""} ${a?.headline || ""} ${a?.desc || ""}`;
    const sevText = String(a?.severity || "").trim();
    const sevRank = SEVERITY_RANK[sevText.toLowerCase?.()] ?? 0;

    // find first matching hazard
    const match = CRITICAL_HAZARDS.find((h) => h.rx.test(text));
    if (!match) continue; // drop non-power hazards like “meteorological risk of geological disaster”

    out.push({
      label: match.label, // canonical, nicely capitalized
      weight: match.weight,
      severityText: sevText || "",
      severityRank: sevRank,
      raw: a,
    });
  }

  return out;
}

// 2) Build a short, one-line summary, picking the **top 2** by severity & weight.
//    Example: "Thunderstorm / Lightning (Severe) • High Wind (Moderate)"
export function summarizeAlertsOneLine(critical) {
  if (!critical?.length) return "No critical weather alerts";

  // If multiple alerts of the same label exist, keep the most severe one
  const bestByLabel = new Map();
  for (const item of critical) {
    const existing = bestByLabel.get(item.label);
    if (!existing) {
      bestByLabel.set(item.label, item);
    } else {
      const a = existing,
        b = item;
      const aScore = (a.severityRank || 0) * 10 + (a.weight || 0);
      const bScore = (b.severityRank || 0) * 10 + (b.weight || 0);
      if (bScore > aScore) bestByLabel.set(item.label, b);
    }
  }

  // Sort by severity first, then weight (Thunderstorm/High Wind outrank Heavy Rain on ties)
  const ranked = Array.from(bestByLabel.values()).sort((x, y) => {
    if (y.severityRank !== x.severityRank) return y.severityRank - x.severityRank;
    return (y.weight || 0) - (x.weight || 0);
    });

  // Take only the top 2
  const top = ranked.slice(0, 2);

  // Build label parts with nice severity suffix when present
  const parts = top.map((item) => {
    const sev = item.severityText ? ` (${capitalizeFirst(item.severityText)})` : "";
    return `${item.label}${sev}`;
  });

  return parts.join(" | ");
}

// Helper: capitalize first letter only (e.g., "severe" -> "Severe")
function capitalizeFirst(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
