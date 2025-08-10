// src/hooks/useUploadReel.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { auth, firestore, storage } from "@/lib/firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTask,
} from "firebase/storage";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

type UploadState = "idle" | "running" | "success" | "error" | "canceled";

type UploadDonePayload = {
  reelId: string;          // ίδιο με το fileId
  url: string;             // download URL
  storagePath: string;     // π.χ. users/<uid>/reels/<fileId>
  filename: string;
  size: number;
  contentType: string;
};

type UseUploadReelOptions = {
  onDone?: (payload: UploadDonePayload) => void;
};

export function useUploadReel(maxSizeMB = 200, opts?: UseUploadReelOptions) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadURL, setDownloadURL] = useState<string | null>(null);

  const taskRef = useRef<UploadTask | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setError(null);
    setDownloadURL(null);
    taskRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    taskRef.current?.cancel();
  }, []);

  const upload = useCallback(
    async (file: File) => {
      try {
        setError(null);
        setDownloadURL(null);

        // Client-side checks
        if (!auth.currentUser) throw new Error("Not authenticated.");
        if (!file) throw new Error("No file selected.");

        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > maxSizeMB) {
          throw new Error(`File too large. Max ${maxSizeMB}MB`);
        }
        if (!/^video\/(mp4|webm)$/.test(file.type)) {
          throw new Error("Only MP4 or WebM are allowed.");
        }

        const uid = auth.currentUser.uid;
        const reelId = crypto.randomUUID(); // χρησιμοποιείται και ως doc id
        const storagePath = `users/${uid}/reels/${reelId}`;
        const storageRef = ref(storage, storagePath);

        const metadata = {
          contentType: file.type,
          customMetadata: {
            uid,
            originalName: file.name,
          },
        };

        const task = uploadBytesResumable(storageRef, file, metadata);
        taskRef.current = task;
        setState("running");

        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round(
              (snap.bytesTransferred / snap.totalBytes) * 100
            );
            setProgress(pct);
          },
          (err) => {
            setState(err.message.includes("canceled") ? "canceled" : "error");
            setError(err.message);
          },
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            setDownloadURL(url);
            setState("success");

            // Γράψε metadata στο Firestore
            await setDoc(
              doc(firestore, "users", uid, "reels", reelId),
              {
                storagePath,
                downloadURL: url,
                name: file.name,
                size: file.size,
                type: file.type,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                visibility: "private",
              },
              { merge: true }
            );

            // Κάλεσε τον consumer
            opts?.onDone?.({
              reelId,
              url,
              storagePath,
              filename: file.name,
              size: file.size,
              contentType: file.type,
            });
          }
        );
      } catch (e: any) {
        setState("error");
        setError(e?.message || "Upload failed");
      }
    },
    [maxSizeMB, opts]
  );

  // Καθαρισμός όταν απομακρυνθεί το component
  useEffect(() => {
    return () => {
      taskRef.current?.cancel();
    };
  }, []);

  return { state, progress, error, downloadURL, upload, cancel, reset };
}
