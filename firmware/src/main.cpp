/************************************************************
 * Nodamic ESP32-C3 SuperMini — Captive Portal + Firebase RTDB
 * + Fast Presence via MQTT (TLS) LWT + Heartbeat + Relay Control
 * + Frequent Power-Cut Algorithm (VSENSE on D1)
 * + Durable Powercut Logs (online or offline via NVS queue)
 * + MQTT Scheduling (retained JSON + NVS + local-time eval)
 *
 * Logs go to:
 *   /users/{userId}/devices/{DEVICE_ID}/logs/{YYYY-MM-DD}T{HH:MM:SS}Z/details
 *
 * Schedule topics (retained):
 *   {DEVICE_ID}/schedule/set     (JSON without "enabled")
 *   {DEVICE_ID}/schedule/status  (JSON)
 *   {DEVICE_ID}/schedule/enable  ("ON"|"OFF")
 *   {DEVICE_ID}/schedule/get     ("STATUS" -> replies on /status)
 ************************************************************/

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include "driver/gpio.h"
#include <time.h>
#include <ArduinoJson.h>

/************ Firebase (metadata only) ************/
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

/************ MQTT ************/
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

/************ Addressable LED (NeoPixel) ************/
#include <Adafruit_NeoPixel.h>

#include "secrets.h"

static const char* DEVICE_ID = "device-001";

/* ========= Root CA (ISRG Root X1, Let's Encrypt) ========= */
static const char ROOT_CA_ISRG_X1[] PROGMEM = R"PEM(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)PEM";

/************ Firebase globals ************/
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig fbConfig;
bool fbInitialized    = false;
unsigned long fbNextSignupMs = 0;
uint32_t fbBackoffMs = 10000;
const uint32_t FB_BACKOFF_MAX = 600000;
const unsigned long HEARTBEAT_MS = 2000;
unsigned long fbCooldownUntilMs = 0;

/************ Pins ************/
static const int PIN_VSENSE         = 1;   // D1 (HIGH=power present, LOW=no power)
static const int PIN_RELAY          = 3;   // D3
static const int PIN_LED1           = 0;   // D6 -> addressable LED (NeoPixel)
static const int PIN_BTN            = 10;  // D10 (pressed = HIGH)
static const bool RELAY_ACTIVE_HIGH = true;

/************ Addressable LED setup ************/
static const uint8_t NEO_NUM = 1;
Adafruit_NeoPixel neo(NEO_NUM, PIN_LED1, NEO_GRB + NEO_KHZ800);
static const uint8_t LED_BRIGHTNESS = 32;         // 0-255
static const uint32_t LED_RELAY_ON   = Adafruit_NeoPixel::Color(0, 255, 0);     // green
static const uint32_t LED_RELAY_OFF  = Adafruit_NeoPixel::Color(255, 0, 0);     // red
static const uint32_t LED_AP_MODE    = Adafruit_NeoPixel::Color(255, 255, 255); // white
static const uint32_t LED_OFF_COLOR  = Adafruit_NeoPixel::Color(0, 0, 0);       // utility only

/************ Button ************/
static const unsigned long LONG_PRESS_MS = 5000;
static const unsigned long DEBOUNCE_MS   = 50;
static const bool BTN_ACTIVE_LEVEL       = HIGH;

/************ Captive portal ************/
static const byte DNS_PORT = 53;
DNSServer dnsServer;
WebServer server(80);
IPAddress apIP(192,168,4,1);
const char* AP_SSID = "Nodamic-Smart-Power-Socket";

/************ NVS ************/
Preferences prefs;    // main (credentials)
Preferences prefsPD;  // pending-deletion

String p_ssid, p_pass, p_user, p_name;

bool portalActive = false;
bool wantConnectNow = false;

/************ LED mode shim (kept API; state-based rule) ************/
enum LedMode { LED_OFF, LED_SOLID, LED_SLOW, LED_FAST };
LedMode ledMode = LED_OFF;

static inline void neoShowColor(uint32_t c){
  neo.setBrightness(LED_BRIGHTNESS);
  neo.setPixelColor(0, c);
  neo.show();
}
bool isRelayOn(); // fwd

// Central rule — LED shows:
//   AP mode        -> white
//   Relay ON       -> green
//   Relay OFF      -> red
void refreshStatusLed(){
  if (portalActive)      { neoShowColor(LED_AP_MODE);  return; }
  if (isRelayOn())       { neoShowColor(LED_RELAY_ON); return; }
  /* else */               neoShowColor(LED_RELAY_OFF);
}

// Keep API surface; delegate to state-based rule
void setLed(LedMode m){
  ledMode = m;
  refreshStatusLed();
}
void tickLed(){}

/************ Helpers: credentials ************/
void armButtonPulldown(const char* where){
  pinMode(PIN_BTN, INPUT_PULLDOWN);
  gpio_pulldown_en((gpio_num_t)PIN_BTN);
  (void)where;
}

void loadPrefs(){
  prefs.begin("nodamic", true);
  p_ssid = prefs.getString("wifi_ssid", "");
  p_pass = prefs.getString("wifi_pass", "");
  p_user = prefs.getString("userId", "");
  p_name = prefs.getString("deviceName", "");
  prefs.end();
}
void savePrefs(const String& ssid,const String& pass,const String& user,const String& name){
  prefs.begin("nodamic", false);
  prefs.putString("wifi_ssid", ssid);
  prefs.putString("wifi_pass", pass);
  prefs.putString("userId", user);
  prefs.putString("deviceName", name);
  prefs.end();
}
void clearPrefs(){
  prefs.begin("nodamic", false);
  prefs.clear();
  prefs.end();
}

