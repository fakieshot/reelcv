// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAzqQJTussaZXXxGuiJhYnEHjZhQpwW9UA",
  authDomain: "reelcv-d392b.firebaseapp.com",
  projectId: "reelcv-d392b",
  storageBucket: "reelcv-d392b.firebasestorage.app",
  messagingSenderId: "375017674565",
  appId: "1:375017674565:web:d67c8990fb9dd34316502c",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
