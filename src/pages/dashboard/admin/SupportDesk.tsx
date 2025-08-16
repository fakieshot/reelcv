import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  getDoc,
  updateDoc,
  limit,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Thread = {
  id: string;
  status: "open" | "closed";
  participants: string[];
  subject?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: any;
  createdAt?: any;

  // Denormalized requester info (από το Widget)
  requesterUid?: string | null;
  requesterKey?: string | null;
  requesterEmail?: string | null;
  requesterName?: string | null;
  isGuest?: boolean;
  guestEmail?: string | null;
};

type Msg = {
  id: string;
  text: string;
  sender: "user" | "admin" | "guest";
  uid?: string | null;
  createdAt?: any;
  seenByAdmin?: boolean;
  seenByUser?: boolean;
};

const db = getFirestore();

export default function SupportDesk() {
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // UI state: filter & search
  const [tab, setTab] = useState<"all" | "open" | "closed">("open");
  const [search, setSearch] = useState("");

  // helpers: time formatting
  const toJSDate = (ts: any) =>
    ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  const timeHHMM = (ts: any) => {
    const d = toJSDate(ts);
    return d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  };

  // Threads subscription
  useEffect(() => {
    const qThreads = query(
      collection(db, "support_threads"),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(
      qThreads,
      (snap) => {
        const rows: Thread[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setThreads(rows);
        setLoadingThreads(false);
      },
      (e) => {
        console.error("Threads snapshot error:", e);
        setLoadingThreads(false);
      }
    );
    return () => unsub();
  }, []);

  // Active thread doc
  useEffect(() => {
    if (!activeId) {
      setActiveThread(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const t = await getDoc(doc(db, "support_threads", activeId));
        if (!cancelled) {
          setActiveThread(t.exists() ? ({ id: t.id, ...(t.data() as any) } as Thread) : null);
        }
      } catch (e) {
        console.error("Failed to read thread:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Messages subscription for active thread
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    const msgsRef = collection(db, "support_threads", activeId, "messages");
    const qMsgs = query(msgsRef, orderBy("createdAt", "asc"), limit(300));
    const unsub = onSnapshot(
      qMsgs,
      (snap) => {
        const rows: Msg[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setMessages(rows);
      },
      (e) => console.error("Messages snapshot error:", e)
    );
    return () => unsub();
  }, [activeId]);

  // Όταν ανοίγεις thread, μαρκάρεις όλα τα user/guest μηνύματα ως seenByAdmin
  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    const unseen = messages.filter(
      (m) => (m.sender === "user" || m.sender === "guest") && !m.seenByAdmin
    );
    if (unseen.length === 0) return;

    (async () => {
      try {
        const batch = writeBatch(db);
        unseen.forEach((m) => {
          batch.update(doc(db, "support_threads", activeId, "messages", m.id), {
            seenByAdmin: true,
          });
        });
        await batch.commit();
      } catch (e) {
        console.error("Failed to mark seenByAdmin:", e);
      }
    })();
  }, [activeId, messages]);

  const labelForThread = (t: Thread) => {
    if (t.requesterName) return t.requesterName;
    if (t.requesterEmail) return t.requesterEmail!;
    if (t.isGuest) return t.guestEmail ?? t.requesterKey ?? "Guest";
    if (t.requesterUid) return `User ${String(t.requesterUid).slice(0, 6)}…`;
    const fallback = (t.participants || [])[0];
    return fallback || t.id;
  };

  // Search + filter εφαρμογή
  const visibleThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((t) => {
      const byTab = tab === "all" ? true : t.status === tab;
      if (!byTab) return false;
      if (!q) return true;
      const label = labelForThread(t).toLowerCase();
      const last = (t.lastMessage || "").toLowerCase();
      return label.includes(q) || last.includes(q);
    });
  }, [threads, tab, search]);

  const send = async () => {
    if (!activeId || !text.trim()) return;
    setSending(true);
    try {
      const msg = {
        text: text.trim(),
        sender: "admin" as const,
        uid: auth.currentUser?.uid ?? null,
        createdAt: serverTimestamp(),
        seenByAdmin: true,
        seenByUser: false,
      };
      await addDoc(collection(db, "support_threads", activeId, "messages"), msg);

      await setDoc(
        doc(db, "support_threads", activeId),
        { lastMessage: msg.text, lastMessageAt: serverTimestamp() },
        { merge: true }
      );

      setText("");
    } catch (e) {
      console.error("Failed to send admin message:", e);
    } finally {
      setSending(false);
    }
  };

  const closeThread = async (id: string) => {
    try {
      // 1) Μήνυμα ειδοποίησης προς τον χρήστη
      const noticeText =
        "This conversation has been closed by support. You can start a new thread at any time.";
      await addDoc(collection(db, "support_threads", id, "messages"), {
        text: noticeText,
        sender: "admin",
        uid: auth.currentUser?.uid ?? null,
        createdAt: serverTimestamp(),
        seenByAdmin: true,
        seenByUser: false,
      });

      // 2) Μαρκάρισμα thread ως closed + ενημέρωση lastMessage
      await updateDoc(doc(db, "support_threads", id), {
        status: "closed",
        lastMessage: noticeText,
        lastMessageAt: serverTimestamp(),
        closedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to close thread:", e);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6">
      {/* Left: threads list */}
      <Card className="w-80 text-white border-white/10
                       bg-gradient-to-b from-[#0f0f18] via-[#141428] to-[#0b0b16]">
        <CardHeader>
          <CardTitle>Support Threads</CardTitle>

          {/* Tabs (All/Open/Closed) */}
          <div className="mt-3 flex gap-2">
            {(["all", "open", "closed"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-full px-3 py-1 text-xs transition
                  ${tab === k ? "bg-white/20" : "bg-white/10 hover:bg-white/15"}`}
              >
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mt-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user or last message…"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm
                         placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col divide-y divide-white/10">
            {loadingThreads && (
              <div className="flex items-center gap-2 p-4 text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            )}
            {!loadingThreads && visibleThreads.length === 0 && (
              <div className="p-4 text-white/60">No threads yet.</div>
            )}
            {visibleThreads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`flex w-full items-start gap-2 p-3 text-left hover:bg-white/5 ${
                  activeId === t.id ? "bg-white/10" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{labelForThread(t)}</div>
                    <Badge
                      variant={t.status === "open" ? "default" : "secondary"}
                      className={t.status === "open" ? "bg-emerald-600" : "bg-white/20"}
                    >
                      {t.status}
                    </Badge>
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs text-white/70">
                    {t.lastMessage || "—"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Right: messages panel */}
      <Card className="flex-1 text-white border-white/10
                       bg-gradient-to-b from-[#0b0b14] via-[#121225] to-[#0a0a15]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {activeThread ? labelForThread(activeThread) : "Select a thread"}
          </CardTitle>
          {activeThread && activeThread.status === "open" && (
            <Button
              variant="secondary"
              onClick={() => closeThread(activeThread.id)}
              className="bg-white/10 hover:bg-white/15 text-white"
            >
              Close thread
            </Button>
          )}
        </CardHeader>

        <CardContent className="flex h-[calc(100vh-220px)] flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-auto p-5 space-y-3">
            {activeId && messages.length === 0 && (
              <div className="text-sm text-white/60">No messages yet.</div>
            )}
            {messages.map((m) => {
              const mine = m.sender === "admin";
              const who =
                m.sender === "admin" ? "Admin" : m.sender === "guest" ? "Guest" : "User";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine && (
                    <div className="mr-2 mt-1 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[11px]">
                      U
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-soft ${
                      mine ? "ml-auto bg-white/10 text-white" : "bg-violet-600/80 text-white"
                    }`}
                  >
                    <div className="mb-1 text-[11px] opacity-80">{who}</div>
                    <div>{m.text}</div>
                    <div className={`mt-1 text-[10px] opacity-70 ${mine ? "text-right" : ""}`}>
                      {timeHHMM(m.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Composer */}
          <div className="mt-4 flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={activeId ? "Type your reply…" : "Select a thread to reply"}
              rows={2}
              className="bg-white/10 text-white placeholder:text-white/60"
              disabled={!activeId}
            />
            <Button onClick={send} disabled={!activeId || !text.trim() || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