/************ Pending Deletion (separate NVS namespace) ************/
void pdSet(const String& userId, const String& devId){
  prefsPD.begin("nodpd", false);
  prefsPD.putBool("flag", true);
  prefsPD.putString("userId", userId);
  prefsPD.putString("deviceId", devId);
  prefsPD.end();
}
bool pdGet(String& userId, String& devId){
  prefsPD.begin("nodpd", true);
  bool flag = prefsPD.getBool("flag", false);
  if (flag) {
    userId = prefsPD.getString("userId", "");
    devId  = prefsPD.getString("deviceId", DEVICE_ID);
  } else {
    userId = "";
    devId  = DEVICE_ID;
  }
  prefsPD.end();
  return flag;
}
void pdClear(){
  prefsPD.begin("nodpd", false);
  prefsPD.clear();
  prefsPD.end();
}

/************ Minimal HTML ************/
const char* FORM_HTML = R"HTML(<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Nodamic Setup</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;margin:24px;display:grid;place-items:center}form{max-width:340px}label{display:block;margin:12px 0 6px}input{width:92%;padding:10px;border:1px solid #ccc;border-radius:8px}button{margin-top:16px;width:100%;padding:12px;border:1px solid #ccc;border-radius:10px;cursor:pointer}</style></head><body><form method="POST" action="/save"><label>Wi-Fi SSID</label><input name="ssid" required /><label>Wi-Fi Password</label><input name="pass" type="password" /><label>User ID</label><input name="userid" required /><label>Device Name</label><input name="devname" required /><button type="submit">Continue</button></form></body></html>)HTML";
const char* SAVED_HTML = R"HTML(<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Saved</title></head><body style="font-family:system-ui;margin:24px"><p>Saved. Connecting to Wi-Fi...</p></body></html>)HTML";

/************ Captive portal ************/
void handleRoot(){ server.send(200, "text/html", FORM_HTML); }
void handleNotFound(){ server.sendHeader("Location", String("http://")+apIP.toString()+"/", true); server.send(302, "text/plain", ""); }

void startPortal(){
  WiFi.mode(WIFI_AP);
  delay(100);
  WiFi.softAP(AP_SSID);
  delay(100);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255,255,255,0));
  dnsServer.start(DNS_PORT, "*", apIP);
  server.on("/", HTTP_GET, handleRoot);
  server.on("/save", HTTP_POST, [](){
    String ssid   = server.arg("ssid");
    String pass   = server.arg("pass");
    String userid = server.arg("userid");
    String dname  = server.arg("devname");
    savePrefs(ssid, pass, userid, dname);
    server.send(200, "text/html", SAVED_HTML);
    dnsServer.stop(); server.stop(); WiFi.softAPdisconnect(true);
    portalActive = false;
    wantConnectNow = true;
    armButtonPulldown("after AP stop");
  });
  server.onNotFound(handleNotFound);
  server.begin();
  portalActive = true;
  setLed(LED_OFF); // will show white (AP mode)
  armButtonPulldown("portal start");
}

/************ Time (TLS) ************/
bool timeSyncArmed = false;
bool timeReady     = false;

void beginTimeSync(){
  configTime(0, 0, "pool.ntp.org", "time.nist.gov", "time.google.com"); // UTC
  timeSyncArmed = true;
  timeReady     = false;
}
void pollTimeSync(){
  if (!timeSyncArmed || timeReady) return;
  time_t now = time(nullptr);
  if (now > 1600000000) timeReady = true;
}

/************ Firebase helpers ************/
bool firebaseInitIfNeeded(){
  if (fbInitialized) return true;
  if (WiFi.status() != WL_CONNECTED) return false;
  if (!timeReady) return false;

  fbConfig.api_key      = FB_API_KEY;
  fbConfig.database_url = FB_DATABASE_URL;
  fbConfig.token_status_callback = tokenStatusCallback;
  Firebase.reconnectWiFi(true);

  unsigned long now = millis();
  if (now < fbNextSignupMs) return false;

  if (!Firebase.signUp(&fbConfig, &auth, "", "")){
    fbNextSignupMs = now + fbBackoffMs;
    fbBackoffMs = min(FB_BACKOFF_MAX, fbBackoffMs * 2);
    return false;
  }

  Firebase.begin(&fbConfig, &auth);
  fbInitialized  = true;
  fbBackoffMs    = 10000;
  fbNextSignupMs = 0;
  return true;
}

bool fbReadySoon(unsigned long waitMs=4000){
  unsigned long deadline = millis() + waitMs;
  while ((!fbInitialized || !Firebase.ready() || !timeReady) && millis() < deadline){
    firebaseInitIfNeeded();
    delay(50);
  }
  return Firebase.ready() && timeReady;
}

bool fbSetString(const String& path, const String& val){
  if (!Firebase.ready() || !timeReady) return false;
  return Firebase.RTDB.setString(&fbdo, path.c_str(), val);
}

bool fbDeletePath(const String& path){
  if (!Firebase.ready() || !timeReady) return false;
  return Firebase.RTDB.deleteNode(&fbdo, path.c_str());
}

