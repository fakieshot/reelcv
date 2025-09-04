// src/hooks/usePresence.ts
import { useEffect } from "react";
import { rtdb } from "../lib/firebase.ts";
import {
  ref,
  onValue,
  serverTimestamp as rtdbServerTimestamp, // (κρατάς αν το χρειαστείς)
  set,
  onDisconnect,
} from "firebase/database";
import { onAuthStateChanged, getAuth } from "firebase/auth";

export default function usePresence() {
  useEffect(() => {
    const auth = getAuth();
    let cleanup: null | (() => void) = null;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        if (cleanup) cleanup();
        cleanup = null;
        return;
      }

      const uid = user.uid;
      const statusRef = ref(rtdb, `status/${uid}`);

      // Όταν πέσει η σύνδεση -> offline
      onDisconnect(statusRef)
        .set({ state: "offline", last_changed: Date.now() })
        .catch(() => {});

      // Τώρα δήλωσε online
      set(statusRef, { state: "online", last_changed: Date.now() }).catch(() => {});

      cleanup = () => {
        set(statusRef, { state: "offline", last_changed: Date.now() }).catch(() => {});
      };
    });

    return () => {
      if (cleanup) cleanup();
      unsub();
    };
  }, []);
}
