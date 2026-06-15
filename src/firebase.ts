import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  browserSessionPersistence,
  setPersistence
} from "firebase/auth";
import { getDatabase, ref, onValue, set, update } from "firebase/database";

// Configuration provided by the user
export const firebaseConfig = {
  apiKey: "AIzaSyCcEmJoek3Ctz6XJTz5YthiI0paoKPxG0k",
  authDomain: "iotfirebase-5e6ea.firebaseapp.com",
  databaseURL: "https://iotfirebase-5e6ea-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iotfirebase-5e6ea",
  storageBucket: "iotfirebase-5e6ea.firebasestorage.app",
  messagingSenderId: "522233333923",
  appId: "1:522233333923:web:ba97199a2c57b5ef795716",
  measurementId: "G-D1JMVC3NYK"
};

// Initialize Firebase App gracefully
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

// Interfaces for Auth & Database
export const auth = app ? getAuth(app) : null;
export const database = app ? getDatabase(app) : null;

// Persist Session
if (auth) {
  setPersistence(auth, browserSessionPersistence).catch((err) => {
    console.warn("Could not set Auth session persistence:", err);
  });
}

export const googleProvider = new GoogleAuthProvider();

// Database ref helpers helper for easy writing/reading
export const getIoTPathRef = (path: string) => {
  if (!database) return null;
  return ref(database, `/IoT/${path}`);
};

export const getRootRef = () => {
  if (!database) return null;
  return ref(database, "/IoT");
};