// Push /name later, without blocking presence
void fbPushNameIfDirty(const String& userId, const String& deviceId, const String& name){
  if (userId.isEmpty()) return;
  String base = "/users/" + userId + "/devices/" + deviceId;
  static String lastPushedName = "";
  if (name.length() && name != lastPushedName) {
    if (fbSetString(base + "/name", name)) lastPushedName = name;
  }
}

/************ Pending Deletion processor ************/
bool processPendingDeletionIfAny(){
  String uid, did;
  if (!pdGet(uid, did)) return false;
  if (uid.isEmpty()) { pdClear(); return false; }
  if (WiFi.status() != WL_CONNECTED || !timeReady) return false;
  if (!fbReadySoon(3000)) return false;

  String path = "/users/" + uid + "/devices/" + did;
  if (fbDeletePath(path)) { pdClear(); return true; }
  return false;
}

/************ Wi-Fi events ************/
void onWiFiEvent(WiFiEvent_t event){
  if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP){
    refreshStatusLed(); // green if relay ON, red if OFF (AP is false here)
    armButtonPulldown("STA GOT_IP");
    fbCooldownUntilMs = 0;
    beginTimeSync();
  } else if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED){
    refreshStatusLed(); // AP mode (if active) stays white; otherwise red/green by relay
    armButtonPulldown("STA DISCONNECTED");
    timeSyncArmed = false;
    timeReady     = false;
    fbCooldownUntilMs = millis() + 1500;
  }
}

/************ Wi-Fi connect using stored creds ************/
void connectWiFi(const char* ssid, const char* pass){
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setSleep(false);
  setLed(LED_OFF); // shows relay state unless AP mode forces white
  WiFi.begin(ssid, pass);
}
bool connectWithStored(uint32_t timeoutMs=30000){
  loadPrefs();
  if (p_ssid.isEmpty()) return false;
  connectWiFi(p_ssid.c_str(), p_pass.c_str());
  unsigned long deadline = millis() + timeoutMs;
  while (millis() < deadline){
    if (WiFi.status() == WL_CONNECTED) return true;
    delay(150);
    tickLed();
  }
  return false;
}

/************ Long-press reset ************/
void checkLongPress(){
  static bool stableState = !BTN_ACTIVE_LEVEL;
  static bool lastRead = !BTN_ACTIVE_LEVEL;
  static unsigned long lastChangeMs = 0;
  static bool pressInProgress = false;
  static unsigned long pressStartMs = 0;

  bool raw = (digitalRead(PIN_BTN) == BTN_ACTIVE_LEVEL);
  if (raw != lastRead){ lastChangeMs = millis(); lastRead = raw; }

  if (millis() - lastChangeMs >= DEBOUNCE_MS){
    if (stableState != lastRead){
      stableState = lastRead;

      if (stableState){
        pressInProgress = true; pressStartMs = millis();
      } else {
        if (pressInProgress && (millis() - pressStartMs >= LONG_PRESS_MS)){
          // Ensure LED goes off during reset regardless of state
          neoShowColor(LED_OFF_COLOR);

          if (p_user.isEmpty()) loadPrefs();
          if (!p_user.isEmpty()) pdSet(p_user, DEVICE_ID);

          if (WiFi.status() == WL_CONNECTED && fbReadySoon(3000)) {
            String path = "/users/" + p_user + "/devices/" + String(DEVICE_ID);
            if (fbDeletePath(path)) pdClear();
          }

          delay(50);
          clearPrefs();
          WiFi.disconnect(true,true);
          delay(50);
          ESP.restart();
        }
        pressInProgress = false;
      }
    }
  }
}

/******************** MQTT SECTION (TLS) ********************/
WiFiClientSecure tlsClient;
PubSubClient mqtt(tlsClient);

// Global topics — declared ONCE
String topicRelayGet,  topicRelayStatus, topicRelaySet;
String topicAlgoGet,   topicAlgoStatus,  topicAlgoSet;
String topicPresence,  topicLastSeen;
String topicPowerGet,  topicPowerStatus;
String topicSchedSet, topicSchedGet, topicSchedStatus, topicSchedEnable;

String mqttClientId;

bool algorithmOn = false; // algorithm toggle (via MQTT)

/************ RELAY helpers ************/
bool isRelayOn(){
  int lvl = digitalRead(PIN_RELAY);
  return RELAY_ACTIVE_HIGH ? (lvl == HIGH) : (lvl == LOW);
}
void publishRelayStatus(){
  const char* payload = isRelayOn() ? "ON" : "OFF";
  if (mqtt.connected()) mqtt.publish(topicRelayStatus.c_str(), payload, true);
}
void publishAlgorithmStatus(){
  const char* payload = algorithmOn ? "ON" : "OFF";
  if (mqtt.connected()) mqtt.publish(topicAlgoStatus.c_str(), payload, true);
}
void publishPowerStatus(){
  int raw = digitalRead(PIN_VSENSE);
  const char* payload = (raw == HIGH) ? "HAS" : "NO";
  if (mqtt.connected()) mqtt.publish(topicPowerStatus.c_str(), payload, true);
}
void setRelay(bool on){
  if (RELAY_ACTIVE_HIGH) digitalWrite(PIN_RELAY, on ? HIGH : LOW);
  else                   digitalWrite(PIN_RELAY, on ? LOW : HIGH);
  publishRelayStatus();
  refreshStatusLed(); // reflect relay change
}

