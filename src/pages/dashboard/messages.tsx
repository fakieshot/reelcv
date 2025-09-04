import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  limit,
  updateDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import useAuthUser from "@/hooks/useAuthUser";

import { rtdb } from "@/lib/firebase";
import {
  ref as rRef,
  set as rSet,
  onValue as rOnValue,
  onDisconnect as rOnDisconnect,
  remove as rRemove,
} from "firebase/database";

const pairId = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);

function initialsOf(name?: string, emailFallback?: string) {
  const base = (name && name.trim()) || emailFallback || "U";
  return base
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function fmtTime(ts?: any) {
  try {
    const d: Date | undefined = ts?.toDate?.();
    if (!d) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function AvatarCircle({
  src,
  name,
  email,
  size = 36,
}: {
  src?: string;
  name?: string;
  email?: string;
  size?: number;
}) {
  const px = `${size}px`;
  const [ok, setOk] = useState<boolean>(!!src);
  return (
    <div
      className="rounded-full overflow-hidden grid place-items-center bg-white/10 text-xs font-semibold shrink-0"
      style={{ width: px, height: px }}
    >
      {ok && src ? (
        <img
          src={src}
          alt={name || email || "avatar"}
          className="w-full h-full object-cover"
          onError={() => setOk(false)}
        />
      ) : (
        <span>{initialsOf(name, email)}</span>
      )}
    </div>
  );
}




function formatLastSeen(ms?: number | null) {
  if (!ms) return "";
  const d = new Date(ms);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}



export default function Messages() {
  const db = getFirestore();
  const { user } = useAuthUser();
  const me = user?.uid ?? null;

  const [searchParams] = useSearchParams();
  const withUid = searchParams.get("with") ?? searchParams.get("u");

// κοντά στα υπόλοιπα state
const [otherOnline, setOtherOnline] = useState<boolean>(false);
const [otherLastSeen, setOtherLastSeen] = useState<number | null>(null);


  const [threads, setThreads] = useState<
    Array<{
      id: string;
      other: string;
      name?: string;
      email?: string;
      avatar?: string;
      lastMessage?: string;
      lastMessageAt?: any;
      unread?: boolean;
    }>
  >([]);
  const [activeTid, setActiveTid] = useState<string | null>(null);
  const [activeOther, setActiveOther] = useState<{
    uid: string;
    name?: string;
    email?: string;
    avatar?: string;
  } | null>(null);

  const [msgs, setMsgs] = useState<
    Array<{ id: string; text: string; sender: string; createdAt?: any }>
  >([]);
  const [composer, setComposer] = useState("");
  const [canDM, setCanDM] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  // ✍️ typing state (RTDB)
  const [otherTyping, setOtherTyping] = useState(false);
  const typingRefRef = useRef<ReturnType<typeof rRef> | null>(null);
  const typingTimer = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  // ✅ Threads list (μόνο read)
  useEffect(() => {
    if (!me) return;
    const qTh = query(
      collection(db, "threads"),
      where("members", "array-contains", me),
      orderBy("lastMessageAt", "desc")
    );
    return onSnapshot(qTh, async (snap) => {
      const rows: any[] = [];
      for (const d of snap.docs) {
        const t = d.data() as any;
        const other = (t.members as string[]).find((u) => u !== me)!;

        let name: string | undefined;
        let email: string | undefined;
        let avatar: string | undefined;

        try {
          const uRef = doc(db, "users", other);
          const uSnap = await getDoc(uRef);
          if (uSnap.exists()) {
            const ud = uSnap.data() as any;
            name = ud.name;
            email = ud.email;
            avatar = ud.photoURL || ud.avatarUrl || ud.picture || ud.photo;
          }
          const pRef = doc(db, "users", other, "profile", "main");
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            const pd = pSnap.data() as any;
            avatar = pd.photoURL || pd.avatarUrl || pd.picture || pd.photo || avatar;
            name = name || pd.fullName;
          }
        } catch {}

        // unread (explicit ή fallback)
        const lastMessageAtMs = t?.lastMessageAt?.toMillis?.() ?? 0;
        const lastSender = t?.lastSender ?? t?.lastMessageUser;
        const myReadMs = t?.reads?.[me]?.toMillis?.() ?? 0;

        const explicit: number | undefined =
          typeof t?.unreadCounts?.[me] === "number" ? t.unreadCounts[me] : undefined;

        const hasLast = lastMessageAtMs > 0 && !!lastSender;
        const fallback =
          hasLast && lastSender !== me && myReadMs < lastMessageAtMs ? 1 : 0;

        const used = Math.max(explicit ?? 0, fallback);
        const unread = used > 0;

        rows.push({
          id: d.id,
          other,
          name,
          email,
          avatar,
          lastMessage: t.lastMessage,
          lastMessageAt: t.lastMessageAt,
          unread,
        });
      }
      setThreads(rows);

      if (withUid) {
        const tid = pairId(me, withUid);
        if (rows.some((r) => r.id === tid)) setActiveTid(tid);
      }
    });
  }, [me, db, withUid]);

  // Guard + load messages for active thread
  useEffect(() => {
    let unsubMsgs: (() => void) | null = null;

    async function openThread() {
      if (!me || !activeTid) {
        setMsgs([]);
        setActiveOther(null);
        setCanDM(false);
        return;
      }

      const tRef = doc(db, "threads", activeTid);
      const tSnap = await getDoc(tRef);
      if (!tSnap.exists()) {
        setMsgs([]);
        setActiveOther(null);
        setCanDM(false);
        return;
      }

      const t = tSnap.data() as any;
      const members: string[] = Array.isArray(t.members) ? t.members : [];
      if (!me || members.length !== 2 || !members.includes(me)) {
        setMsgs([]);
        setActiveOther(null);
        setCanDM(false);
        return;
      }
      const other = members.find((u) => u !== me)!;
      setActiveOther({ uid: other });

      // canDM: accepted connection (by id ή by pair)
      let ok = false;
      if (t.connectionId) {
        const cSnap = await getDoc(doc(db, "connections", t.connectionId));
        ok = cSnap.exists() && (cSnap.data() as any).status === "accepted";
      } else {
        const cSnap = await getDoc(doc(db, "connections", pairId(me, other)));
        ok = cSnap.exists() && (cSnap.data() as any).status === "accepted";
      }
      setCanDM(ok);

      if (ok) {
        // mark read on open
        try {
          await updateDoc(tRef, {
            [`reads.${me}`]: serverTimestamp(),
            [`unreadCounts.${me}`]: 0,
          });
        } catch {}

        const qMsgs = query(
          collection(db, "threads", activeTid, "messages"),
          orderBy("createdAt", "asc"),
          limit(200)
        );
        unsubMsgs = onSnapshot(qMsgs, async (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setMsgs(arr);

          const last = arr[arr.length - 1];
          if (last && last.sender !== me) {
            try {
              await updateDoc(tRef, {
                [`reads.${me}`]: serverTimestamp(),
                [`unreadCounts.${me}`]: 0,
              });
            } catch {}
          }
        });
      } else {
        setMsgs([]);
      }

      // εμπλούτισε στοιχεία άλλου
      try {
        const uSnap = await getDoc(doc(db, "users", other));
        let name: string | undefined;
        let email: string | undefined;
        let avatar: string | undefined;
        if (uSnap.exists()) {
          const ud = uSnap.data() as any;
          name = ud.name;
          email = ud.email;
          avatar = ud.photoURL || ud.avatarUrl || ud.picture || ud.photo;
        }
        const pSnap = await getDoc(doc(db, "users", other, "profile", "main"));
        if (pSnap.exists()) {
          const pd = pSnap.data() as any;
          avatar = pd.photoURL || pd.avatarUrl || pd.picture || pd.photo || avatar;
          name = name || pd.fullName;
        }
        setActiveOther({ uid: other, name, email, avatar });
      } catch {}
    }

    openThread();
    return () => {
      if (unsubMsgs) unsubMsgs();
    };
  }, [me, db, activeTid]);

  // ✅ Open with ?with= — καλεί το callable (server-side create/open)
  useEffect(() => {
    if (!me || !withUid) return;
    (async () => {
      setLoadingThread(true);
      try {
        const fn = httpsCallable<
          { otherUid: string },
          { threadId: string; canDM: boolean }
        >(getFunctions(undefined, "europe-west1"), "openOrCreateThread");
        const res = await fn({ otherUid: withUid });
        setActiveTid(res.data.threadId);
        setCanDM(res.data.canDM);
      } catch (e) {
        console.error(e);
        setCanDM(false);
      } finally {
        setLoadingThread(false);
      }
    })();
  }, [me, withUid]);

  // ✍️ helpers για typing (δικό μου flag στο RTDB)
  const setTyping = async (
    tid: string | null,
    uid: string | null,
    isTyping: boolean
  ) => {
    if (!tid || !uid) return;
    const myRef = rRef(rtdb, `typing/${tid}/${uid}`);
    typingRefRef.current = myRef;
    if (isTyping) {
      await rSet(myRef, true);
      rOnDisconnect(myRef).remove().catch(() => {});
    } else {
      await rRemove(myRef).catch(() => {});
    }
  };

  // καθάρισμα typing entry στο unmount
  useEffect(() => {
    return () => {
      if (typingRefRef.current) {
        rRemove(typingRefRef.current).catch(() => {});
      }
      if (typingTimer.current) {
        window.clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }
    };
  }, []);

  // παρακολούθηση "ο άλλος πληκτρολογεί"
  useEffect(() => {
    if (!activeTid || !activeOther) {
      setOtherTyping(false);
      return;
    }
    const refOtherTyping = rRef(rtdb, `typing/${activeTid}/${activeOther.uid}`);
    const unsub = rOnValue(refOtherTyping, (snap) => {
      setOtherTyping(!!snap.val());
    });
    return () => unsub();
  }, [activeTid, activeOther]);

  const send = async () => {
    if (!me || !activeTid || !composer.trim() || !canDM || !activeOther?.uid) return;
    const text = composer.trim();
    setComposer("");

    await addDoc(collection(db, "threads", activeTid, "messages"), {
      text,
      sender: me,
      createdAt: serverTimestamp(),
    });
    // ⚠️ δεν κάνουμε client meta-updates — τα αναλαμβάνει το cloud trigger
    // σταματάμε και το typing μου
    setTyping(activeTid, me, false);
  };

  // ενημέρωση typing όταν γράφω
  const onComposerChange = (v: string) => {
    setComposer(v);
    if (!me || !activeTid) return;

    // set typing = true άμεσα
    setTyping(activeTid, me, true);

    // και μετά από 1.2s αδράνειας -> false
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      setTyping(activeTid, me, false);
      typingTimer.current = null;
    }, 1200);
  };


// κάτω από το effect που ορίζει activeOther / activeTid (ή μετά το typing effect)
useEffect(() => {
  if (!activeOther?.uid) {
    setOtherOnline(false);
    setOtherLastSeen(null);
    return;
  }
  const statusRef = rRef(rtdb, `status/${activeOther.uid}`);
  const unsub = rOnValue(statusRef, (snap) => {
    const v = snap.val() as { state?: string; last_changed?: number } | null;
    setOtherOnline(v?.state === "online");
    setOtherLastSeen(v?.last_changed ?? null);
  });
  return () => unsub();
}, [activeOther?.uid]);



  return (
    <div className="grid grid-cols-[340px_minmax(0,1fr)] gap-6">
      <Card className="bg-[#0c1022]/60 border-white/5">
        <CardHeader className="pb-3">
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {threads.length === 0 ? (
            <div className="p-6 text-sm text-white/60">No conversations yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {threads.map((t) => {
                const selected = activeTid === t.id;
                const time = fmtTime(t.lastMessageAt);
                return (
                  <button
                    key={t.id}
                    onClick={async () => {
                      setActiveTid(t.id);

                      // optimistic clear badge
                      setThreads((prev) =>
                        prev.map((r) => (r.id === t.id ? { ...r, unread: false } : r))
                      );

                      try {
                        await updateDoc(doc(db, "threads", t.id), {
                          [`reads.${me}`]: serverTimestamp(),
                          [`unreadCounts.${me}`]: 0,
                        });
                      } catch (e) {
                        console.error("mark read failed", e);
                      }
                    }}
                    className={[
                      "w-full px-4 py-3 text-left transition flex items-center gap-3",
                      selected ? "bg-white/10" : "hover:bg-white/5",
                    ].join(" ")}
                  >
                    <AvatarCircle src={t.avatar} name={t.name} email={t.email} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {t.name ?? "(no name)"}
                          </div>
                          {t.unread && (
                            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold">
                              !
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] opacity-60 shrink-0">{time}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[11px] opacity-70 truncate">
                          {t.lastMessage}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* right side */}
      <Card className="bg-[#0c1022]/60 border-white/5">
        <CardHeader className="pb-3">
          {activeOther ? (
            <div className="flex items-center gap-3">
              <AvatarCircle
                src={activeOther.avatar}
                name={activeOther.name}
                email={activeOther.email}
                size={40}
              />
             <div className="leading-tight">
  <CardTitle className="leading-tight">
    {activeOther.name ?? activeOther.email ?? "Conversation"}
  </CardTitle>
  <div className="text-xs text-white/60 mt-1 flex items-center gap-2">
    {/* online badge */}
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        otherOnline ? "bg-green-500" : "bg-gray-500"
      }`}
      aria-hidden
    />
    {otherOnline ? "online" : `last seen ${formatLastSeen(otherLastSeen)}`}
    {otherTyping && <span className="ml-3 italic opacity-80">typing…</span>}
  </div>
</div>
          </div>
          ) : (
            <CardTitle>Select a conversation</CardTitle>
          )}
        </CardHeader>

        <CardContent className="h-[60vh] flex flex-col gap-3">
          {!activeTid ? (
            loadingThread ? (
              <div className="flex items-center gap-2 text-sm opacity-70">
                <Loader2 className="h-4 w-4 animate-spin" /> Opening…
              </div>
            ) : (
              <div className="text-sm opacity-70">
                Select a conversation on the left.
              </div>
            )
          ) : (
            <>
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto thin-scrollbar space-y-2 pr-1"
              >
                {msgs.map((m) => {
                  const mine = m.sender === me;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={[
                          "max-w-[72%] px-3 py-2 text-sm rounded-2xl",
                          mine
                            ? "bg-violet-600/80 text-white rounded-br-md"
                            : "bg-white/10 rounded-bl-md",
                        ].join(" ")}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={composer}
                  onChange={(e) => onComposerChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && composer.trim() && canDM) send();
                  }}
                  placeholder={
                    canDM
                      ? "Write a message…"
                      : "You can message only after you both connect (accepted)"
                  }
                  disabled={!canDM}
                  className="bg-white/5 border-white/10"
                />
                <Button onClick={send} disabled={!canDM || !composer.trim()}>
                  Send
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
