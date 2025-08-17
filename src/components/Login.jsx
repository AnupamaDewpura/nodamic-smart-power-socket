// src/components/Login.jsx
import { useState, useEffect } from "react";
import { auth, googleProvider } from "../services/firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";

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
    <div>
      {!user && <button onClick={handleLogin}>Login with Google</button>}
    </div>
  );
}

export default Login;
