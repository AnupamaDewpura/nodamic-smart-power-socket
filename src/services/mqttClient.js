// src/services/mqttClient.js
import mqtt from "mqtt";

const client = mqtt.connect(import.meta.env.VITE_MQTT_URL, {
  username: import.meta.env.VITE_MQTT_USERNAME,
  password: import.meta.env.VITE_MQTT_PASSWORD,
  protocol: "wss",
});

client.on("connect", () => {
  console.log("Connected to MQTT broker!");
});

client.on("error", (err) => {
  console.error("MQTT Connection error:", err);
});

export default client;
