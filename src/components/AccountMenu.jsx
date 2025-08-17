// src/components/AccountMenu.jsx
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";

function AccountMenu({ user, onLogout }) {
    const [open, setOpen] = useState(false);

    const handleLogout = async () => {
        await signOut(auth);
        onLogout();
    };

    return (
        <div style={{ position: "fixed", top: 16, right: 16 }}>
            <button
                onClick={() => setOpen((prev) => !prev)}
                style={{
                    borderRadius: "50%",
                    width: 40,
                    height: 40,
                    backgroundColor: "#007bff",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                }}
            >
                {user.displayName?.charAt(0) || "U"}
            </button>

            {open && (
                <div
                    style={{
                        position: "absolute",
                        right: 0,
                        marginTop: 8,
                        padding: "12px",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        backgroundColor: "#1f7ac5ff",
                        width: 320,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                >
                    <p><strong>{user.displayName}</strong></p>
                    <p>{user.email}</p>
                    <p>UID: {user.uid}</p>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            )}
        </div>
    );
}

export default AccountMenu;
