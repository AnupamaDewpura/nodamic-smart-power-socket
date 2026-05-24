# Nodamic Smart Power Socket Dashboard

A **React + Vite** web application that allows users to monitor and control IoT smart sockets.  
It integrates **Firebase Realtime Database**, **MQTT messaging**, and **Weather API alerts** to provide a responsive, secure, and feature-rich dashboard.

---

## ✨ Features

- **Login Page**
  - Secure Google Sign-In with Firebase Authentication.
  - Redirects users to their devices list after login.

- **Your Devices Page**
  - Displays paired devices linked to the logged-in account.
  - Includes a sidebar with account info (name, email, user ID) and logout.
  - Each device card leads to its dashboard.

- **Dashboard Page**
  - **Device Info Card** → Shows device ID, name, and relay status.  
  - **Manual & Schedule Control** → Toggle socket instantly (Manual) or set timed ON/OFF schedules (Schedule).  
  - **Algorithm Control** → Enable/disable internal algorithm via MQTT with watchdog safety.  
  - **Weather Alerts** → Real-time monitoring of critical alerts (thunderstorms, high winds, heavy rain) using WeatherAPI.  
  - **Power Cut Logs** → Scrollable table showing last 3 logs (up to 10 stored in Firebase).  

- **Responsive UI**
  - Mobile-first design with collapsible sidebar.
  - Flexible grid layout with **minimum card widths**, preventing layout clipping between desktop and tablet breakpoints.

- **Security**
  - Firebase, MQTT, and WeatherAPI credentials stored in `.env`.
  - `.gitignore` ensures sensitive keys aren’t committed.
  - Firebase rules enforce per-user/device isolation.

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite) + CSS (custom responsive styles)
- **Backend Services:**
  - Firebase Realtime Database (device states, schedules, logs)
  - Firebase Auth (Google Sign-In)
  - MQTT Broker (HiveMQ Cloud / custom broker)
  - WeatherAPI.com (weather alerts)
- **State Management:** React Hooks
- **Build Tool:** Vite

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/its-thakshila/nodamic-smart-power-socket.git
cd nodamic-smart-power-socket
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
Create a `.env` file in the project root:

```env
# Firebase
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-app.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-id
VITE_FIREBASE_APP_ID=your-id

# MQTT
VITE_MQTT_BROKER_URL=wss://your-broker-url:port/mqtt
VITE_MQTT_USERNAME=your-username
VITE_MQTT_PASSWORD=your-password

# WeatherAPI
VITE_WEATHER_API_KEY=your-key
```

⚠️ Don’t forget to copy `.env.example` → `.env` and fill in your keys.

### 4. Run in development
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
```

---

## 📂 Project Structure

```
NODAMIC-SMART-POWER-SOCKET/
 ├─ public/
 ├─ src/
 │   ├─ assets/               # Logos, icons
 │   ├─ components/           # React components
 │   │   ├─ AlgorithmControlCard.jsx
 │   │   ├─ CustomTimePicker.jsx
 │   │   ├─ DeviceCard.jsx
 │   │   ├─ DeviceDashboard.jsx
 │   │   ├─ DeviceInfoCard.jsx
 │   │   ├─ DevicesList.jsx
 │   │   ├─ Login.jsx
 │   │   ├─ ManualScheduleCard.jsx
 │   │   ├─ PowerCutLogsCard.jsx
 │   │   └─ WeatherAlertsCard.jsx
 │   ├─ services/             # Firebase, MQTT, Weather API
 │   │   ├─ firebase.js
 │   │   ├─ mqttClient.js
 │   │   └─ weather.js
 │   ├─ App.jsx
 │   ├─ dashboard.css
 │   ├─ index.css
 │   └─ main.jsx
 ├─ .env.example
 ├─ .gitignore
 ├─ index.html
 ├─ package.json
 ├─ vite.config.js
 └─ README.md
```

---

## 🔧 Development Notes

- **Watchdog Timeouts:** Relay & algorithm buttons reset from pending state after 10s if MQTT response never comes.  
- **Logs Management:** Only the last 10 logs are stored in Firebase; card shows 3 latest visible with scroll.  
- **Responsive Grid:** Uses CSS Grid + `minmax()` for consistent card layout between 768px–1440px.  
- **Weather Alerts:** Fetched automatically every 5 minutes; short summaries mapped to critical hazards only.  

---

## 📜 License
MIT License © 2025 Nodamic