/************ Algorithm config & state ************/
struct AlgoConfig {
  uint8_t       threshold     = 3;
  unsigned long windowMs      = 60000;
  unsigned long minOutageMs   = 300;
  unsigned long debounceMs    = 40;
  unsigned long longOutageMs  = 1800000; // 30 min
} algoCfg;

static int  vsenseLastStable       = HIGH;
static int  vsenseLastRaw          = HIGH;
static unsigned long vsenseLastChangeMs = 0;
static bool outageInProgress       = false;
static unsigned long outageStartMs = 0;
static bool outageCounted          = false;
static bool longOutageLogged       = false;
static bool longOutageOccurred     = false;

static const uint8_t CUT_BUF_MAX = 10;
static unsigned long cutTimes[CUT_BUF_MAX];
static uint8_t cutCount = 0;

void recordPowerCut(unsigned long whenMs);
void pruneOldCuts(unsigned long nowMs);
void resetCutHistory();
void resetCutWindowOnly();
void monitorVSenseAndDetect();

/************ POWER-CUT LOGGING ************/
String makeIso8601Z(time_t ts){
  struct tm gt; gmtime_r(&ts, &gt);
  char buf[21]; strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &gt);
  return String(buf);
}
String fbLogDetailsPath(const String& userId, const String& devId, const String& key){
  String path; path.reserve(64);
  path  = "/users/"; path += userId;
  path += "/devices/"; path += devId;
  path += "/logs/"; path += key;
  path += "/details";
  return path;
}
struct LogPayload { time_t ts; String msg; unsigned long ms; };

static const uint16_t LOGS_MAX_BUFFER = 30;

static uint32_t logsFirstId(){ Preferences p; p.begin("nodlogs", true); uint32_t v=p.getULong("first",0); p.end(); return v; }
static uint32_t logsNextId(){ Preferences p; p.begin("nodlogs", true); uint32_t v=p.getULong("next",0);  p.end(); return v; }
static void logsSetFirst(uint32_t v){ Preferences p; p.begin("nodlogs", false); p.putULong("first",v); p.end(); }
static void logsSetNext(uint32_t v){ Preferences p; p.begin("nodlogs", false); p.putULong("next",v);  p.end(); }
static uint32_t logsCount(){ uint32_t f=logsFirstId(), n=logsNextId(); return (n>=f)?(n-f):0; }
static void logsDropOldestIfNeeded(){
  while (logsCount() > LOGS_MAX_BUFFER){
    uint32_t f = logsFirstId(); String key = "e"; key += f;
    Preferences p; p.begin("nodlogs", false); p.remove(key.c_str()); p.end();
    logsSetFirst(f + 1);
  }
}
static void enqueueLog(const LogPayload& pl){
  uint32_t id = logsNextId(); String key = "e"; key += id;
  String val; val.reserve(16+16+pl.msg.length());
  val += String((unsigned long)pl.ts); val += '|';
  val += String(pl.ms); val += '|';
  val += pl.msg;
  Preferences p; p.begin("nodlogs", false); p.putString(key.c_str(), val); p.end();
  logsSetNext(id + 1); logsDropOldestIfNeeded();
}
static bool trySendLogNow(const LogPayload& pl){
  if (p_user.isEmpty()) loadPrefs();
  if (p_user.isEmpty()) return false;
  if (!Firebase.ready() || !timeReady) return false;
  time_t ts = pl.ts ? pl.ts : time(nullptr);
  String key = makeIso8601Z(ts);
  String path = fbLogDetailsPath(p_user, DEVICE_ID, key);
  return fbSetString(path, pl.msg);
}
static void flushOfflineLogs(){
  if (!Firebase.ready() || !timeReady) return;
  uint32_t f = logsFirstId(), n = logsNextId();
  uint8_t flushed = 0; const uint8_t BUDGET = 4;
  while (f < n && flushed < BUDGET){
    String key = "e"; key += f;
    Preferences p; p.begin("nodlogs", true);
    String raw = p.getString(key.c_str(), ""); p.end();
    if (raw.length()==0){ Preferences pw; pw.begin("nodlogs", false); pw.remove(key.c_str()); pw.end(); logsSetFirst(f+1); f = logsFirstId(); continue; }
    int p1 = raw.indexOf('|'); int p2 = (p1>=0) ? raw.indexOf('|', p1+1) : -1;
    if (p1<0 || p2<0){ Preferences pw; pw.begin("nodlogs", false); pw.remove(key.c_str()); pw.end(); logsSetFirst(f+1); f = logsFirstId(); continue; }
    time_t ts = (time_t) strtoul(raw.substring(0,p1).c_str(), nullptr, 10);
    unsigned long ms = (unsigned long) strtoul(raw.substring(p1+1,p2).c_str(), nullptr, 10);
    String msg = raw.substring(p2+1);
    LogPayload payload{ ts ? ts : (time_t)time(nullptr), msg, ms };
    if (trySendLogNow(payload)){ Preferences pw; pw.begin("nodlogs", false); pw.remove(key.c_str()); pw.end(); logsSetFirst(f+1); f = logsFirstId(); flushed++; }
    else break;
  }
}
static void logEventNowOrQueue(const String& message){
  LogPayload p; p.ms = millis(); p.ts = timeReady ? time(nullptr) : 0; p.msg = message;
  bool sent = (WiFi.status()==WL_CONNECTED && timeReady && Firebase.ready()) ? trySendLogNow(p) : false;
  if (!sent) enqueueLog(p);
}

