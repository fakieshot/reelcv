// src/hooks/useUserReels.ts
import { useEffect, useMemo, useState } from "react";
import { auth, firestore, storage } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";

export type Visibility = "private" | "unlisted" | "public";

export type ReelDoc = {
  id: string;
  name: string;
  size: number;
  type: string;
  downloadURL: string;
  storagePath: string; // users/<uid>/reels/<fileId>
  visibility?: Visibility;
  createdAt?: any;
  updatedAt?: any;
};

type UseUserReelsResult = {
  reels: ReelDoc[];
  loading: boolean;
  error: string;
  /** Αλλάζει visibility σε Firestore */
  updateVisibility: (reelId: string, visibility: Visibility) => Promise<void>;
  /** Alias για να μη σπάει παλιός κώδικας που κάνει setVisibility */
  setVisibility: (reelId: string, visibility: Visibility) => Promise<void>;
  /** Θέτει Primary στο προφίλ του χρήστη (δέχεται ReelDoc ή id) */
  setPrimary: (reelOrId: ReelDoc | string) => Promise<void>;
  /** Διαγράφει από Storage ΚΑΙ από Firestore */
  remove: (reel: ReelDoc) => Promise<void>;
};

export function useUserReels(): UseUserReelsResult {
  const uid = auth.currentUser?.uid || null;

  const [reels, setReels] = useState<ReelDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const colRef = useMemo(() => {
    if (!uid) return null;
    return collection(firestore, "users", uid, "reels");
  }, [uid]);

  useEffect(() => {
    if (!colRef) {
      setReels([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    const q = query(colRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: ReelDoc[] = snap.docs.map((d) => {
          const v = d.data() as any;
          return {
            id: d.id,
            name: v.name,
            size: v.size,
            type: v.type,
            downloadURL: v.downloadURL,
            storagePath: v.storagePath, // ΠΑΡΑ ΠΟΛΥ ΣΗΜΑΝΤΙΚΟ για delete
            visibility: v.visibility ?? "private",
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
          };
        });
        setReels(data);
        setLoading(false);
      },
      (e) => {
        setError(e?.message || "Failed to load reels");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [colRef]);

  const updateVisibility = async (reelId: string, visibility: Visibility) => {
    if (!uid) throw new Error("Not authenticated");
    const refDoc = doc(firestore, "users", uid, "reels", reelId);
    await updateDoc(refDoc, { visibility, updatedAt: serverTimestamp() });
  };

  // Alias για backwards-compatibility (όπου καλείται setVisibility)
  const setVisibility = (reelId: string, visibility: Visibility) =>
    updateVisibility(reelId, visibility);

  const setPrimary = async (reelOrId: ReelDoc | string) => {
    if (!uid) throw new Error("Not authenticated");
    const reelId = typeof reelOrId === "string" ? reelOrId : reelOrId.id;

    // Αποθήκευση primary στο users/{uid}/profile/main (ή όπου το έχεις)
    const profileDoc = doc(firestore, "users", uid, "profile", "main");
    await updateDoc(profileDoc, {
      primaryReelId: reelId,
      updatedAt: serverTimestamp(),
    });
  };

  const remove = async (reel: ReelDoc) => {
    if (!uid) throw new Error("Not authenticated");

    // 1) Διαγραφή από Storage με ΣΩΣΤΟ path (ΟΧΙ με downloadURL)
    if (reel.storagePath) {
      try {
        const storageRef = ref(storage, reel.storagePath);
        await deleteObject(storageRef);
      } catch (e: any) {
        // Αν ήδη λείπει στο Storage, συνεχίζουμε να καθαρίσουμε Firestore
        // Μόνο αν είναι 403/401 δώσε μήνυμα, αλλιώς προχώρα
        const msg = String(e?.message || "");
        if (msg.includes("permission") || msg.includes("403")) {
          throw new Error("Storage delete forbidden (check auth/rules)");
        }
        // ignore 404/object-not-found
      }
    }

    // 2) Διαγραφή Firestore doc
    const reelDocRef = doc(firestore, "users", uid, "reels", reel.id);
    await deleteDoc(reelDocRef);
  };

  return { reels, loading, error, updateVisibility, setVisibility, setPrimary, remove };
}
