import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircleQuestion, Send, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/lib/firebase";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  where,
} from "firebase/firestore";

type SupportMessage = {
  id: string;
  text: string;
  sender: "user" | "admin" | "guest";
  uid?: string | null;
  createdAt?: any;
  seenByAdmin?: boolean;
  seenByUser?: boolean;
};

type SupportThread = {
  id: string;
  status: "open" | "closed";
  participants: string[]; // uids (or "guest:<fingerprint>")
  guestEmail?: string;
  isGuest?: boolean;

  // Denormalized user info (για σωστή ετικέτα στον admin)
  requesterUid?: string | null;
  requesterKey?: string | null;  // π.χ. guest:<uuid>
  requesterEmail?: string | null;
  requesterName?: string | null;

  subject?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: any;
  createdAt?: any;
};

const db = getFirestore();

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // --- μικρό avatar εικόνας στο header (προαιρετικό αρχείο) ---
  const SUPPORT_AVATAR_SRC = "/src/assets/branding/support-avatar.png";
  const [avatarError, setAvatarError] = useState(false);

  // ---- ήχοι (WebAudio “blip” για αποστολή/λήψη) ----
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      try {
        audioCtxRef.current?.close();
      } catch {}
    };
  }, []);

  const playBlip = (freq = 660, ms = 100) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.07, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
  };
  const playSend = () => playBlip(760, 80);
  const playReceive = () => playBlip(520, 120);

  // αν δεν έχει login, δημιουργούμε “fingerprint” για guest
  const guestKey = useMemo(() => {
    const key = localStorage.getItem("rcv_guest_key") ?? crypto.randomUUID();
    localStorage.setItem("rcv_guest_key", key);
    return `guest:${key}`;
  }, []);

  const me = auth.currentUser || null;
  const uid = me?.uid ?? null;

  // 🔒 Per-identity cache key
  const identityKey = uid ?? guestKey;
  const THREAD_CACHE_KEY = `rcv_support_thread__${identityKey}`;

  // Καθάρισε το παλιό global key (migration από παλαιότερη έκδοση)
  useEffect(() => {
    localStorage.removeItem("rcv_support_thread");
  }, []);

  // helpers: time formatting
  const toJSDate = (ts: any) =>
    ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  const timeHHMM = (ts: any) => {
    const d = toJSDate(ts);
    return d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  };

  // Προσπάθησε να φορτώσεις cached thread ΚΑΙ να το επικυρώσεις (μόνο αν είναι OPEN)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = localStorage.getItem(THREAD_CACHE_KEY);
      if (!cached) return;

      try {
        const tSnap = await getDoc(doc(db, "support_threads", cached));
        if (!tSnap.exists()) {
          localStorage.removeItem(THREAD_CACHE_KEY);
          return;
        }
        const t = tSnap.data() as SupportThread;
        const belongs =
          t.status === "open" && (
            (t.participants || []).includes(identityKey) ||
            (uid && t.requesterUid === uid) ||
            (!uid && t.requesterKey === identityKey)
          );

        if (belongs && !cancelled) {
          setThreadId(cached);
        } else {
          localStorage.removeItem(THREAD_CACHE_KEY);
          setThreadId(null);
        }
      } catch {
        localStorage.removeItem(THREAD_CACHE_KEY);
        setThreadId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [THREAD_CACHE_KEY, identityKey, uid]);

  // Συνδρομή στα μηνύματα του ενεργού thread
  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    const msgsRef = collection(db, "support_threads", threadId, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"), limit(200));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: SupportMessage[] = snap.docs.map((d) => {
          const v = d.data() as any;
          return {
            id: d.id,
            text: String(v.text ?? ""),
            sender: v.sender as any,
            uid: v.uid ?? null,
            createdAt: v.createdAt,
            seenByAdmin: v.seenByAdmin ?? false,
            seenByUser: v.seenByUser ?? false,
          };
        });
        setMessages(data);
      },
      (e) => {
        console.error("Support messages snapshot error:", e);
      }
    );
    return () => unsub();
  }, [threadId]);

  // Παίξε ήχο όταν έρχεται νέο admin μήνυμα
  useEffect(() => {
    const count = messages.length;
    if (count > prevCountRef.current) {
      const last = messages[count - 1];
      if (last?.sender === "admin") playReceive();
    }
    prevCountRef.current = count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ✅ Δημιουργία/εύρεση ΜΟΝΟ open thread
  const ensureThread = async () => {
    // Αν υπάρχει threadId, έλεγξε αν είναι OPEN — αλλιώς καθάρισε και συνέχισε
    if (threadId) {
      try {
        const t = await getDoc(doc(db, "support_threads", threadId));
        if (t.exists() && (t.data() as any).status === "open") {
          return threadId;
        }
      } catch {}
      localStorage.removeItem(THREAD_CACHE_KEY);
      setThreadId(null);
    }

    // Βρες existing OPEN thread για αυτό το identity
    const qThreads = query(
      collection(db, "support_threads"),
      where("participants", "array-contains", identityKey),
      where("status", "==", "open"),
      orderBy("lastMessageAt", "desc"),
      limit(1)
    );

    try {
      let existingId: string | null = null;
      const snap = await (await import("firebase/firestore")).getDocs(qThreads);
      snap.forEach((d) => (existingId = d.id));
      if (existingId) {
        localStorage.setItem(THREAD_CACHE_KEY, existingId);
        setThreadId(existingId);
        return existingId;
      }
    } catch {
      // ignore
    }

    // Αν δεν βρέθηκε, φτιάξε ΝΕΟ open thread
    const tRef = await addDoc(collection(db, "support_threads"), {
      status: "open",
      participants: [identityKey],
      isGuest: !uid,

      requesterUid: uid ?? null,
      requesterKey: !uid ? identityKey : null,
      requesterEmail: me?.email ?? null,
      requesterName: me?.displayName ?? null,

      subject: null,
      lastMessage: "",
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
    });

    localStorage.setItem(THREAD_CACHE_KEY, tRef.id);
    setThreadId(tRef.id);
    return tRef.id;
  };

  const openWidget = async () => {
    setOpen(true);
    try {
      await ensureThread();
    } catch (e) {
      console.error("Failed to ensure thread:", e);
    }
  };

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const tid = await ensureThread(); // θα δώσει νέο id αν το προηγούμενο ήταν closed
      const msg = {
        text: text.trim(),
        sender: uid ? "user" : "guest",
        uid: uid ?? null,
        createdAt: serverTimestamp(),
        seenByAdmin: false,
        seenByUser: true,
      };
      await addDoc(collection(db, "support_threads", tid, "messages"), msg);

      // update thread summary
      await setDoc(
        doc(db, "support_threads", tid),
        {
          lastMessage: msg.text,
          lastMessageAt: serverTimestamp(),
        },
        { merge: true }
      );

      setText("");
      playSend();
    } catch (e) {
      console.error("Failed to send support message:", e);
    } finally {
      setSending(false);
    }
  };

  // Μαρκάρισμα ως seen από τον χρήστη όταν ανοίγει το sheet
  useEffect(() => {
    if (!open || !threadId || messages.length === 0) return;
    const adminUnseen = messages.filter((m) => m.sender === "admin" && !m.seenByUser);
    if (adminUnseen.length === 0) return;

    (async () => {
      try {
        const batch = (await import("firebase/firestore")).writeBatch(db);
        adminUnseen.forEach((m) => {
          batch.update(doc(db, "support_threads", threadId, "messages", m.id), {
            seenByUser: true,
          });
        });
        await batch.commit();
      } catch (e) {
        console.error("Failed to mark messages seenByUser:", e);
      }
    })();
  }, [open, threadId, messages]);

  return (
    <>
      {/* Floating button */}
      <button
        aria-label="Support"
        onClick={openWidget}
        className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl hover:bg-violet-700 focus:outline-none"
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg text-white border-white/10
                     bg-gradient-to-b from-[#0b0b14] via-[#121225] to-[#0a0a15]"
        >
          <SheetHeader>
            <div className="flex items-center gap-3">
              {!avatarError ? (
                <img
                  src={SUPPORT_AVATAR_SRC}
                  onError={() => setAvatarError(true)}
                  alt="Support"
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-violet-600" />
              )}
              <div>
                <SheetTitle className="text-white">Need help?</SheetTitle>
                <SheetDescription className="text-white/70">
                  Chat with ReelCV support
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Messages list */}
          <div
            className="mt-4 flex h-[60vh] flex-col gap-4 overflow-y-auto rounded-xl
                       p-3 bg-black/20 thin-scrollbar"
          >
            {messages.map((m) => {
              const mine = m.sender !== "admin";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine && (
                    <div className="mr-2 mt-1 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[11px]">
                      S
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow ${
                      mine ? "bg-violet-600/80 text-white" : "bg-white/10 text-white"
                    }`}
                  >
                    <div className="mb-1 text-[11px] opacity-80">
                      {mine ? "You" : "Support"}
                    </div>
                    <div>{m.text}</div>
                    <div className={`mt-1 text-[10px] opacity-70 ${mine ? "text-right" : ""}`}>
                      {timeHHMM(m.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <div className="grid h-full place-items-center text-sm text-white/70">
                Start the conversation — we usually reply quickly.
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="mt-4 flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message…"
              rows={2}
              className="resize-none bg-white/10 text-white placeholder:text-white/60"
            />
            <Button
              onClick={send}
              disabled={sending || !text.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          <SheetFooter />
        </SheetContent>
      </Sheet>
    </>
  );
}
