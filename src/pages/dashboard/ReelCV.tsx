import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  Save,
  Globe,
  Lock,
  Link2,
  Star,
  Trash2,
  Upload as UploadIcon,
  Video,
  Wand2,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserReels, ReelDoc } from "@/hooks/useUserReels";
import { auth, firestore } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/* ---------- tiny helpers ---------- */
function formatBytes(n: number) {
  if (!n && n !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}
function formatDate(ts?: any) {
  try {
    const d = ts?.toDate ? ts.toDate() : ts;
    return d ? new Date(d).toLocaleDateString() : "";
  } catch {
    return "";
  }
}
const deepEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const debounce = <T extends (...args: any[]) => void>(fn: T, ms = 800) => {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

/* ---------- Profile form shape ---------- */
type ProfileData = {
  fullName: string;
  jobTitle: string;
  bio: string;
  location: string;
  skills: string[];
  social: { linkedin?: string; github?: string; website?: string };
};

const initialProfile: ProfileData = {
  fullName: "John Doe",
  jobTitle: "Senior Frontend Developer",
  bio:
    "Passionate frontend developer with 5+ years of experience building modern web applications. I love creating intuitive user experiences and working with cutting-edge technologies.",
  location: "San Francisco, CA",
  skills: ["React", "TypeScript", "Node.js"],
  social: { linkedin: "", github: "", website: "" },
};

/* ---------- Reel card ---------- */
type ReelCardProps = {
  reel: ReelDoc;
  isPrimary?: boolean;
  onSetPrimary: (id: string) => Promise<void> | void;
  onVisibility: (id: string, v: "private" | "unlisted" | "public") => Promise<void> | void;
  onCopy: (url: string) => void;
  onDelete: (reel: ReelDoc) => Promise<void> | void;
};

function ReelCard({
  reel,
  isPrimary,
  onSetPrimary,
  onVisibility,
  onCopy,
  onDelete,
}: ReelCardProps) {
  const visibility = reel.visibility ?? "private";
  const pill =
    visibility === "public"
      ? "bg-emerald-100 text-emerald-700"
      : visibility === "unlisted"
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-100 text-gray-700";

  return (
    <Card className="shadow-soft overflow-hidden">
      <div className="relative aspect-[4/3] bg-black">
        <video
          src={reel.downloadURL}
          className="w-full h-full object-cover"
          controls
          preload="metadata"
          playsInline
        />
        <div className="absolute left-3 top-3">
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${pill}`}>
            {visibility}
          </span>
        </div>
        {isPrimary && (
          <div className="absolute right-3 top-3">
            <span className="rounded-full bg-yellow-400/90 text-black text-xs font-semibold px-2 py-1 flex items-center gap-1">
              <Star className="h-3 w-3" /> Primary
            </span>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium truncate">{reel.name}</div>
            <div className="text-xs text-muted-foreground">
              {formatBytes(reel.size)} • {formatDate(reel.createdAt)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isPrimary && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSetPrimary(reel.id)}
            >
              <Star className="h-4 w-4 mr-1" />
              Set primary
            </Button>
          )}

          {visibility !== "public" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onVisibility(reel.id, "public")}
            >
              <Globe className="h-4 w-4 mr-1" />
              Make public
            </Button>
          )}
          {visibility !== "unlisted" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onVisibility(reel.id, "unlisted")}
            >
              <Link2 className="h-4 w-4 mr-1" />
              Unlisted
            </Button>
          )}
          {visibility !== "private" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onVisibility(reel.id, "private")}
            >
              <Lock className="h-4 w-4 mr-1" />
              Private
            </Button>
          )}

          <Button size="sm" variant="outline" onClick={() => onCopy(reel.downloadURL)}>
            <Link2 className="h-4 w-4 mr-1" />
            Copy link
          </Button>

          <Button
            size="sm"
            variant="destructive"
            className="ml-auto"
            onClick={() => onDelete(reel)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Page ---------- */
export default function ReelCV() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"profile" | "video" | "experience" | "social">(
    "video"
  );

  // ----- Profile state (με save state όπως πριν)
  const [form, setForm] = useState<ProfileData>(initialProfile);
  const [baseline, setBaseline] = useState<ProfileData>(initialProfile);
  const [saving, setSaving] = useState(false);
  const lastSavedAtRef = useRef<number | null>(null);
  const dirty = useMemo(() => !deepEqual(form, baseline), [form, baseline]);

  const onChangeField =
    (key: keyof ProfileData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  // φορτωσε προφίλ + primaryReelId
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;
      const ref = doc(firestore, "users", uid, "profile", "main");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as any;
        const profile: ProfileData = {
          fullName: data.fullName ?? initialProfile.fullName,
          jobTitle: data.jobTitle ?? initialProfile.jobTitle,
          bio: data.bio ?? initialProfile.bio,
          location: data.location ?? initialProfile.location,
          skills: Array.isArray(data.skills) ? data.skills : initialProfile.skills,
          social: data.social ?? initialProfile.social,
        };
        setForm(profile);
        setBaseline(profile);
        setPrimaryId(data.primaryReelId ?? null);
      } else {
        // no doc yet — κρατά το default
      }
    })();
  }, []);

  const saveProfile = async () => {
    if (!auth.currentUser) {
      toast({ title: "Not signed in", description: "Please sign in and try again.", variant: "destructive" });
      return;
    }
    if (!dirty) return;
    if (!form.fullName.trim() || !form.jobTitle.trim()) {
      toast({
        title: "Missing fields",
        description: "Full name and job title are required.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const uid = auth.currentUser.uid;
      await setDoc(
        doc(firestore, "users", uid, "profile", "main"),
        {
          fullName: form.fullName,
          jobTitle: form.jobTitle,
          bio: form.bio,
          location: form.location,
          skills: form.skills,
          social: form.social ?? {},
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setBaseline(form);
      lastSavedAtRef.current = Date.now();
      toast({ title: "Saved", description: "Your changes have been saved." });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // autosave (όπως πριν)
  const debouncedAutosave = useRef(
    debounce(() => {
      if (dirty && !saving) void saveProfile();
    }, 800)
  ).current;

  useEffect(() => {
    debouncedAutosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // ----- Reels (library)
  const { reels, loading, updateVisibility, setPrimary, remove } = useUserReels();
  const setVisibility = updateVisibility;

  const onCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Copied", description: "Link copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const onSetPrimary = async (id: string) => {
    try {
      const reel = reels.find((r) => r.id === id);
      if (!reel) {
        toast({ title: "Not found", description: "Reel not found.", variant: "destructive" });
        return;
      }
      await setPrimary(reel);
      setPrimaryId(id);
      toast({ title: "Primary set", description: "This reel is now your primary reel." });
    } catch (e: any) {
      toast({
        title: "Failed to set primary",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const onChangeVisibility = async (
    id: string,
    v: "private" | "unlisted" | "public"
  ) => {
    try {
      await setVisibility(id, v);
      toast({ title: "Visibility updated", description: `Reel is now ${v}.` });
    } catch (e: any) {
      toast({
        title: "Failed to update",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const onDelete = async (reel: ReelDoc) => {
    if (!confirm(`Delete "${reel.name}"? This cannot be undone.`)) return;
    try {
      await remove(reel);
      // το onSnapshot θα ενημερώσει αυτόματα τη λίστα
      if (primaryId === reel.id) setPrimaryId(null);
      toast({ title: "Deleted", description: "Reel has been removed." });
    } catch (e: any) {
      toast({
        title: "Failed to delete",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My ReelCV</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your video CV profile
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastSavedAtRef.current && !dirty && (
            <span className="text-xs text-muted-foreground">Saved just now</span>
          )}
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={saveProfile}
            disabled={!dirty || saving}
            className="gradient-primary"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="video">Video CV</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="social">Social Links</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Tell employers about yourself and what you're looking for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={form.fullName} onChange={onChangeField("fullName")} />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input id="jobTitle" value={form.jobTitle} onChange={onChangeField("jobTitle")} />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={form.bio}
                  onChange={onChangeField("bio")}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={form.location} onChange={onChangeField("location")} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VIDEO CV => Reel Library */}
        <TabsContent value="video" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Your Reels</h2>
              <p className="text-sm text-muted-foreground">
                Upload or record short reels and manage visibility & primary reel.
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/dashboard/upload">
                <Button variant="outline">
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Upload new
                </Button>
              </Link>
              <Link to="/dashboard/upload?tab=record">
                <Button>
                  <Video className="h-4 w-4 mr-2" />
                  Record new
                </Button>
              </Link>
            </div>
          </div>

          {loading ? (
            <Card className="shadow-soft">
              <CardContent className="p-8 text-center text-muted-foreground">
                Loading your reels…
              </CardContent>
            </Card>
          ) : reels.length === 0 ? (
            <Card className="shadow-soft">
              <CardContent className="p-10 text-center">
                <div className="mx-auto w-16 h-16 rounded-full gradient-primary text-white flex items-center justify-center mb-4">
                  <Wand2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium">No reels yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Start by uploading or recording your first ReelCV.
                </p>
                <div className="mt-4 flex gap-2 justify-center">
                  <Link to="/dashboard/upload">
                    <Button variant="outline">
                      <UploadIcon className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </Link>
                  <Link to="/dashboard/upload?tab=record">
                    <Button>
                      <Video className="h-4 h-4 mr-2 w-4" />
                      Record
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {reels.map((reel) => (
                <ReelCard
                  key={reel.id}
                  reel={reel}
                  isPrimary={primaryId === reel.id}
                  onSetPrimary={onSetPrimary}
                  onVisibility={onChangeVisibility}
                  onCopy={onCopy}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="experience">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Experience</CardTitle>
              <CardDescription>Add your professional experience</CardDescription>
            </CardHeader>
            <CardContent>…</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
            </CardHeader>
            <CardContent>…</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
