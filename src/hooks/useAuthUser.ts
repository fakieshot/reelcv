import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

type Role = "employer" | "jobseeker" | null;

export default function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      try {
        if (u) {
          setVerified(!!u.emailVerified);
          const snap = await getDoc(doc(firestore, "users", u.uid));
          setRole(snap.exists() ? (snap.data()?.role ?? null) : null);
        } else {
          setVerified(false);
          setRole(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { user, role, verified, loading };
}
