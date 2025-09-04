// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAzqQJTussaZXXxGuiJhYnEHjZhQpwW9UA",
  authDomain: "reelcv-d392b.firebaseapp.com",
  projectId: "reelcv-d392b",
  storageBucket: "reelcv-d392b.firebasestorage.app",
  messagingSenderId: "375017674565",
  appId: "1:375017674565:web:d67c8990fb9dd34316502c",
  // ✅ πρόσθεσε αυτό από το console σου (format: https://reelcv-d392b-default-rtdb.europe-west1.firebasedatabase.app)
  databaseURL: "https://reelcv-d392b-default-rtdb.europe-west1.firebasedatabase.app",
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const firestore = db;
export const storage = getStorage(app);
export const rtdb = getDatabase(app); // ✅ χρησιμοποίησε το ίδιο app