/************ SCHEDULER (CONFIG + RUNTIME) ************/
struct ScheduleCfg {
  bool   enabled        = false;
  char   start[6]       = "00:00";   // "HH:MM"
  char   end_[6]        = "00:00";   // "HH:MM"
  bool   repeat         = true;
  bool   modeOn         = true;      // inside window => ON if true
  int16_t tzOffsetMin   = 0;         // minutes from UTC (e.g., +330)
};
struct ScheduleState {
  bool   preservedManualOn   = false; // snapshot at enable
  bool   insideWindow        = false;
  time_t lastEvalSec         = 0;

  // track if we've ever been inside since the last enable/config edit
  bool           everEntered            = false;
  unsigned long  suppressDisableUntilMs = 0; // gate one-shot disable after edits
};
ScheduleCfg   schedCfg;
ScheduleState schedState;
Preferences   prefsSched;

// Force immediate apply flag (set by config/enable handlers)
static bool schedForceNow = false;

void schedLoadFromNVS(){
  prefsSched.begin("nodsched", true);
  schedCfg.enabled      = prefsSched.getBool("enabled", false);
  schedCfg.repeat       = prefsSched.getBool("repeat", true);
  schedCfg.modeOn       = prefsSched.getBool("modeOn", true);
  schedCfg.tzOffsetMin  = (int16_t)prefsSched.getShort("tzmin", 0);
  String s = prefsSched.getString("start", "00:00");
  String e = prefsSched.getString("end",   "00:00");
  strncpy(schedCfg.start, s.c_str(), 5); schedCfg.start[5] = 0;
  strncpy(schedCfg.end_,  e.c_str(), 5); schedCfg.end_[5]  = 0;
  prefsSched.end();
}
void schedSaveToNVS(){
  prefsSched.begin("nodsched", false);
  prefsSched.putBool("enabled", schedCfg.enabled);
  prefsSched.putBool("repeat",  schedCfg.repeat);
  prefsSched.putBool("modeOn",  schedCfg.modeOn);
  prefsSched.putShort("tzmin",  schedCfg.tzOffsetMin);
  prefsSched.putString("start", schedCfg.start);
  prefsSched.putString("end",   schedCfg.end_);
  prefsSched.end();
}
static bool parseHHMM(const char* hhmm, int &h, int &m){
  if (!hhmm || strlen(hhmm) < 4) return false;
  h = (hhmm[0]-'0')*10 + (hhmm[1]-'0');
  m = (hhmm[3]-'0')*10 + (hhmm[4]-'0');
  if (h<0||h>23||m<0||m>59) return false;
  return true;
}
static void utcToLocalHM(time_t utc, int tzMin, int &h, int &m){
  time_t local = utc + tzMin * 60;
  struct tm lt; gmtime_r(&local, &lt); h = lt.tm_hour; m = lt.tm_min;
}
static bool isInsideWindowLocal(const char* start, const char* end_, int nowH, int nowM){
  int sh, sm, eh, em;
  if(!parseHHMM(start, sh, sm) || !parseHHMM(end_, eh, em)) return false;
  int s = sh*60 + sm, e = eh*60 + em, n = nowH*60 + nowM;
  if (s == e) return false;
  if (s < e)  return (n >= s && n < e);
  return (n >= s || n < e); // overnight window
}
void publishScheduleStatus(){
  if (!mqtt.connected()) return;
  StaticJsonDocument<256> doc;
  doc["enabled"]       = schedCfg.enabled;
  doc["start"]         = schedCfg.start;
  doc["end"]           = schedCfg.end_;
  doc["repeat"]        = schedCfg.repeat;
  doc["mode"]          = schedCfg.modeOn ? "ON":"OFF";
  doc["tz_offset_min"] = schedCfg.tzOffsetMin;
  doc["inside"]        = schedState.insideWindow;
  char buf[256]; size_t n = serializeJson(doc, buf, sizeof(buf)); (void)n;
  mqtt.publish(topicSchedStatus.c_str(), buf, true);
}

/************ FIXED desired-state logic ************/
void schedulerEval(){
  if (!timeReady) return;

  time_t now = time(nullptr);
  if (!schedForceNow && now == schedState.lastEvalSec) return;
  schedState.lastEvalSec = now;
  bool publishFlip = false;

  if (!schedCfg.enabled){ schedForceNow = false; return; }

  int h, m; utcToLocalHM(now, schedCfg.tzOffsetMin, h, m);
  bool inside = isInsideWindowLocal(schedCfg.start, schedCfg.end_, h, m);
  if (inside != schedState.insideWindow){ 
    schedState.insideWindow = inside; 
    publishFlip = true; 
  }

  // Desired state rule:
  //  - Inside window:         desired = mode
  //  - Outside, pre-first:    desired = preservedManualOn   (both repeat modes)
  //  - Outside, after first:  desired = !mode
  bool desired;
  if (inside) {
    desired = schedCfg.modeOn;
    schedState.everEntered = true;
  } else {
    desired = schedState.everEntered ? !schedCfg.modeOn : schedState.preservedManualOn;
  }

  if (desired != isRelayOn()) setRelay(desired);

  // One-shot auto-disable only for repeat = NO, after leaving first window
  if (!schedCfg.repeat &&
      schedState.everEntered &&
      publishFlip && !inside &&
      millis() >= schedState.suppressDisableUntilMs)
  {
    schedCfg.enabled = false;
    schedSaveToNVS();
    schedState.everEntered = false;
    publishScheduleStatus();
  }

  if (publishFlip) publishScheduleStatus();
  schedForceNow = false;
}
/************ END desired-state fix ************/

