import { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getCountFromServer,
  onSnapshot,
  doc,
  Timestamp,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";

type Metrics = {
  loading: boolean;
  profileViews: number;
  applicationsTotal: number;
  applicationsThisWeek: number;
  unreadMessages: number; // admin → user unseen
};

export default function useSeekerMetrics(): Metrics {
  const [state, setState] = useState<Metrics>({
    loading: true,
    profileViews: 0,
    applicationsTotal: 0,
    applicationsThisWeek: 0,
    unreadMessages: 0,
  });

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const db = getFirestore();

    let unsubs: Array<() => void> = [];

    (async () => {
      // Applications: total + this week
      try {
        const appsCol = collection(db, "applications");
        const qTotal = query(appsCol, where("candidateUid", "==", uid));
        const totalSnap = await getCountFromServer(qTotal);

        const weekAgo = Timestamp.fromDate(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        const qWeek = query(
          appsCol,
          where("candidateUid", "==", uid),
          where("createdAt", ">=", weekAgo)
        );
        const weekSnap = await getCountFromServer(qWeek);

        setState((s) => ({
          ...s,
          applicationsTotal: totalSnap.data().count,
          applicationsThisWeek: weekSnap.data().count,
        }));
      } catch {
        // ignore
      }

      // Unread support messages (admin → user, seenByUser == false)
      try {
        const threadsQ = query(
          collection(db, "support_threads"),
          where("participants", "array-contains", uid)
        );

        const unsubThreads = onSnapshot(threadsQ, async (tSnap) => {
          let total = 0;
          // count unseen admin messages per thread
          await Promise.all(
            tSnap.docs.map(async (t) => {
              const msgsCol = collection(db, "support_threads", t.id, "messages");
              const qUnseen = query(
                msgsCol,
                where("sender", "==", "admin"),
                where("seenByUser", "==", false)
              );
              const c = await getCountFromServer(qUnseen);
              total += c.data().count;
            })
          );
          setState((s) => ({ ...s, unreadMessages: total }));
        });
        unsubs.push(unsubThreads);
      } catch {
        // ignore
      }

      // Profile views counter από profile doc (viewCount ή metrics.views)
      const unsubProfile = onSnapshot(
        doc(db, "users", uid, "profile", "main"),
        (snap) => {
          const d = snap.data() as any;
          const views = (d?.viewCount ?? d?.metrics?.views ?? 0) as number;
          setState((s) => ({ ...s, profileViews: views, loading: false }));
        },
        () => setState((s) => ({ ...s, loading: false }))
      );
      unsubs.push(unsubProfile);
    })();

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  return state;
}
