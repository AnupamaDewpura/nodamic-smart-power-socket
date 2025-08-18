import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { ref, onValue } from "firebase/database";
import DeviceCard from "./DeviceCard";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";

function DevicesList({ user, onSelectDevice, statuses, setStatuses, onLogout }) {
    const [devices, setDevices] = useState({});
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!user) return;

        const devicesRef = ref(db, `users/${user.uid}/devices`);

        // Watch devices list
        const unsubscribeDevices = onValue(devicesRef, (snapshot) => {
            const data = snapshot.val() || {};
            setDevices(data);

            // For each device, subscribe to its status
            Object.keys(data).forEach((deviceId) => {
                const statusRef = ref(db, `users/${user.uid}/devices/${deviceId}/status`);
                onValue(statusRef, (snap) => {
                    setStatuses((prev) => ({
                        ...prev,
                        [deviceId]: snap.val() || "Offline",
                    }));
                });
            });
        });

        return () => unsubscribeDevices();
    }, [user, setStatuses]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(user.uid);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLogout = async () => {
        await signOut(auth);
        onLogout();
    };

    return (
        <div>
            <h2>Hi, {user.displayName || "User"}!</h2>

            <div style={{ marginTop: "12px" }}>
                <p style={{ fontWeight: "bold" }}>Your User ID</p>
                <p
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                    onClick={handleCopy}
                >
                    {user.uid}
                </p>
                {copied && (
                    <p style={{ fontSize: "14px" }}>
                        User ID copied to clipboard
                    </p>
                )}
                <p>
                    <strong>Your Email</strong><br />{user.email}
                </p>
                <button onClick={handleLogout}>Logout</button>
            </div>

            <h2 style={{ marginTop: "24px" }}>Your Devices</h2>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
                {Object.entries(devices).length === 0 ? (
                    <p>No devices yet</p>
                ) : (
                    Object.entries(devices).map(([deviceId, device]) => (
                        <DeviceCard
                            key={deviceId}
                            deviceId={deviceId}
                            device={device}
                            status={statuses[deviceId]}
                            onClick={() => onSelectDevice({ ...device, id: deviceId })}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default DevicesList;