void handleScheduleJson(const String& json){
  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, json)) return;

  if (doc.containsKey("start")){ const char* s = doc["start"]; if (s){ strncpy(schedCfg.start, s, 5); schedCfg.start[5]=0; } }
  if (doc.containsKey("end"))  { const char* e = doc["end"];   if (e){ strncpy(schedCfg.end_,  e, 5); schedCfg.end_[5]=0; } }
  if (doc.containsKey("repeat"))        schedCfg.repeat      = doc["repeat"];
  if (doc.containsKey("tz_offset_min")) schedCfg.tzOffsetMin = (int)doc["tz_offset_min"];
  if (doc.containsKey("mode")){
    String m = String((const char*)doc["mode"]); m.toUpperCase();
    schedCfg.modeOn = (m == "ON");
  }
  // Ignore any "enabled" in JSON; use /schedule/enable

  schedSaveToNVS();

  // After edits, don't treat us as having completed the first cycle yet
  schedState.everEntered = false;
  schedState.suppressDisableUntilMs = millis() + 3000;  // ~3s after edits

  schedForceNow = true;            // apply immediately
  schedulerEval();
  publishScheduleStatus();
}

/************ MQTT topics & setup ************/
void mqttBuildTopics(){
  topicRelayGet    = String(DEVICE_ID) + "/relay/get";
  topicRelayStatus = String(DEVICE_ID) + "/relay/status";
  topicRelaySet    = String(DEVICE_ID) + "/relay/set";

  topicAlgoGet     = String(DEVICE_ID) + "/algorithm/get";
  topicAlgoStatus  = String(DEVICE_ID) + "/algorithm/status";
  topicAlgoSet     = String(DEVICE_ID) + "/algorithm/set";

  topicPresence    = String(DEVICE_ID) + "/presence";
  topicLastSeen    = String(DEVICE_ID) + "/lastSeen";

  topicPowerGet    = String(DEVICE_ID) + "/power/get";
  topicPowerStatus = String(DEVICE_ID) + "/power/status";

  topicSchedSet     = String(DEVICE_ID) + "/schedule/set";
  topicSchedGet     = String(DEVICE_ID) + "/schedule/get";
  topicSchedStatus  = String(DEVICE_ID) + "/schedule/status";
  topicSchedEnable  = String(DEVICE_ID) + "/schedule/enable";
}
void mqttSetup(){
  tlsClient.setCACert(ROOT_CA_ISRG_X1);
  tlsClient.setTimeout(15000);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback([](char* topic, byte* payload, unsigned int length){
    String t = String(topic);
    String msg; msg.reserve(length);
    for (unsigned int i=0;i<length;i++) msg += (char)payload[i];
    msg.trim();

    if (t == topicRelayGet) {
      if (msg.equalsIgnoreCase("STATUS")) publishRelayStatus();

    } else if (t == topicAlgoGet) {
      if (msg.equalsIgnoreCase("STATUS")) publishAlgorithmStatus();

    } else if (t == topicRelaySet) {
      if (msg.equalsIgnoreCase("ON"))  setRelay(true);
      else if (msg.equalsIgnoreCase("OFF")) setRelay(false);

    } else if (t == topicAlgoSet) {
      if (msg.equalsIgnoreCase("ON"))  { algorithmOn = true;  resetCutHistory(); publishAlgorithmStatus(); }
      else if (msg.equalsIgnoreCase("OFF")) { algorithmOn = false; resetCutHistory(); publishAlgorithmStatus(); }

    } else if (t == topicPowerGet) {
      if (msg.equalsIgnoreCase("STATUS")) publishPowerStatus();

    } else if (t == topicSchedSet) {
      handleScheduleJson(msg);

    } else if (t == topicSchedGet) {
      if (msg.equalsIgnoreCase("STATUS")) publishScheduleStatus();

    } else if (t == topicSchedEnable) {
      String up = msg; up.trim(); up.toUpperCase();
      bool prev = schedCfg.enabled;
      if (up == "ON")  schedCfg.enabled = true;
      if (up == "OFF") schedCfg.enabled = false;

      if (!prev && schedCfg.enabled){
        // Snapshot manual state exactly when entering schedule mode
        schedState.preservedManualOn = isRelayOn();
      }

      schedSaveToNVS();

      // avoid immediate disable if flips happen right as we enable
      schedState.suppressDisableUntilMs = millis() + 1000;

      schedForceNow = true;        // apply immediately
      schedulerEval();
      publishScheduleStatus();
    }
  });

  mqtt.setKeepAlive(10);

  uint64_t mac = ESP.getEfuseMac();
  char cid[64];
  snprintf(cid, sizeof(cid), "%s-%02X%02X%02X", DEVICE_ID,
           (uint8_t)(mac>>16), (uint8_t)(mac>>8), (uint8_t)mac);
  mqttClientId = cid;

  mqttBuildTopics();
}
bool mqttConnect(){
  if (mqtt.connected()) return true;
  if (WiFi.status() != WL_CONNECTED || !timeReady) return false;

  const char* willTopic   = topicPresence.c_str();
  const char* willMessage = "offline";
  const int   willQos     = 1;
  const bool  willRetain  = true;

  bool ok = strlen(MQTT_USER)
    ? mqtt.connect(mqttClientId.c_str(), MQTT_USER, MQTT_PASS,
                   willTopic, willQos, willRetain, willMessage)
    : mqtt.connect(mqttClientId.c_str(), willTopic, willQos, willRetain, willMessage);
  if (!ok) return false;

  mqtt.subscribe(topicRelayGet.c_str());
  mqtt.subscribe(topicRelaySet.c_str());
  mqtt.subscribe(topicAlgoGet.c_str());
  mqtt.subscribe(topicAlgoSet.c_str());
  mqtt.subscribe(topicPowerGet.c_str());
  mqtt.subscribe(topicSchedSet.c_str());
  mqtt.subscribe(topicSchedGet.c_str());
  mqtt.subscribe(topicSchedEnable.c_str());

  mqtt.publish(topicPresence.c_str(), "online", true);
  publishRelayStatus();
  publishAlgorithmStatus();
  publishPowerStatus();
  publishScheduleStatus();

  time_t now_s = time(nullptr);
  unsigned long long now_ms = (unsigned long long)now_s * 1000ULL;
  char buf[24]; snprintf(buf, sizeof(buf), "%llu", now_ms);
  mqtt.publish(topicLastSeen.c_str(), buf, true);

  return true;
}
const unsigned long MQTT_HEARTBEAT_MS = 2000;
unsigned long lastMqttHeartbeatMs = 0;
void mqttPublishHeartbeatIfDue(){
  if (!mqtt.connected() || !timeReady) return;
  unsigned long now = millis();
  if (now - lastMqttHeartbeatMs < MQTT_HEARTBEAT_MS) return;
  lastMqttHeartbeatMs = now;
  time_t now_s = time(nullptr);
  unsigned long long now_ms = (unsigned long long)now_s * 1000ULL;
  char buf[24]; snprintf(buf, sizeof(buf), "%llu", now_ms);
  mqtt.publish(topicLastSeen.c_str(), buf, true);
}
void mqttLoop(){
  static unsigned long lastAttempt = 0;
  const unsigned long RETRY_MS = 2000;
  if (WiFi.status() == WL_CONNECTED){
    pollTimeSync();
    if (!mqtt.connected()){
      unsigned long now = millis();
      if (now - lastAttempt > RETRY_MS){ lastAttempt = now; mqttConnect(); }
    } else {
      mqtt.loop();
    }
  }
}
/****************** END MQTT SECTION *******************/

