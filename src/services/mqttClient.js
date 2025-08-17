// src/services/mqttClient.js
import mqtt from "mqtt";

const options = {
  username: "admin",
  password: "admin@Nodamic2025",
  protocol: "wss",
};

const client = mqtt.connect(
  "wss://52418d0ed1d742209521789a5b2a2f54.s1.eu.hivemq.cloud:8884/mqtt",
  options
);

client.on("connect", () => {
  console.log("Connected to HiveMQ Cloud!");
});

client.on("error", (err) => {
  console.error("MQTT Connection error:", err);
});

export default client;
