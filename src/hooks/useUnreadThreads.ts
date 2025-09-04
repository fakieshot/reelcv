import { useEffect, useState } from "react";
import useAuthUser from "@/hooks/useAuthUser";
import { getFirestore, collection, query as fsQuery, where, onSnapshot } from "firebase/firestore";

/**
 * Συνολικά μη-αναγνωσμένα DMs για τον τρέχοντα χρήστη.
 */
export default function useUnreadThreads(): number {
  const { user } = useAuthUser();
  const me = user?.uid ?? null;
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!me) { setTotal(0); return; }

    const db = getFirestore();
    const q = fsQuery(collection(db, "threads"), where("members", "array-contains", me));

    const unsub = onSnapshot(
      q,
      (snap) => {
        let sum = 0;
        snap.forEach((d) => {
          const t = d.data() as any;

          const lastMessageAtMs = t?.lastMessageAt?.toMillis?.() ?? 0;
          const lastSender = t?.lastSender ?? t?.lastMessageUser;
          const myReadMs =
            t?.reads?.[me]?.toMillis?.() ??
            t?.lastSeen?.[me]?.toMillis?.() ??
            0;

          const explicit: number | undefined =
  typeof t?.unreadCounts?.[me] === "number" ? t.unreadCounts[me] : undefined;

const hasLast = lastMessageAtMs > 0 && !!lastSender;
const fallback = hasLast && lastSender !== me && myReadMs < lastMessageAtMs ? 1 : 0;

const used = Math.max(explicit ?? 0, fallback);
sum += used > 0 ? used : 0;

        });
        setTotal(sum);
      },
      () => setTotal(0)
    );

    return () => unsub();
  }, [me]);

  return total;
}