/************ Frequent power-cut detector ************/
void resetCutHistory(){
  cutCount = 0; outageInProgress = false; outageStartMs = 0;
  outageCounted = false; longOutageLogged = false; longOutageOccurred = false;
}
void resetCutWindowOnly(){ cutCount = 0; }
void pruneOldCuts(unsigned long nowMs){
  if (cutCount == 0) return;
  unsigned long keepAfter = (nowMs > algoCfg.windowMs) ? (nowMs - algoCfg.windowMs) : 0;
  uint8_t w = 0; 
  for (uint8_t i=0;i<cutCount;i++){
    if (i < CUT_BUF_MAX && cutTimes[i] >= keepAfter){ 
      if (w!=i) cutTimes[w]=cutTimes[i]; 
      w++; 
    }
  }
  cutCount = w;
}
void recordPowerCut(unsigned long whenMs){
  if (cutCount < CUT_BUF_MAX){ cutTimes[cutCount++] = whenMs; }
  else { for (uint8_t i=1;i<CUT_BUF_MAX;i++) cutTimes[i-1] = cutTimes[i]; cutTimes[CUT_BUF_MAX-1] = whenMs; }
}
void monitorVSenseAndDetect(){
  unsigned long now = millis();
  int raw = digitalRead(PIN_VSENSE);

  if (!algorithmOn){
    static int  lastRaw = HIGH, lastStable = HIGH;
    static unsigned long lastChange = 0;
    static bool disabledOutage = false;
    static unsigned long disabledStart = 0;
    static bool disabledLongLogged = false;
    static bool disabledJustRestored = false;
    static bool disabledCountedThisOutage = false;

    if (raw != lastRaw){ lastRaw = raw; lastChange = now; }
    bool stableEdge = (now - lastChange) >= algoCfg.debounceMs;

    if (stableEdge && raw != lastStable){
      lastStable = raw;
      publishPowerStatus();
      if (lastStable == LOW){
        disabledOutage = true; disabledStart = now;
        disabledLongLogged = false; disabledJustRestored = false; disabledCountedThisOutage = false;
      } else {
        disabledOutage = false; disabledJustRestored = true;
      }
    }

    if (disabledOutage){
      unsigned long dur = now - disabledStart;
      if (!disabledLongLogged && dur >= algoCfg.longOutageMs){
        logEventNowOrQueue("Extended power outage ongoing.");
        disabledLongLogged  = true; longOutageOccurred = true;
      }
      if (!disabledCountedThisOutage && dur >= algoCfg.minOutageMs){
        pruneOldCuts(now); recordPowerCut(now); disabledCountedThisOutage = true;
        if (cutCount >= algoCfg.threshold){
          bool wasOn = isRelayOn();
          if (wasOn) logEventNowOrQueue("Frequent power cuts detected; no action taken (algorithm disabled).");
          else       logEventNowOrQueue("Frequent power cuts detected.");
          resetCutWindowOnly();
        }
      }
    }

    if (disabledJustRestored){
      unsigned long dur = now - disabledStart;
      if (longOutageOccurred || dur >= algoCfg.longOutageMs) logEventNowOrQueue("Power restored after extended outage.");
      longOutageOccurred=false; disabledLongLogged=false; disabledJustRestored=false; disabledCountedThisOutage=false;
    }

    static unsigned long lastPrune2 = 0;
    if (now - lastPrune2 >= 1000){ lastPrune2 = now; pruneOldCuts(now); }
    return;
  }

  if (raw != vsenseLastRaw){ vsenseLastRaw = raw; vsenseLastChangeMs = now; }
  bool stableEdge = (now - vsenseLastChangeMs) >= algoCfg.debounceMs;

  if (stableEdge && raw != vsenseLastStable){
    vsenseLastStable = raw;
    publishPowerStatus();

    if (vsenseLastStable == LOW){
      outageInProgress   = true; outageStartMs      = now;
      outageCounted      = false; longOutageLogged  = false; longOutageOccurred = false;
    } else {
      if (outageInProgress){
        unsigned long dur = now - outageStartMs;
        if (longOutageOccurred || dur >= algoCfg.longOutageMs) logEventNowOrQueue("Power restored after extended outage.");
      }
      outageInProgress=false; outageStartMs=0; outageCounted=false; longOutageLogged=false; longOutageOccurred=false;
    }
  }

  if (outageInProgress && !outageCounted){
    unsigned long dur = now - outageStartMs;
    if (dur >= algoCfg.minOutageMs){
      pruneOldCuts(now); recordPowerCut(now); outageCounted = true;
      if (cutCount >= algoCfg.threshold){
        bool wasOn = isRelayOn();
        if (wasOn){ setRelay(false); logEventNowOrQueue("Frequent power cuts detected; socket turned OFF automatically."); }
        else       logEventNowOrQueue("Frequent power cuts detected.");
        resetCutWindowOnly();
      }
    }
  }

  if (outageInProgress && !longOutageLogged){
    unsigned long dur = now - outageStartMs;
    if (dur >= algoCfg.longOutageMs){
      logEventNowOrQueue("Extended power outage ongoing.");
      longOutageLogged   = true; longOutageOccurred = true;
    }
  }

  static unsigned long lastPrune = 0;
  if (now - lastPrune >= 1000){ lastPrune = now; pruneOldCuts(now); }
}

