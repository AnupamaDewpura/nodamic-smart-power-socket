// src/components/Login.jsx
import { useState, useEffect } from "react";
import { auth, googleProvider } from "../services/firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import logomark from "../assets/logomark.svg";
import footerWordmark from "../assets/footer-wordmark.svg";

function Login({ onLogin }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Listen to auth state changes
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                onLogin(currentUser);
            } else {
                setUser(null);
                onLogin(null);
            }
        });

        return () => unsubscribe();
    }, [onLogin]);

    const handleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            setUser(result.user);
            onLogin(result.user);
        } catch (error) {
            console.error("Login error:", error);
        }
    };

    return (
        <div className="login-container">
            {!user && (
                <>
                    <div className="logo-container">
                        <div className="logo">
                            <img src={logomark} alt="Nodamic Logo" />
                        </div>
                    </div>
                    
                    <div className="welcome-text">
                        <h1 className="welcome-title">Yooo, welcome back to Nodamic!</h1>
                        <p className="welcome-subtitle">Let's get you plugged in.</p>
                    </div>
                    
                    <button className="login-button" onClick={handleLogin}>
                        Continue with Google
                    </button>
                    
                    <div className="privacy-text">
                        We use Google's secure login<br />
                        so you don't have to remember another password.
                    </div>
                    
                    <div className="footer-text">
                        <img src={footerWordmark} alt="A project by nodamic" />
                    </div>
                </>
            )}
        </div>
    );
}

export default Login;