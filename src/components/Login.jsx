import { useState } from "react";
import { auth, googleProvider, db } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { ref, get, set } from "firebase/database";

function Login({ onLogin }) {
  const [user, setUser] = useState(null);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const loggedInUser = result.user;

      // Save to local state + parent
      setUser(loggedInUser);
      onLogin(loggedInUser);

      // Check if user exists in DB
      const userRef = ref(db, "users/" + loggedInUser.uid);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        await set(userRef, {
          email: loggedInUser.email,
          devices: {}
        });
        console.log("New user added to database");
      } else {
        console.log("User already exists in database");
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    onLogin(null);
  };

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.displayName}</p>
          <p>Email: {user.email}</p>
          <p>Your UID: {user.uid}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login with Google</button>
      )}
    </div>
  );
}

export default Login;