/************ Setup ************/
void setup(){
  pinMode(PIN_RELAY, OUTPUT); digitalWrite(PIN_RELAY, RELAY_ACTIVE_HIGH ? LOW : HIGH);
  pinMode(PIN_VSENSE, INPUT);

  neo.begin();
  neo.clear();
  neo.show(); // ensure off at boot

  Serial.begin(115200);
  delay(200);
  armButtonPulldown("setup");

  WiFi.onEvent(onWiFiEvent, ARDUINO_EVENT_WIFI_STA_GOT_IP);
  WiFi.onEvent(onWiFiEvent, ARDUINO_EVENT_WIFI_STA_DISCONNECTED);

  mqttSetup();
  schedLoadFromNVS();

  if (!connectWithStored(12000)){
    if (p_ssid.isEmpty()) startPortal();
  }
}

/************ Loop ************/
void loop(){
  tickLed();
  checkLongPress();

  if (portalActive){
    dnsServer.processNextRequest();
    server.handleClient();
    return;
  }

  if (wantConnectNow){
    wantConnectNow = false;
    if (!connectWithStored(12000)){ /* keep retrying */ }
  }

  // FAST Wi-Fi reconnect tick
  static unsigned long last_reconnect_attempt_ms = 0;
  const unsigned long RECONNECT_INTERVAL_MS = 3000;
  if (WiFi.status() != WL_CONNECTED && p_ssid.length() > 0) {
    unsigned long now = millis();
    if (now - last_reconnect_attempt_ms >= RECONNECT_INTERVAL_MS) {
      last_reconnect_attempt_ms = now;
      WiFi.reconnect();
    }
  }

  // MQTT service + heartbeat
  mqttLoop();
  mqttPublishHeartbeatIfDue();

  // Firebase service (metadata + pending deletion helpers)
  if (WiFi.status() == WL_CONNECTED && millis() >= fbCooldownUntilMs) {
    pollTimeSync();

    if (timeReady && (!fbInitialized || !Firebase.ready())) firebaseInitIfNeeded();

    static unsigned long lastPDCheck = 0;
    if (timeReady && Firebase.ready() && (millis() - lastPDCheck > 5000)) {
      lastPDCheck = millis(); processPendingDeletionIfAny();
    }

    if (timeReady && Firebase.ready()) {
      prefs.begin("nodamic", true);
      String uid  = prefs.getString("userId", "");
      String name = prefs.getString("deviceName", "");
      prefs.end();
      fbPushNameIfDirty(uid, DEVICE_ID, name);
    }

    if (timeReady && Firebase.ready()){
      static unsigned long lastFlush = 0;
      if (millis() - lastFlush > 3000){ lastFlush = millis(); flushOfflineLogs(); }
    }
  }

  // Algorithm monitor
  monitorVSenseAndDetect();

  // Scheduler (non-blocking; instant when forced)
  schedulerEval();
}
