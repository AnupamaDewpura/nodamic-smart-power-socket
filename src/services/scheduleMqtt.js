// src/services/scheduleMqtt.js
import client from "./mqttClient";

/** Publish full/partial schedule config (retained). Do NOT include "enabled". */
export function pubScheduleSet(deviceId, cfg) {
  if (!deviceId) return;
  const topic = `${deviceId}/schedule/set`;
  const payload = JSON.stringify(cfg);
  client.publish(topic, payload, { qos: 1, retain: true });
}

/** Enable/disable schedule mode (retained) */
export function pubScheduleEnable(deviceId, on) {
  if (!deviceId) return;
  client.publish(`${deviceId}/schedule/enable`, on ? "ON" : "OFF", { qos: 1, retain: true });
}

/** Ask device to publish its current schedule/status (not retained) */
export function reqScheduleStatus(deviceId) {
  if (!deviceId) return;
  client.publish(`${deviceId}/schedule/get`, "STATUS", { qos: 0, retain: false });
}

/** Subscribe to device schedule/status (retained). Returns an unsubscribe fn. */
export function subScheduleStatus(deviceId, handler) {
  if (!deviceId) return () => {};
  const topic = `${deviceId}/schedule/status`;
  client.subscribe(topic, { qos: 1 });

  const onMsg = (t, msg) => {
    if (t !== topic) return;
    try {
      const data = JSON.parse(msg.toString());
      handler?.(data);
    } catch (e) {
      console.warn("Bad /schedule/status JSON:", e);
    }
  };

  client.on("message", onMsg);
  return () => {
    try { client.unsubscribe(topic); } catch {}
    try { client.removeListener("message", onMsg); } catch {}
  };
}
