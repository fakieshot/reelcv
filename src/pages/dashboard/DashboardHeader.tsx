import useAuthUser from "@/hooks/useAuthUser";
// ⬇️ βάλε αγκύλες — είναι named export
import { useUserProfile } from "@/hooks/useUserProfile";
import { useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { Link, useNavigate } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

// ✅ Χρησιμοποιούμε το δικό σου logo
import logo from "@/assets/branding/logo.png";
import { Bell, Search, User, Loader2 } from "lucide-react";

import { useRef, useState } from "react";
import {
  getFirestore,
  collection,
  query as fsQuery,
  where,
  orderBy,
  startAt,
  endAt,
  limit,
  getDocs,
  onSnapshot,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ProfilePreview from "@/pages/dashboard/components/ProfilePreview";

import { DialogClose } from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export default function DashboardHeader() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const pairId = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);

  const goToProfile = () => navigate("/dashboard/reelcv");
  const goToSettings = () => navigate("/dashboard/settings");

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed out" });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Sign out failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const { user } = useAuthUser();
  const { profile } = useUserProfile();

  const displayName =
    (profile?.fullName?.trim?.() ||
      user?.displayName?.trim?.() ||
      user?.email?.split("@")[0]) ?? "User";

  const email = user?.email ?? "";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const db = getFirestore();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<
    Array<{
      id: string;
      name?: string;
      email?: string;
      role?: string;
      conn?: "none" | "incoming" | "outgoing" | "connected";
    }>
  >([]);

  const [previewUid, setPreviewUid] = useState<string | null>(null);

  const searchTimer = useRef<number | null>(null);
  const me = auth.currentUser?.uid ?? null;

  const runSearch = async (text: string) => {
    const q = toSearchKey(text);
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const col = collection(db, "users");
      const qref = fsQuery(
        col,
        where("visibility", "==", "public"),
        orderBy("nameLower"),
        startAt(q),
        endAt(q + "\uf8ff"),
        limit(8)
      );
      const snap = await getDocs(qref);
      const base = snap.docs.map((d) => {
        const x = d.data() as any;
        return { id: d.id, name: x.name ?? x.displayName, email: x.email, role: x.role };
      });

      // ➕ Υπολογισμός connection state ανά αποτέλεσμα (μέχρι 8 – οκ)
      const withConn = await Promise.all(base.map(async r => {
        if (!me || me === r.id) return { ...r, conn: undefined as any };
        try {
          const cs = await getDoc(doc(db, "connections", pairId(me, r.id)));
          if (!cs.exists()) return { ...r, conn: "none" as const };
          const cd = cs.data() as any;
          if (cd.status === "accepted") return { ...r, conn: "connected" as const };
          if (cd.status === "pending") {
            if (cd.requestedBy === me) return { ...r, conn: "outgoing" as const };
            if (cd.requestedTo === me) return { ...r, conn: "incoming" as const };
          }
        } catch {}
        return { ...r, conn: "none" as const };
      }));
      setResults(withConn);
    } finally { setSearching(false); }
  };


  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value;
    setSearchText(t);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => runSearch(t), 300) as unknown as number;
  };

  // ================================
  // Bell: ONLY Pending connects (αφαιρέθηκε η λογική για messages)
  // + ΕΙΔΟΠΟΙΗΣΕΙΣ από users/{uid}/notifications
  // ================================
  function PendingConnectsBell() {
    const db = getFirestore();
    // ➜ ΠΑΡΕ reactive UID, όχι auth.currentUser
    const { user } = useAuthUser();
    const me = user?.uid ?? null;
    const nav = useNavigate();

    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState<Array<{ id: string; requestedBy: string; requestedTo: string; members: string[] }>>([]);
    // 🔹 ΝΕΟ: inbox ειδοποιήσεων (unread)
    const [inbox, setInbox] = useState<Array<{ id:string; type:string; by?:string; fromUid?:string; connectionId?:string; createdAt?:any }>>([]);

    useEffect(() => {
      if (!me) return;
      const q = fsQuery(
        collection(db, "connections"),
        where("requestedTo", "==", me),
        where("status", "==", "pending")
      );
      const unsub = onSnapshot(q, snap =>
        setPending(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
      );
      return () => unsub();
    }, [me, db]);

    // 🔹 ΝΕΟ: notifications listener
    useEffect(() => {
      if (!me) return;
      const q = fsQuery(
        collection(db, `users/${me}/notifications`),
        where("read", "==", false),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const unsub = onSnapshot(q, snap =>
        setInbox(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
      );
      return () => unsub();
    }, [me, db]);

    const count = pending.length + inbox.length;

    return (
      <div className="relative">
        <Button variant="ghost" size="icon" aria-label="Notifications" className="text-white/80 hover:text-white hover:bg-white/10 relative" onClick={() => setOpen(v => !v)}>
          <Bell className="w-5 h-5" />
          {count > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-fuchsia-500 text-[10px] font-bold grid place-items-center">{count}</span>}
        </Button>

        {open && (
          <div className="absolute right-0 mt-2 w-96 rounded-xl border border-white/10 bg-[#11122a] text-white shadow-xl z-50 p-2">
            <div className="px-2 py-1 text-sm text-white/70">Connection Requests</div>
            <div className="divide-y divide-white/10">
              {pending.length === 0 ? (
                <div className="p-4 text-sm text-white/60">No pending requests.</div>
              ) : (
                pending.map(it => (
                  <div key={it.id} className="p-3 flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                      {(it.requestedBy || "U").slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{it.requestedBy}</div>
                      <div className="text-xs text-white/70 truncate">{it.id}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-fuchsia-600 hover:bg-fuchsia-500"
                        onClick={async () => {
                          await updateDoc(doc(db, "connections", it.id), { status: "accepted", acceptedAt: serverTimestamp() });
                          const tid = pairId(it.requestedBy, it.requestedTo);
                          const tRef = doc(db, "threads", tid);
                          const tSnap = await getDoc(tRef);
                          if (!tSnap.exists()) {
                            await setDoc(tRef, {
                              members: [it.requestedBy, it.requestedTo],
                              createdAt: serverTimestamp(),
                              lastMessageAt: serverTimestamp(),
                              connectionId: it.id,
                            });
                          }
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateDoc(doc(db, "connections", it.id), { status: "declined", declinedAt: serverTimestamp() })}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 🔹 ΝΕΟ: Notifications inbox */}
            <div className="px-2 pt-3 pb-1 text-sm text-white/70">Notifications</div>
            <div className="divide-y divide-white/10">
              {inbox.length === 0 ? (
                <div className="p-3 text-sm text-white/60">No new notifications.</div>
              ) : (
                inbox.map(n => (
                  <div key={n.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0 text-sm">
                      {n.type === "connection_accepted" && (
                        <div><b>{n.by}</b> accepted your request</div>
                      )}
                      {n.type === "connection_declined" && (
                        <div><b>{n.by}</b> declined your request</div>
                      )}
                      {n.type === "connection_request" && (
                        <div><b>{n.fromUid}</b> sent you a connection</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateDoc(doc(db, `users/${me}/notifications/${n.id}`), { read: true })}
                    >
                      Dismiss
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const toSearchKey = (s: string) =>
    (s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim();

  useEffect(() => {
    const run = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const db = getFirestore();

      const userRef = doc(db, "users", uid);
      const profRef = doc(db, "users", uid, "profile", "main");

      const [uSnap, pSnap] = await Promise.all([getDoc(userRef), getDoc(profRef)]);
      const u = uSnap.data() as any;
      const fullName =
        (pSnap.exists() ? (pSnap.data() as any)?.fullName : "") || u?.name || "";

      if (!u?.nameLower && fullName) {
        await setDoc(userRef, { name: fullName, nameLower: toSearchKey(fullName) }, { merge: true });
      }
    };
    run().catch(() => {});
  }, []);

  // ποιο result είναι ενεργό για keyboard nav
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  function selectResult(index: number) {
    if (index < 0 || index >= results.length) return;
    const r = results[index];
    setSearchOpen(false);
    setPreviewUid(r.id);
  }

  // highlight του query μέσα στο κείμενο
  function highlight(text = "", q = "") {
    const t = String(text);
    const qq = q.trim();
    if (!qq) return t;
    const i = t.toLowerCase().indexOf(qq.toLowerCase());
    if (i === -1) return t;
    return (
      <>
        {t.slice(0, i)}
        <span className="text-primary font-semibold">{t.slice(i, i + qq.length)}</span>
        {t.slice(i + qq.length)}
      </>
    );
  }

  // ── Connect / Accept από Search row ─────────────────────────────
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const requestConnectTo = async (targetId: string) => {
  if (!me || me === targetId) return;
  setActionLoadingId(targetId);
  try {
    await addDoc(collection(db, "network_requests"), {
      fromUid: me,
      toUid: targetId,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    toast({ title: "Request sent" });
    setResults(prev => prev.map(r => r.id === targetId ? { ...r, conn: "outgoing" } : r));
  } finally {
    setActionLoadingId(null);
  }
};


  const acceptFromSearch = async (targetId: string) => {
    if (!me || me === targetId) return;
    setActionLoadingId(targetId);
    try {
      const cid = pairId(me, targetId);
      await updateDoc(doc(db, "connections", cid), {
        status: "accepted",
        acceptedAt: serverTimestamp(),
      });
      // create thread if missing
      const tRef = doc(db, "threads", cid);
      const tSnap = await getDoc(tRef);
      if (!tSnap.exists()) {
        await setDoc(tRef, {
          members: [me, targetId],
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          connectionId: cid,
        });
      }
      toast({ title: "Connected" });
      setResults((prev) => prev.map((r) => (r.id === targetId ? { ...r, conn: "connected" } : r)));
    } finally {
      setActionLoadingId(null);
    }
  };

  const goToDM = (targetId: string) => {
    setSearchOpen(false);
    navigate(`/dashboard/messages?with=${targetId}`);
  };

  return (
    // Πλήρως διάφανο header + blur. Όλα τα κείμενα/εικονίδια λευκά.
    <header className="w-full border-b border-white/10 bg-transparent backdrop-blur">
      <div className="mx-auto max-w-7xl h-14 px-4 flex items-center justify-between text-white">
        {/* LEFT: Logo */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard" aria-label="ReelCV" className="flex items-center gap-2 md:gap-3">
            <img
              src={logo}
              alt="ReelCV"
              className="h-[100px] w-auto -mt-[2px] select-none shrink-0"
              draggable={false}
            />
          </Link>
        </div>

        {/* RIGHT: actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* ΜΟΝΟ pending connects στο κουδουνάκι + inbox notifications */}
          <PendingConnectsBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 text-white/90 hover:text-white hover:bg-white/10">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-semibold">
                    {initials}
                  </div>

                  {/* Name + email */}
                  <div className="leading-tight text-right">
                    <div className="font-semibold">{displayName}</div>
                    <div className="text-xs text-white/70">{email}</div>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#11122a] text-white">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={goToProfile}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={goToSettings}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleSignOut}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={searchOpen} onOpenChange={(o) => { setSearchOpen(o); if (!o) setActiveIndex(-1); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 bg-neutral-900/95 text-white shadow-2xl">
          {/* Top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500" />

          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-lg font-semibold">Search profiles</h3>
            <p className="text-xs text-white/60 mt-0.5">
              Type a name. Use ↑/↓ and Enter. Press Esc to close.
            </p>
          </div>

          {/* Search input */}
          <div className="px-5 pb-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                <Search className="h-4 w-4" />
              </span>
              <Input
                autoFocus
                value={searchText}
                onChange={onSearchChange}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.min(i + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    if (activeIndex >= 0) {
                      e.preventDefault();
                      selectResult(activeIndex);
                    }
                  }
                }}
                placeholder="Type a name…"
                className="pl-9 pr-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-violet-500"
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin opacity-70" />
                </span>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="px-3 pb-4">
            <div className="max-h-80 overflow-auto thin-scrollbar space-y-2">
              {/* Loading skeletons */}
              {searching && results.length === 0 && (
                <div className="space-y-2 px-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-[60px] rounded-xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!searching && results.length === 0 && searchText.trim() && (
                <div className="px-2 py-10 text-center text-sm text-white/60">
                  No results for <span className="text-white">{searchText.trim()}</span>.
                </div>
              )}

              {/* Items */}
              {results.map((r, idx) => (
                <button
                  key={r.id}
                  onClick={() => selectResult(idx)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={[
                    "w-full text-left rounded-xl border border-white/10 px-3 py-3 transition",
                    activeIndex === idx
                      ? "bg-white/10 ring-1 ring-violet-400/40"
                      : "bg-white/[0.04] hover:bg-white/[0.07]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar with initials */}
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-white/20 to-white/5 text-xs font-semibold">
                      {(r.name ?? r.email ?? "U")
                        .split(" ")
                        .filter(Boolean)
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {highlight(r.name ?? "(no name)", searchText)}
                      </div>
                      <div className="text-xs text-white/60 truncate">{r.email}</div>
                    </div>

                    {/* Action buttons (όπως τα είχες) */}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewUid} onOpenChange={(o) => { if (!o) setPreviewUid(null); }}>
        <DialogContent hideClose className="max-w-6xl p-0 bg-transparent border-none shadow-none">
          <div className="relative">
            <DialogClose asChild>
              <button
                aria-label="Close preview"
                className="absolute -right-2 -top-2 z-20 rounded-full p-2
                     bg-black/70 text-white hover:bg-black/80
                     border border-white/10 shadow"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogClose>

            <div className="rounded-2xl bg-neutral-900/85 ring-1 ring-white/10 p-6 shadow-2xl">
              {previewUid && <ProfilePreview userId={previewUid} />}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
