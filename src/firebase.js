import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Replace this object with your own config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyD_nBBefJE0dDV2NB7FWQalpLIAulASXF0",
  authDomain: "nodamic-smart-socket.firebaseapp.com",
  databaseURL: "https://nodamic-smart-socket-default-rtdb.firebaseio.com",
  projectId: "nodamic-smart-socket",
  storageBucket: "nodamic-smart-socket.firebasestorage.app",
  messagingSenderId: "529039786125",
  appId: "1:529039786125:web:b6f638ce2fa4256b56e2c4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth setup
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app);
