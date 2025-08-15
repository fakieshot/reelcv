import { useEffect, useMemo, useState } from "react";
import { getFirestore, collection, query, orderBy, limit, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

type Thread = {
  id: string;
  status: "open" | "closed";
  participants: string[];
  subject?: string;
  lastMessage?: string;
  lastMessageAt?: any;
  createdAt?: any;
};

type Message = {
  id: string;
  text: string;
  sender: "user" | "admin";
  uid?: string | null;
  createdAt?: any;
};

const db = getFirestore();

export default function SupportInbox() {
  const { toast } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState("");
  const me = auth.currentUser;

  // Φόρτωσε threads (τελευταία activity πρώτα)
  useEffect(() => {
    const qThreads = query(
      collection(db, "support_threads"),
      orderBy("lastMessageAt", "desc"),
      limit(100)
    );
    const unsub = onSnapshot(qThreads, (snap) => {
      setThreads(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Thread[]
      );
      // αυτόματο άνοιγμα πρώτου thread στην αρχή
      if (!activeId && snap.docs.length) setActiveId(snap.docs[0].id);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Φόρτωσε μηνύματα για ενεργό thread
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    const qMsgs = query(
      collection(db, "support_threads", activeId, "messages"),
      orderBy("createdAt", "asc"),
      limit(300)
    );
    const unsub = onSnapshot(qMsgs, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoadingMsgs(false);
    });
    return () => unsub();
  }, [activeId]);

  const send = async () => {
    if (!activeId || !text.trim()) return;
    try {
      const msg = {
        text: text.trim(),
        sender: "admin" as const,
        uid: me?.uid ?? null,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "support_threads", activeId, "messages"), msg);
      await updateDoc(doc(db, "support_threads", activeId), {
        lastMessage: msg.text,
        lastMessageAt: serverTimestamp(),
      });
      setText("");
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    }
  };

  const closeThread = async () => {
    if (!activeId) return;
    try {
      await updateDoc(doc(db, "support_threads", activeId), { status: "closed" });
      toast({ title: "Thread closed" });
    } catch (e: any) {
      toast({ title: "Failed to close", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Threads list */}
      <Card className="lg:col-span-1 shadow-soft">
        <CardHeader>
          <CardTitle>Support Threads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[70vh] overflow-auto">
          {threads.length === 0 && (
            <div className="text-sm text-muted-foreground">No threads yet.</div>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`w-full rounded-xl border p-3 text-left hover:bg-white/5 transition ${
                activeId === t.id ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{t.subject ?? "Support chat"}</div>
                <Badge variant={t.status === "open" ? "default" : "secondary"}>
                  {t.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t.lastMessage ?? "—"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {t.participants?.join(", ")}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Messages panel */}
      <Card className="lg:col-span-2 shadow-soft flex flex-col">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            {activeId ? `Thread: ${activeId.slice(0, 6)}…` : "No thread"}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={closeThread} disabled={!activeId}>
              Close thread
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-3">
          <div className="flex-1 min-h-[40vh] max-h-[60vh] overflow-auto space-y-2 rounded-xl border p-3">
            {loadingMsgs && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.sender === "admin" ? "ml-auto bg-primary/15" : "bg-white/5"
                }`}
              >
                {m.text}
              </div>
            ))}
            {!loadingMsgs && messages.length === 0 && (
              <div className="text-sm text-muted-foreground">No messages.</div>
            )}
          </div>

          <div className="flex gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your reply…"
              rows={2}
              className="bg-white/5"
            />
            <Button onClick={send} disabled={!activeId || !text.trim()}>
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
