// src/pages/dashboard/components/ProfilePreview.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
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
import AddExperienceModal from "./AddExperienceModal";

type Experience = {
  id: string;
  title: string;
  company?: string;
  start?: string;
  end?: string;
  description?: string;
};

export default function ProfilePreview() {
  const [primaryURL, setPrimaryURL] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const uid = useMemo(() => auth.currentUser?.uid ?? null, []);

  useEffect(() => {
    if (!uid) return;
    const db = getFirestore();

    // ---- Profile doc: users/{uid}/profile/main  ----
    (async () => {
      try {
        const profileRef = doc(db, "users", uid, "profile", "main");
        const snap = await getDoc(profileRef);
        if (snap.exists()) setProfile(snap.data());
        else setProfile(null);
      } catch (err) {
        console.warn("profile load error:", err);
        setProfile(null);
      }
    })();

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
      (err) => {
        console.warn("experience listener error:", err);
        setExperience([]);
      }
    );

    // ---- Primary reel (live): users/{uid}/reels where isPrimary==true ----
    const reelsCol = collection(db, "users", uid, "reels");
    const qPrimary = query(reelsCol, where("isPrimary", "==", true), limit(1));
    const unsubPrimary = onSnapshot(
      qPrimary,
      (snap) => {
        if (!snap.empty) {
          const data = snap.docs[0].data() as any;
          const url =
            data.processedDownloadURL ||
            data.downloadURL ||
            data.rawDownloadURL ||
            null;
          setPrimaryURL(url);
        } else {
          // μην καθαρίσεις εδώ — άστο να το χειριστεί το fallback με primaryReelId
          setPrimaryURL((prev) => prev ?? null);
        }
      },
      (err) => {
        console.warn("primary reel listener error:", err?.message || err);
        setPrimaryURL((prev) => prev ?? null);
      }
    );

    return () => {
      unsubExp();
      unsubPrimary();
    };
  }, [uid]);

  // ⬇️ Fallback: αν δεν έρθει isPrimary, αλλά υπάρχει primaryReelId στο profile,
  // φέρε απευθείας το συγκεκριμένο reel.
  useEffect(() => {
    if (!uid) return;
    const id = profile?.primaryReelId as string | undefined;
    if (!id) return;

    let cancelled = false;
    (async () => {
      try {
        const db = getFirestore();
        const rref = doc(db, "users", uid, "reels", id);
        const rsnap = await getDoc(rref);
        if (!cancelled && rsnap.exists()) {
          const data = rsnap.data() as any;
          const url =
            data.processedDownloadURL ||
            data.downloadURL ||
            data.rawDownloadURL ||
            null;
          setPrimaryURL(url);
        }
      } catch (e) {
        if (!cancelled) setPrimaryURL((prev) => prev ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, profile?.primaryReelId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Primary video */}
      <div className="lg:col-span-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Primary Reel</CardTitle>
          </CardHeader>
          <CardContent>
            {primaryURL ? (
              <video
                src={primaryURL}
                controls
                playsInline
                preload="metadata"
                className="w-full aspect-video rounded-lg bg-black"
              />
            ) : (
              <div className="w-full aspect-video grid place-items-center rounded-lg border text-sm text-muted-foreground">
                No primary reel selected yet.
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              This is the video people see first on your profile.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right: CV */}
      <div className="lg:col-span-6">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Profile & CV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic profile info */}
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
                <div className="text-sm text-muted-foreground">No profile details yet.</div>
              )}
            </section>

            <Separator />

            {/* Experience */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Experience</h4>
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Experience
                </Button>
              </div>

              {experience.length === 0 ? (
                <div className="text-sm text-muted-foreground">No experience added yet.</div>
              ) : (
                <ul className="space-y-4">
                  {experience.map((exp) => (
                    <li key={exp.id} className="rounded-lg border p-3">
                      <div className="text-sm font-semibold">{exp.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {exp.company ? `${exp.company} · ` : ""}
                        {[exp.start, exp.end].filter(Boolean).join(" – ")}
                      </div>
                      {exp.description && (
                        <p className="text-sm mt-2 whitespace-pre-wrap">{exp.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </CardContent>
        </Card>
      </div>

      {/* Add experience modal */}
      <AddExperienceModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
