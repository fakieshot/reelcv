import { useEffect, useState } from "react";
import { auth, firestore } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

type Reel = {
  downloadURL: string;
  name: string;
  createdAt?: any;
  size: number;
  type: string;
};

export default function MyReelCV() {
  const [items, setItems] = useState<Reel[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(firestore, "users", auth.currentUser.uid, "reels"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => d.data() as Reel));
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">My ReelCVs</h2>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium">{it.name}</div>
              <div className="text-xs text-muted-foreground">{(it.size / (1024*1024)).toFixed(1)} MB • {it.type}</div>
            </div>
            <a className="text-sm underline" href={it.downloadURL} target="_blank" rel="noreferrer">Open</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
