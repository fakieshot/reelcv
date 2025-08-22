// src/pages/dashboard/components/ProfilePreview.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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


/** Κανονικοποίηση URL (βάζει https:// αν λείπει, και απορρίπτει invalid) */
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


export default function ProfilePreview() {
  const [primaryURL, setPrimaryURL] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [experience, setExperience] = useState<Experience[]>([]);
  const uid = useMemo(() => auth.currentUser?.uid ?? null, []);

  // refs & state για το κεντρικό play overlay
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAllExp, setShowAllExp] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const db = getFirestore();

    // ---- Live profile: users/{uid}/profile/main  ----
    const profileRef = doc(db, "users", uid, "profile", "main");
    const unsubProfile = onSnapshot(
      profileRef,
      async (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setProfile(data);

        // 1) Αν υπάρχει primaryReelId
        const primaryId = (data as any)?.primaryReelId as string | undefined;
        if (primaryId) {
          try {
            const primaryDoc = await getDoc(doc(db, "users", uid, "reels", primaryId));
            if (primaryDoc.exists()) {
              const r = primaryDoc.data() as any;
              const url =
                r.processedDownloadURL || r.downloadURL || r.rawDownloadURL || null;
              setPrimaryURL(url);
              return;
            }
          } catch {/* ignore */}
        }

        // 2) fallback: isPrimary == true
        try {
          const reelsCol = collection(db, "users", uid, "reels");
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

        // 3) fallback: πιο πρόσφατο
        try {
          const reelsCol = collection(db, "users", uid, "reels");
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

    // ---- Experience: users/{uid}/profile/main/experience  ----
    const expCol = collection(db, "users", uid, "profile", "main", "experience");
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
  }, [uid]);



useEffect(() => {
  if (!uid) return;
  const db = getFirestore();

  // Ακούμε το profile/main για να πάρουμε το primaryReelId
  const profRef = doc(db, "users", uid, "profile", "main");
  let unsubReel: null | (() => void) = null;

  const unsubProf = onSnapshot(
    profRef,
    (snap) => {
      const d = snap.data() as any | undefined;
      const primaryReelId = d?.primaryReelId ?? null;

      if (unsubReel) { unsubReel(); unsubReel = null; }

      if (primaryReelId) {
        // Ζωντανά το ΣΥΓΚΕΚΡΙΜΕΝΟ reel doc
        const reelRef = doc(db, "users", uid, "reels", primaryReelId);
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
        // Fallback για παλιά δεδομένα: isPrimary == true
        const qPrimary = query(
          collection(db, "users", uid, "reels"),
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
}, [uid]);




  // χειριστές για overlay play
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

  return (
    // σκούρο φόντο στο modal για να “δένει” με το theme
    <div className="mx-auto max-w-[1100px] h-[72vh] rounded-2xl bg-neutral-900/80 p-6 overflow-hidden">
      {/* Grid δύο στηλών: αριστερά πορτραίτο reel, δεξιά πληροφορίες */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-8 items-center">
        {/* LEFT: Reel – πορτραίτο, badge REEL, play overlay, native controls */}
        <div className="w-full">
          <div className="rounded-2xl bg-neutral-800/60 p-4">
            <div className="relative w-full max-w-[380px] mx-auto">
              {/* πορτραίτο όπως στο mock */}
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
                    {/* badge top-left */}
                    <div className="absolute left-3 top-3 z-10">
                      <span className="rounded-full bg-red-500 text-white text-xs font-semibold px-3 py-1 shadow">
                        REEL
                      </span>
                    </div>
                    {/* big play center */}
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

        {/* RIGHT: Profile & CV – σκούρο πάνελ, κεντραρισμένο κάθετα */}
        <div className="w-full">
          <Card className="h-full shadow-soft bg-neutral-900 text-neutral-100 border-neutral-800">
            <CardHeader className="pb-4">
              <CardTitle>Profile & CV</CardTitle>
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


  {/* Summary / Professional Bio */}
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
