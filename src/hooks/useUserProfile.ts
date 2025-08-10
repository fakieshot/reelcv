// src/hooks/useUserProfile.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth, firestore } from "@/lib/firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

/** Βοηθητικό: αφαιρεί undefined από object/array (χωρίς να πειράζει dates/FieldValue) */
function stripUndefined<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map((v) => stripUndefined(v)).filter((v) => v !== undefined) as any;
  }
  if (val && typeof val === "object") {
    const out: any = Array.isArray(val) ? [] : {};
    Object.entries(val as any).forEach(([k, v]) => {
      if (v === undefined) return; // drop
      if (v && typeof v === "object") out[k] = stripUndefined(v);
      else out[k] = v;
    });
    return out;
  }
  return val;
}

/** deepEqual για απλό state-compare */
function deepEqual(a: unknown, b: unknown) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export type UserProfile = {
  fullName?: string;
  title?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  socials?: { linkedin?: string; github?: string; site?: string };
  visibility?: "public" | "private";
  primaryReelId?: string;
  createdAt?: any;
  updatedAt?: any;
};

export function useUserProfile(autosave = true, debounceMs = 800) {
  const uid = auth.currentUser?.uid || null;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // baseline = τελευταία “κατεβασμένη/αποθηκευμένη” έκδοση για dirty-check
  const baselineRef = useRef<UserProfile | null>(null);

  const ref = useMemo(() => {
    if (!uid) return null;
    return doc(firestore, "users", uid, "profile", "main");
  }, [uid]);

  // Φόρτωση με live subscription
  useEffect(() => {
    if (!ref) {
      setLoading(false);
      setProfile(null);
      baselineRef.current = null;
      return;
    }
    setLoading(true);
    setError(null);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.exists() ? (snap.data() as UserProfile) : {}) as UserProfile;
        baselineRef.current = data;
        setProfile(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [ref]);

  // isDirty
  const isDirty = useMemo(() => {
    if (!profile && !baselineRef.current) return false;
    return !deepEqual(profile, baselineRef.current);
  }, [profile]);

  // debounce helper
  const debounceTimer = useRef<number | undefined>(undefined);
  const debounce = useCallback((fn: () => void, ms: number) => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(fn, ms);
  }, []);

  // Autosave
  useEffect(() => {
    if (!autosave) return;
    if (!ref) return;
    if (!isDirty) return;
    debounce(() => {
      void save();
    }, debounceMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosave, debounce, debounceMs, isDirty, profile, ref]);

  // Save τρέχον profile
  const save = useCallback(
    async (patch?: Partial<UserProfile>) => {
      if (!ref) throw new Error("Not authenticated");

      setSaving(true);
      setError(null);
      try {
        // “πηγή αλήθειας” = ό,τι βλέπεις τώρα στο form (profile) + patch
        const toSave = stripUndefined<UserProfile>({
          ...(profile || {}),
          ...(patch || {}),
          // μην γράφεις createdAt = undefined — μόνο αν δεν υπάρχει καθόλου
          ...(baselineRef.current?.createdAt ? {} : { createdAt: serverTimestamp() }),
          updatedAt: serverTimestamp(),
        });

        await setDoc(ref, toSave, { merge: true });

        // ορισμός νέου baseline (για να “σβήσει” το dirty state)
        baselineRef.current = { ...(profile || {}), ...(patch || {}) };
        setLastSavedAt(Date.now());
      } catch (e: any) {
        setError(e?.message || "Failed to save profile");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [profile, ref]
  );

  return {
    profile,
    setProfile,
    loading,
    saving,
    error,
    isDirty,
    lastSavedAt,
    save,
  };
}
