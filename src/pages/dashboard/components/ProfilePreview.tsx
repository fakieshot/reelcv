// src/pages/dashboard/components/ProfilePreview.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
  orderBy,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Linkedin, Github, Globe } from "lucide-react";

type Experience = {
  id: string;
  title: string;
  company?: string;
  start?: string;
  end?: string;
  description?: string;
};

function normalizeUrl(raw?: string) {
  if (!raw) return "";
  try {
    const withScheme =
      raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    const u = new URL(withScheme);
    return u.href;
  } catch {
    return "";
  }
}

const pairId = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);

export default function ProfilePreview({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const me = auth.currentUser?.uid ?? null;
  const target = userId ?? me;

  const [primaryURL, setPrimaryURL] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [experience, setExperience] = useState<Experience[]>([]);

  const [connState, setConnState] =
    useState<"none" | "sent" | "received" | "connected">("none");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAllExp, setShowAllExp] = useState(false);

  // ===== LOAD profile/reel/experience (όπως ήταν) =====
  useEffect(() => {
    if (!target) return;
    const db = getFirestore();

    const profileRef = doc(db, "users", target, "profile", "main");
    const unsubProfile = onSnapshot(
      profileRef,
      async (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setProfile(data);

        const primaryId = (data as any)?.primaryReelId as string | undefined;
        if (primaryId) {
          try {
            const primaryDoc = await getDoc(doc(db, "users", target, "reels", primaryId));
            if (primaryDoc.exists()) {
              const r = primaryDoc.data() as any;
              const url =
                r.processedDownloadURL || r.downloadURL || r.rawDownloadURL || null;
              setPrimaryURL(url);
              return;
            }
          } catch {}
        }

        try {
          const reelsCol = collection(db, "users", target, "reels");
          const qPrimary = query(reelsCol, where("isPrimary", "==", true), limit(1));
          const snapPrimary = await getDocs(qPrimary);
          if (!snapPrimary.empty) {
            const r = snapPrimary.docs[0].data() as any;
            const url =
              r.processedDownloadURL || r.downloadURL || r.rawDownloadURL || null;
            setPrimaryURL(url);
            return;
          }
        } catch {}

        try {
          const reelsCol = collection(db, "users", target, "reels");
          const qLatest = query(reelsCol, orderBy("createdAt", "desc"), limit(1));
          const snapLatest = await getDocs(qLatest);
          if (!snapLatest.empty) {
            const r = snapLatest.docs[0].data() as any;
            const url =
              r.processedDownloadURL || r.downloadURL || r.rawDownloadURL || null;
            setPrimaryURL(url);
            return;
          }
        } catch {}

        setPrimaryURL(null);
      },
      () => {
        setProfile(null);
        setPrimaryURL(null);
      }
    );

    const expCol = collection(db, "users", target, "profile", "main", "experience");
    const qExp = query(expCol, orderBy("createdAt", "desc"));
    const unsubExp = onSnapshot(
      qExp,
      (snap) => {
        const rows: Experience[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          rows.push({
            id: d.id,
            title: data.title || "",
            company: data.company,
            start: data.start,
            end: data.end,
            description: data.description,
          });
        });
        setExperience(rows);
      },
      () => setExperience([])
    );

    return () => {
      unsubProfile();
      unsubExp();
    };
  }, [target]);

  // primary reel live fallback
  useEffect(() => {
    if (!target) return;
    const db = getFirestore();
    const profRef = doc(db, "users", target, "profile", "main");
    let unsubReel: null | (() => void) = null;

    const unsubProf = onSnapshot(
      profRef,
      (snap) => {
        const d = snap.data() as any | undefined;
        const primaryReelId = d?.primaryReelId ?? null;

        if (unsubReel) { unsubReel(); unsubReel = null; }

        if (primaryReelId) {
          const reelRef = doc(db, "users", target, "reels", primaryReelId);
          unsubReel = onSnapshot(
            reelRef,
            (rSnap) => {
              const rd = rSnap.data() as any | undefined;
              const url =
                rd?.processedDownloadURL || rd?.downloadURL || rd?.rawDownloadURL || null;
              setPrimaryURL(url);
            },
            () => setPrimaryURL(null)
          );
        } else {
          const qPrimary = query(
            collection(db, "users", target, "reels"),
            where("isPrimary", "==", true),
            limit(1)
          );
          unsubReel = onSnapshot(
            qPrimary,
            (qSnap) => {
              if (!qSnap.empty) {
                const data = qSnap.docs[0].data() as any;
                const url =
                  data.processedDownloadURL || data.downloadURL || data.rawDownloadURL || null;
                setPrimaryURL(url);
              } else {
                setPrimaryURL(null);
              }
            },
            () => setPrimaryURL(null)
          );
        }
      },
      () => setPrimaryURL(null)
    );

    return () => {
      unsubProf();
      if (unsubReel) unsubReel();
    };
  }, [target]);

  // video overlay play/pause
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [primaryURL]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  // ===== NETWORKING WATCHERS =====
  useEffect(() => {
    if (!me || !userId || me === userId) {
      setConnState("none");
      setPendingId(null);
      return;
    }
    const db = getFirestore();
    const pid = pairId(me, userId);

    const unsubConn = onSnapshot(doc(db, "connections", pid), (snap) => {
      if (snap.exists()) {
        setConnState("connected");
        setPendingId(null);
      } else {
        setConnState((s) => (s === "connected" ? "none" : s));
      }
    });

    const qSent = query(
      collection(db, "network_requests"),
      where("fromUid", "==", me),
      where("toUid", "==", userId),
      where("status", "==", "pending"),
      limit(1)
    );
    const unsubSent = onSnapshot(qSent, (snap) => {
      if (!snap.empty) {
        setConnState((prev) => (prev === "connected" ? "connected" : "sent"));
        setPendingId(snap.docs[0].id);
      } else {
        if (connState !== "connected") {
          setConnState((prev) => (prev === "sent" ? "none" : prev));
        }
      }
    });

    const qRecv = query(
      collection(db, "network_requests"),
      where("fromUid", "==", userId),
      where("toUid", "==", me),
      where("status", "==", "pending"),
      limit(1)
    );
    const unsubRecv = onSnapshot(qRecv, (snap) => {
      if (!snap.empty) {
        setConnState((prev) => (prev === "connected" ? "connected" : "received"));
        setPendingId(snap.docs[0].id);
      } else {
        if (connState !== "connected") {
          setConnState((prev) => (prev === "received" ? "none" : prev));
        }
      }
    });

    return () => {
      unsubConn();
      unsubSent();
      unsubRecv();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, userId]);

  // ===== ACTIONS =====
  const sendConnect = async () => {
    if (!me || !userId) return;
    try {
      const db = getFirestore();
      await addDoc(collection(db, "network_requests"), {
        fromUid: me,
        toUid: userId,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Request sent" });
    } catch (e: any) {
      toast({ title: "Failed to send", description: e?.message, variant: "destructive" });
    }
  };

  const cancelConnect = async () => {
    if (!pendingId) return;
    try {
      const db = getFirestore();
      await updateDoc(doc(db, "network_requests", pendingId), {
        status: "canceled",
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Request canceled" });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    }
  };

  const declineConnect = async () => {
    if (!pendingId) return;
    try {
      const db = getFirestore();
      await updateDoc(doc(db, "network_requests", pendingId), {
        status: "declined",
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Request declined" });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    }
  };

  // accept (όπως ήταν)
  const acceptConnect = async () => {
    if (!pendingId || !me || !userId) return;
    try {
      const db = getFirestore();
      await updateDoc(doc(db, "network_requests", pendingId), {
        status: "accepted",
        updatedAt: serverTimestamp(),
      });
      const cid = pairId(me, userId);
      await setDoc(
        doc(db, "connections", cid),
        {
          members: [me, userId],
          status: "accepted",
          acceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast({ title: "Connected" });
    } catch (e: any) {
      toast({ title: "Failed to accept", description: e?.message, variant: "destructive" });
    }
  };

  // ✅ Server-side ανοίγμα/δημιουργία thread + navigate
  const onMessageClick = async () => {
    if (!me || !userId) return;
    try {
      const fn = httpsCallable<{ otherUid: string }, { threadId: string; canDM: boolean }>(
        getFunctions(undefined, "europe-west1"),
        "openOrCreateThread"
      );
      await fn({ otherUid: userId });
      navigate(`/dashboard/messages?with=${userId}`);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to open chat", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] h-[72vh] rounded-2xl bg-neutral-900/80 p-6 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-8 items-center">
        {/* LEFT: Reel */}
        <div className="w-full">
          <div className="rounded-2xl bg-neutral-800/60 p-4">
            <div className="relative w-full max-w-[380px] mx-auto">
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-black shadow">
                {primaryURL ? (
                  <>
                    <video
                      ref={videoRef}
                      src={primaryURL}
                      controls
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute left-3 top-3 z-10">
                      <span className="rounded-full bg-red-500 text-white text-xs font-semibold px-3 py-1 shadow">
                        REEL
                      </span>
                    </div>
                    {!isPlaying && (
                      <button
                        onClick={togglePlay}
                        className="absolute inset-0 z-10 grid place-items-center"
                        aria-label="Play"
                      >
                        <span className="h-16 w-16 rounded-full bg-white/95 shadow flex items-center justify-center">
                          <span
                            className="ml-[2px] block"
                            style={{
                              width: 0,
                              height: 0,
                              borderLeft: "16px solid black",
                              borderTop: "10px solid transparent",
                              borderBottom: "10px solid transparent",
                            }}
                          />
                        </span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-sm text-white/80">
                    No primary reel selected yet.
                  </div>
                )}
              </div>

              <p className="text-xs text-neutral-400 mt-2 text-center">
                This is the video people see first on your profile.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Profile & CV */}
        <div className="w-full">
          <Card className="h-full shadow-soft bg-neutral-900 text-neutral-100 border-neutral-800">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle>Profile & CV</CardTitle>

              {me && userId && me !== userId && (
                <div className="flex items-center gap-2">
                  {connState === "connected" && (
                    <Button size="sm" onClick={onMessageClick}>
                      Message
                    </Button>
                  )}

                  {connState === "none" && (
                    <Button size="sm" variant="secondary" onClick={sendConnect}>
                      Connect
                    </Button>
                  )}

                  {connState === "sent" && (
                    <>
                      <span className="text-xs text-neutral-400">Pending…</span>
                      <Button size="sm" variant="outline" onClick={cancelConnect}>
                        Cancel
                      </Button>
                    </>
                  )}

                  {connState === "received" && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={acceptConnect}>Accept</Button>
                      <Button size="sm" variant="destructive" onClick={declineConnect}>
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="max-h-[60vh] overflow-y-auto pr-2 space-y-6 thin-scrollbar">
              {/* About */}
              <section>
                <h4 className="font-semibold mb-2">About</h4>
                {profile ? (
                  <div className="space-y-2">
                    {profile.fullName && (
                      <div className="text-sm">
                        <span className="font-medium">Name: </span>
                        {profile.fullName}
                      </div>
                    )}
                    {profile.jobTitle && (
                      <div className="text-sm">
                        <span className="font-medium">Headline: </span>
                        {profile.jobTitle}
                      </div>
                    )}
                    {profile.location && (
                      <div className="text-sm">
                        <span className="font-medium">Location: </span>
                        {profile.location}
                      </div>
                    )}
                    {Array.isArray(profile.skills) && profile.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {profile.skills.map((s: string, i: number) => (
                          <Badge key={i} variant="secondary">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-400">No profile details yet.</div>
                )}
              </section>

              {/* Bio */}
              {profile?.bio && (
                <>
                  <Separator className="bg-neutral-800" />
                  <section>
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p className="text-sm leading-relaxed text-neutral-200 whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </section>
                </>
              )}

              {/* Social Links */}
              {(() => {
                const ln = normalizeUrl(profile?.socials?.linkedin);
                const gh = normalizeUrl(profile?.socials?.github);
                const site = normalizeUrl(profile?.socials?.website || profile?.socials?.site);
                const hasAny = ln || gh || site;
                if (!hasAny) return null;
                return (
                  <>
                    <Separator className="bg-neutral-800" />
                    <section>
                      <h4 className="font-semibold mb-2">Social</h4>
                      <div className="flex flex-wrap gap-2">
                        {ln && (
                          <a
                            href={ln}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1 text-sm"
                          >
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                          </a>
                        )}
                        {gh && (
                          <a
                            href={gh}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1 text-sm"
                          >
                            <Github className="w-4 h-4" />
                            GitHub
                          </a>
                        )}
                        {site && (
                          <a
                            href={site}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1 text-sm"
                          >
                            <Globe className="w-4 h-4" />
                            Website
                          </a>
                        )}
                      </div>
                    </section>
                  </>
                );
              })()}

              <Separator className="bg-neutral-800" />

              {/* Experience */}
              <section>
                <h4 className="font-semibold mb-2">Experience</h4>
                {experience.length === 0 ? (
                  <div className="text-sm text-neutral-400">No experience added yet.</div>
                ) : (
                  <ul className="space-y-4">
                    {(showAllExp ? experience : experience.slice(0, 2)).map((exp) => (
                      <li key={exp.id} className="rounded-lg border border-neutral-800 p-3">
                        <div className="text-sm font-semibold">{exp.title}</div>
                        <div className="text-xs text-neutral-400">
                          {exp.company ? `${exp.company} · ` : ""}
                          {[exp.start, exp.end].filter(Boolean).join(" – ")}
                        </div>
                        {exp.description && (
                          <p className="text-sm mt-2 whitespace-pre-wrap text-neutral-200">
                            {exp.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {experience.length > 2 && (
                  <button
                    onClick={() => setShowAllExp((v) => !v)}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    {showAllExp ? "Show less" : `Show all (${experience.length})`}
                  </button>
                )}
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
