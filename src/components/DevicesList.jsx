import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { ref, onValue } from "firebase/database";
import DeviceCard from "./DeviceCard";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import wordmark from "../assets/wordmark.svg";
import footerWordmark from "../assets/footer-wordmark.svg";

function DevicesList({ user, onSelectDevice, statuses, setStatuses, onLogout }) {
    const [devices, setDevices] = useState({});
    const [copied, setCopied] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="devices-page">
            {/* Mobile header with hamburger and logo */}
            <div className="mobile-header">
                <button className="sidebar-toggle" onClick={toggleSidebar}>
                    ☰
                </button>
                <img src={wordmark} alt="Nodamic" className="mobile-logo" />
            </div>

            {/* Sidebar overlay for mobile */}
            <div 
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={closeSidebar}
            ></div>

            {/* Sidebar */}
            <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-content">
                    <div className="sidebar-header">
                        <img src={wordmark} alt="Nodamic" className="sidebar-logo" />
                    </div>

                    <div className="welcome-message">
                        Hi, {user.displayName?.split(' ')[0] || "User"} {user.displayName?.split(' ')[1] || ""}!
                    </div>

                    <div className="user-details">
                        <div className="user-detail-item">
                            <div className="user-detail-label">Your Email</div>
                            <div className="user-email">{user.email}</div>
                        </div>
                        
                        <div className="user-detail-item">
                            <div className="user-detail-label">Your User ID</div>
                            <button className="user-id" onClick={handleCopy}>
                                {user.uid}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="sidebar-bottom">
                    <button className="logout-button" onClick={handleLogout}>
                        Logout
                    </button>
                    
                    {/* Desktop footer - shown in sidebar */}
                    <div className="sidebar-footer">
                        <img src={footerWordmark} alt="A project by nodamic" />
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="main-content">
                <div className="devices-header">
                    <h1 className="devices-title">Your Devices</h1>
                </div>
                <div className="devices-container">
                    <div className="devices-grid">
                        {Object.entries(devices).length === 0 ? (
                            <div className="no-devices">No devices yet</div>
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
            </div>

            {/* Copy notification */}
            {copied && (
                <div className="copy-notification">
                    User ID copied to clipboard
                </div>
            )}

            {/* Mobile footer - shown at bottom of page */}
            <div className="mobile-footer-brand">
                <img src={footerWordmark} alt="A project by nodamic" />
            </div>
        </div>
    );
}

export default DevicesList;