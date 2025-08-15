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
} from "firebase/firestore";


import { getDocs, writeBatch } from "firebase/firestore";

type SupportMessage = {
  id?: string;
  text: string;
  sender: "user" | "admin";
  uid?: string | null;
  createdAt?: any;

  // ✅ νέα πεδία κατάστασης
  delivered?: boolean;
  deliveredAt?: any;         // serverTimestamp() όταν γραφτεί στο Firestore
  seenBy?: {
    user?: boolean;
    admin?: boolean;
  };
  seenAt?: {
    user?: any;
    admin?: any;
  };
};


type Thread = {
  id?: string;
  status: "open" | "closed";
  createdAt?: any;
  participants: string[]; // uids (or "guest:<fingerprint>")
  lastMessage?: string;
  lastMessageAt?: any;
  subject?: string;
  guestEmail?: string;
};

const db = getFirestore();

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // --- μικρό avatar εικόνας στο header (προαιρετικό αρχείο) ---
  // Βάλε εδώ το asset σου (π.χ. "/assets/branding/support-avatar.png")
  const SUPPORT_AVATAR_SRC = "/src/assets/branding/support-avatar.png";
  const [avatarError, setAvatarError] = useState(false);

  // ---- ήχοι (WebAudio “blip” για αποστολή/λήψη) ----
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ensureAudio = async () => {
    if (!audioCtxRef.current) {
      const Ctx = (window.AudioContext ||
        (window as any).webkitAudioContext) as typeof AudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === "suspended") {
      try {
        await audioCtxRef.current.resume();
      } catch {}
    }
    return audioCtxRef.current!;
  };

  const playBlip = async (
    freq = 880,
    duration = 0.12,
    type: OscillatorType = "sine",
    volume = 0.07
  ) => {
    try {
      const ctx = await ensureAudio();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(volume, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      o.start();
      o.stop(ctx.currentTime + duration);
    } catch {
      // Αν μπλοκάρει από τον browser πριν υπάρξει interaction, αγνόησέ το σιωπηλά
    }
  };

  const playSend = () => playBlip(880, 0.12, "sine", 0.07);
  const playReceive = () => playBlip(560, 0.15, "triangle", 0.06);

  const me = auth.currentUser;
  // αν δεν έχει login, δημιουργούμε “fingerprint” για guest
  const guestKey = useMemo(() => {
    if (me) return null;
    const key = localStorage.getItem("rcv_guest_key") ?? crypto.randomUUID();
    localStorage.setItem("rcv_guest_key", key);
    return `guest:${key}`;
  }, [me]);

  // ανοίγοντας το widget, βρίσκουμε/φτιάχνουμε thread
  useEffect(() => {
    if (!open) return;

    let unsub: any;
    (async () => {
      const participantsId = me?.uid ?? guestKey!;
      const threadsRef = collection(db, "support_threads");

      // αν υπάρχει cached thread, συνέχισε εκεί
      const cached = localStorage.getItem("rcv_support_thread");
      const subscribe = (tid: string) => {
        const msgsRef = collection(db, "support_threads", tid, "messages");
        const q = query(msgsRef, orderBy("createdAt", "asc"), limit(200));
        unsub = onSnapshot(q, (snap) => {
          setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        });
      };

      if (cached) {
        setThreadId(cached);
        subscribe(cached);
        return;
      }

      // αλλιώς νέο thread
      const newThread: Thread = {
        status: "open",
        createdAt: serverTimestamp(),
        participants: [participantsId],
        subject: "Support chat",
      };
      const t = await addDoc(threadsRef, newThread);
      localStorage.setItem("rcv_support_thread", t.id);
      setThreadId(t.id);
      subscribe(t.id);
    })();

    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // auto-scroll στο κάτω μέρος
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  // ήχος για εισερχόμενα (όχι στο πρώτο load)
  const prevCountRef = useRef(0);
  const initialDoneRef = useRef(false);
  useEffect(() => {
    const count = messages.length;
    if (!initialDoneRef.current) {
      initialDoneRef.current = true;
      prevCountRef.current = count;
      return;
    }
    if (count > prevCountRef.current) {
      const last = messages[count - 1];
      // Παίξε ήχο μόνο για μηνύματα "admin" (εισερχόμενα)
      if (last?.sender === "admin") {
        playReceive();
      }
    }
    prevCountRef.current = count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const send = async () => {
  if (!threadId || !text.trim()) return;
  setSending(true);
  try {
    const msg: SupportMessage = {
      text: text.trim(),
      sender: "user",
      uid: me?.uid ?? null,
      createdAt: serverTimestamp(),

      // ✅ delivered/seen defaults
      delivered: true,
      deliveredAt: serverTimestamp(),
      seenBy: { user: true, admin: false }, // ο αποστολέας πάντα “το έχει δει”
      seenAt: { user: serverTimestamp() },
    };

    await addDoc(collection(db, "support_threads", threadId, "messages"), msg);

    await setDoc(
      doc(db, "support_threads", threadId),
      {
        lastMessage: msg.text,
        lastMessageAt: serverTimestamp(),
      },
      { merge: true }
    );

    setText("");
  } finally {
    setSending(false);
  }
};

const markAllIncomingAsSeen = async () => {
  if (!threadId) return;
  const role: "user" | "admin" = "user";

  const msgsRef = collection(db, "support_threads", threadId, "messages");
  // μόνο όσα δεν είναι δικά μου και δεν έχουν seen από μένα
  const qNotSeen = query(
    msgsRef,
    orderBy("createdAt", "asc"),
    limit(200)
  );

  const snap = await getDocs(qNotSeen);
  const batch = writeBatch(db);
  const now = serverTimestamp();

  snap.forEach((d) => {
    const m = d.data() as SupportMessage;
    if (m.sender !== role && !(m.seenBy?.user)) {
      batch.update(d.ref, {
        [`seenBy.user`]: true,
        [`seenAt.user`]: now,
      });
    }
  });

  await batch.commit();
};









// όταν ανοίγει
useEffect(() => {
  if (open) {
    // μικρή καθυστέρηση να πέσουν τα μηνύματα
    setTimeout(() => markAllIncomingAsSeen(), 100);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [open]);

// όταν αλλάζουν τα μηνύματα
useEffect(() => {
  listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  if (open) markAllIncomingAsSeen();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [messages.length]);






  return (
    <>
      {/* Floating Button — εμφανίζεται μόνο όταν το chat είναι κλειστό */}
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-strong gradient-primary text-white z-[60]"
          aria-label="Need help?"
        >
          <MessageCircleQuestion className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col bg-[#11122a] text-white"
        >
          <SheetHeader className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              {/* μικρό εικονίδιο support */}
              {!avatarError ? (
                <img
                  src={SUPPORT_AVATAR_SRC}
                  alt="Support"
                  onError={() => setAvatarError(true)}
                  className="h-9 w-9 rounded-full ring-2 ring-white/15 object-cover"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] grid place-items-center ring-2 ring-white/15">
                  <MessageCircleQuestion className="h-5 w-5 text-white" />
                </div>
              )}

              <div>
                <SheetTitle className="text-white">Need help?</SheetTitle>
                <SheetDescription className="text-white/70">
                  Στείλε μας μήνυμα και θα απαντήσουμε το συντομότερο.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-soft ${
                  m.sender === "user" ? "ml-auto bg-white/10" : "bg-white/5"
                }`}
              >
                {m.text}
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-sm text-white/60">
                Ξεκίνα τη συνομιλία γράφοντας το πρώτο μήνυμα…
              </div>
            )}
          </div>

          <SheetFooter className="p-3 border-t border-white/10">
            <div className="flex w-full gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Γράψε μήνυμα…"
                rows={2}
                className="bg-white/5 focus-visible:ring-white/30 text-white"
              />
              <Button
                onClick={send}
                disabled={sending || !text.trim()}
                className="self-end"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
