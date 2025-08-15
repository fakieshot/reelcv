import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getFirestore, collection, query, orderBy, limit, onSnapshot,
  addDoc, serverTimestamp, doc, setDoc, writeBatch, getDocs
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { Send } from "lucide-react";

type Thread = {
  id: string;
  status: "open" | "closed";
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt?: any;
  participants: string[];
  subject?: string;
};

type SupportMessage = {
  id?: string;
  text: string;
  sender: "user" | "admin";
  uid?: string | null;
  createdAt?: any;
  delivered?: boolean;
  deliveredAt?: any;
  seenBy?: { user?: boolean; admin?: boolean };
  seenAt?: { user?: any; admin?: any };
};

const db = getFirestore();

export default function SupportDesk() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const me = auth.currentUser;

  // φορτώνει threads (μπορεί να τα φιλτράρεις σε open/closed)
  useEffect(() => {
    const ref = collection(db, "support_threads");
    const qThreads = query(ref, orderBy("lastMessageAt", "desc"), limit(50));
    const unsub = onSnapshot(qThreads, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Thread[];
      setThreads(list);
      // αν δεν έχει active, πάρε το πρώτο
      if (!activeId && list[0]) setActiveId(list[0].id);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // φορτώνει messages για το active thread
  useEffect(() => {
    if (!activeId) { setMsgs([]); return; }
    const ref = collection(db, "support_threads", activeId, "messages");
    const qMsgs = query(ref, orderBy("createdAt", "asc"), limit(500));
    const unsub = onSnapshot(qMsgs, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SupportMessage[];
      setMsgs(list);
      // μόλις μπουν, κάνε seen τα εισερχόμενα προς admin
      setTimeout(() => markIncomingAsSeen(activeId), 50);
    });
    return () => unsub();
  }, [activeId]);

  const markIncomingAsSeen = async (threadId: string) => {
    const ref = collection(db, "support_threads", threadId, "messages");
    const qMsgs = query(ref, orderBy("createdAt", "asc"), limit(500));
    const snap = await getDocs(qMsgs);
    const batch = writeBatch(db);
    const now = serverTimestamp();

    snap.forEach(d => {
      const m = d.data() as SupportMessage;
      if (m.sender !== "admin" && !(m.seenBy?.admin)) {
        batch.update(d.ref, {
          ["seenBy.admin"]: true,
          ["seenAt.admin"]: now,
        });
      }
    });
    await batch.commit();
  };

  const send = async () => {
    if (!activeId || !text.trim()) return;
    const msg: SupportMessage = {
      text: text.trim(),
      sender: "admin",
      uid: me?.uid ?? null,
      createdAt: serverTimestamp(),
      delivered: true,
      deliveredAt: serverTimestamp(),
      seenBy: { admin: true, user: false },
      seenAt: { admin: serverTimestamp() },
    };
    await addDoc(collection(db, "support_threads", activeId, "messages"), msg);
    await setDoc(
      doc(db, "support_threads", activeId),
      { lastMessage: msg.text, lastMessageAt: serverTimestamp() },
      { merge: true }
    );
    setText("");
  };

  const closeThread = async (id: string) => {
    await setDoc(doc(db, "support_threads", id), { status: "closed" }, { merge: true });
  };

  return (
    <div className="fixed inset-0 bg-[#0b0b1b] text-white">
      {/* Top mini-header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
        <div className="font-semibold">Support Desk</div>
        <div className="text-xs text-white/60">
          {auth.currentUser?.email ?? "Admin"}
        </div>
      </div>

      {/* 2-pane layout */}
      <div className="h-[calc(100vh-3rem)] grid grid-cols-12">
        {/* Threads list */}
        <aside className="col-span-4 border-r border-white/10 overflow-auto">
          {threads.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`w-full text-left px-4 py-3 hover:bg-white/5 ${activeId === t.id ? "bg-white/10" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{t.subject ?? "Support chat"}</div>
                <span className={`text-[10px] rounded px-2 py-0.5 ${t.status === "open" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/70"}`}>
                  {t.status}
                </span>
              </div>
              <div className="text-sm text-white/70 truncate">{t.lastMessage ?? "—"}</div>
            </button>
          ))}
        </aside>

        {/* Active thread */}
        <section className="col-span-8 flex flex-col">
          <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
            <div className="font-medium">{activeId ?? "No thread"}</div>
            {activeId && (
              <Button variant="outline" size="sm" onClick={() => closeThread(activeId!)}>
                Close thread
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-soft ${
                  m.sender === "admin" ? "ml-auto bg-white/10" : "bg-white/5"
                }`}
              >
                <div>{m.text}</div>
                {/* small status line */}
                <div className="mt-1 text-[10px] text-white/50">
                  {m.sender === "admin" ? (
                    <>
                      {m.seenBy?.user ? "✓✓ seen" : "✓ delivered"}
                    </>
                  ) : (
                    <>
                      {m.seenBy?.admin ? "✓✓ seen" : "—"}
                    </>
                  )}
                </div>
              </div>
            ))}
            {!msgs.length && <div className="text-sm text-white/60">No messages.</div>}
          </div>

          <div className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your reply…"
                rows={2}
                className="bg-white/5 focus-visible:ring-white/30 text-white"
              />
              <Button onClick={send} disabled={!text.trim()} className="self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
