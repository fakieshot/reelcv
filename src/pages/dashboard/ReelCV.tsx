// src/pages/dashboard/ReelCV.tsx
import { useMemo, useRef, useState, useEffect } from "react";
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
  Plus,
  X,
  Linkedin,
  Github,
  Globe as GlobeIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserReels, type ReelDoc, type Visibility } from "@/hooks/useUserReels";
import { createPortal } from "react-dom";

// ⬇️ KEEP: we’ll show this inside a modal
import ProfilePreview from "@/pages/dashboard/components/ProfilePreview";

// ⬇️ NEW: dialog components for the preview modal
import { Dialog, DialogContent, DialogHeader, DialogTitle,DialogClose } from "@/components/ui/dialog";

// autosave deps (and load)
import { auth, firestore } from "@/lib/firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  // ⬇️ NEW imports used for Experience tab
  collection,
  query,
  onSnapshot,
  orderBy,
  deleteDoc,
// 
getFirestore,
where,
limit,


} from "firebase/firestore";

// ✅ hook για profile/socials
import { useUserProfile } from "@/hooks/useUserProfile";

// ⬇️ NEW: Add Experience modal component
import AddExperienceModal from "@/pages/dashboard/components/AddExperienceModal";

/* ---------------- helpers ---------------- */
const formatBytes = (n: number) => {
  if (!n && n !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
};
const formatDate = (ts?: any) => {
  try {
    const d = ts?.toDate ? ts.toDate() : ts;
    return d ? new Date(d).toLocaleDateString() : "";
  } catch {
    return "";
  }
};

/* ---------- small utils for autosave ---------- */
const deepEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const debounce = <T extends (...args: any[]) => void>(fn: T, ms = 800) => {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

/* ---------------- Fancy Confirm Modal (custom) ---------------- */
type ConfirmDeleteModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};
function ConfirmDeleteModal({
  open,
  title = "Delete reel?",
  message = "This action will permanently remove the video from your library and storage.",
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (typeof document === "undefined" || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-[92%] max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-red-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ---------------- Reel card ---------------- */
function ReelCard({
  reel,
  isPrimary,
  onSetPrimary,
  onVisibility,
  onCopy,
  onAskDelete,
}: {
  reel: ReelDoc;
  isPrimary?: boolean;
  onSetPrimary: (id: string) => void | Promise<void>;
  onVisibility: (id: string, v: Visibility) => void | Promise<void>;
  onCopy: (url: string) => void | Promise<void>;
  onAskDelete: (reel: ReelDoc) => void;
}) {
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
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${pill}`}>{visibility}</span>
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
        <div className="min-w-0">
          <div className="font-medium truncate">{reel.name}</div>
          <div className="text-xs text-muted-foreground">
            {formatBytes(reel.size)} • {formatDate(reel.createdAt)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isPrimary && (
            <Button size="sm" variant="secondary" onClick={() => onSetPrimary(reel.id)}>
              <Star className="h-4 w-4 mr-1" />
              Set primary
            </Button>
          )}

          {visibility !== "public" && (
            <Button size="sm" variant="outline" onClick={() => onVisibility(reel.id, "public")}>
              <Globe className="h-4 w-4 mr-1" />
              Make public
            </Button>
          )}
          {visibility !== "unlisted" && (
            <Button size="sm" variant="outline" onClick={() => onVisibility(reel.id, "unlisted")}>
              <Link2 className="h-4 w-4 mr-1" />
              Unlisted
            </Button>
          )}
          {visibility !== "private" && (
            <Button size="sm" variant="outline" onClick={() => onVisibility(reel.id, "private")}>
              <Lock className="h-4 w-4 mr-1" />
              Private
            </Button>
          )}

          <Button size="sm" variant="outline" onClick={() => onCopy(reel.downloadURL)}>
            <Link2 className="h-4 w-4 mr-1" />
            Copy link
          </Button>

          <Button size="sm" variant="destructive" className="ml-auto" onClick={() => onAskDelete(reel)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Page ---------------- */
type ProfileForm = {
  fullName: string;
  jobTitle: string;
  bio: string;
  location: string;
  skills: string[];
};

type Experience = {
  id: string;
  title: string;
  company?: string;
  start?: string;
  end?: string;
  description?: string;
};

export default function ReelCV() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] =
    useState<"profile" | "video" | "experience" | "social">("video");

  // ----- Reel library hook -----
  const { reels, loading, updateVisibility, setPrimary, remove } = useUserReels();
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  // ✅ Profile hook για αποθήκευση socials
  const { profile, save: saveProfileDoc, saving: savingDoc } = useUserProfile();
  const [socialsForm, setSocialsForm] = useState<any>({ ...(profile?.socials ?? {}) });

  useEffect(() => {
    setSocialsForm({ ...(profile?.socials ?? {}) });
  }, [profile]);

  const socialsDirty = useMemo(
    () => !deepEqual(socialsForm, profile?.socials ?? {}),
    [socialsForm, profile]
  );

  // ----- Delete modal state -----
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [targetReel, setTargetReel] = useState<ReelDoc | null>(null);
  const askDelete = (reel: ReelDoc) => {
    setTargetReel(reel);
    setDeleteOpen(true);
  };
  const closeDelete = () => {
    setDeleteOpen(false);
    setTargetReel(null);
  };
  const confirmDelete = async () => {
    if (!targetReel) return;
    try {
      await remove(targetReel);
      toast({ title: "Deleted", description: "Reel has been removed." });
    } catch (e: any) {
      toast({
        title: "Failed to delete",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      closeDelete();
    }
  };

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
      if (!reel) throw new Error("Reel not found");
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

  const onChangeVisibility = async (id: string, v: Visibility) => {
    try {
      await updateVisibility(id, v);
      toast({ title: "Visibility updated", description: `Reel is now ${v}.` });
    } catch (e: any) {
      toast({
        title: "Failed to update",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  /* ================== Profile autosave + load ================== */
  const [form, setForm] = useState<ProfileForm>({
    fullName: "John Doe",
    jobTitle: "Senior Frontend Developer",
    bio: "Passionate frontend developer...",
    location: "San Francisco, CA",
    skills: ["React", "TypeScript", "Node.js"],
  });
  const [baseline, setBaseline] = useState<ProfileForm>(form);
  const [saving, setSaving] = useState(false);
  const lastSavedAtRef = useRef<number | null>(null);
  const [newSkill, setNewSkill] = useState("");

  const dirty = useMemo(() => !deepEqual(form, baseline), [form, baseline]);


// Live primary reel listener -> κρατά πάντα συγχρονισμένο το primaryId
// 🔴 Single source of truth: ακούμε το primaryReelId από το profile/main
useEffect(() => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    setPrimaryId(null);
    return;
  }
  const db = getFirestore();
  const profRef = doc(db, "users", uid, "profile", "main");

  const unsub = onSnapshot(
    profRef,
    (snap) => {
      const d = snap.data() as any | undefined;
      setPrimaryId(d?.primaryReelId ?? null);
    },
    () => setPrimaryId(null)
  );

  return () => unsub();
}, [auth.currentUser?.uid]);






  // Load profile on mount / when uid changes
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, "users", uid, "profile", "main"));
        if (snap.exists()) {
          const d = snap.data() as any;
          const loaded: ProfileForm = {
            fullName: d.fullName ?? "",
            jobTitle: d.jobTitle ?? "",
            bio: d.bio ?? "",
            location: d.location ?? "",
            skills: Array.isArray(d.skills) ? (d.skills as string[]) : [],
          };
          setForm(loaded);
          setBaseline(loaded);
          lastSavedAtRef.current = d.updatedAt?.toDate
            ? d.updatedAt.toDate().getTime()
            : Date.now();
        }
      } catch {
        // ignore load errors for now
      }
    })();
  }, [auth.currentUser?.uid]);

  const saveProfile = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Not signed in",
        description: "Please sign in and try again.",
        variant: "destructive",
      });
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

  // debounced autosave
  const debouncedAutosave = useRef(
    debounce(() => {
      if (dirty && !saving) void saveProfile();
    }, 800)
  ).current;

  useEffect(() => {
    debouncedAutosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const savedLabel =
    lastSavedAtRef.current && !dirty
      ? `Saved at ${new Date(lastSavedAtRef.current).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "";

  // skills handlers
  const addSkill = () => {
    const s = newSkill.trim();
    if (!s) return;
    if (!form.skills.includes(s)) {
      setForm((p) => ({ ...p, skills: [...p.skills, s] }));
    }
    setNewSkill("");
  };
  const removeSkill = (toRemove: string) => {
    setForm((p) => ({ ...p, skills: p.skills.filter((x) => x !== toRemove) }));
  };

  /* ---------------- Save button behavior per tab ---------------- */
  const isSaveDisabled =
    activeTab === "social" ? !socialsDirty || !!savingDoc : !dirty || saving;

  const saveButtonLabel =
    activeTab === "social" ? (savingDoc ? "Saving…" : "Save Changes") : (saving ? "Saving…" : "Save Changes");

  const handleSaveClick = async () => {
    if (activeTab === "social") {
      try {
        await saveProfileDoc({ socials: socialsForm });
        toast({ title: "Saved", description: "Social links updated." });
      } catch (err: any) {
        toast({
          title: "Save failed",
          description: err?.message ?? "Please try again.",
          variant: "destructive",
        });
      }
      return;
    }
    // default: profile tab save
    await saveProfile();
  };

  /* -------- NEW: preview modal state -------- */
  const [previewOpen, setPreviewOpen] = useState(false);

  /* -------- NEW: Experience state (live) -------- */
  const [expOpen, setExpOpen] = useState(false);
  const [experiences, setExperiences] = useState<Experience[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const colRef = collection(firestore, "users", uid, "profile", "main", "experience");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Experience[] = snap.docs.map((d) => {
          const x = d.data() as any;
          return {
            id: d.id,
            title: x.title || "",
            company: x.company || "",
            start: x.start || "",
            end: x.end || "",
            description: x.description || "",
          };
        });
        setExperiences(rows);
      },
      () => setExperiences([])
    );
    return () => unsub();
  }, [auth.currentUser?.uid]);

  const deleteExperience = async (id: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await deleteDoc(doc(firestore, "users", uid, "profile", "main", "experience", id));
      toast({ title: "Removed", description: "Experience deleted." });
    } catch (e: any) {
      toast({
        title: "Failed to delete",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  /* =================================================================== */

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
  {savedLabel && <span className="text-xs text-muted-foreground">{savedLabel}</span>}
  <Button
    onClick={() => setPreviewOpen(true)}
    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
  >
    <Eye className="w-4 h-4 mr-2" />
    Preview
  </Button>
  <Button onClick={handleSaveClick} disabled={isSaveDisabled} className="gradient-primary">
    <Save className="w-4 h-4 mr-2" />
    {saveButtonLabel}
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

        {/* Profile (editable, autosave) */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell employers about yourself and what you're looking for</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={form.jobTitle}
                    onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                />
              </div>

              <div>
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm"
                    >
                      {skill}
                      <button
                        className="ml-2 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSkill(skill)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSkill()}
                  />
                  <Button variant="outline" onClick={addSkill}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VIDEO CV => Reel Library */}
        <TabsContent value="video" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white/70">Your Reels</h3>
              <p className="text-sm text-muted-foreground">
                Upload or record short reels and manage visibility & primary reel.
              </p>
            </div>
           <div className="flex gap-2">
  <Link to="/dashboard/upload">
    <Button className="bg-primary/90 text-primary-foreground hover:bg-primary">
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
                      <Video className="h-4 w-4 mr-2" />
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
                 isPrimary={(reel as any).isPrimary || primaryId === reel.id}
                  onSetPrimary={onSetPrimary}
                  onVisibility={onChangeVisibility}
                  onCopy={onCopy}
                  onAskDelete={askDelete}
                />
              ))}
            </div>
          )}

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Video CV Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Keep it under 90 seconds.</li>
                <li>• Clear intro, skills, and a quick example.</li>
                <li>• Make your best reel the Primary one.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience */}
        <TabsContent value="experience" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Work Experience</CardTitle>
                <CardDescription>Add your professional experience and achievements</CardDescription>
              </div>
              <Button onClick={() => setExpOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Experience
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {experiences.length === 0 ? (
                <div className="text-sm text-muted-foreground">No experience added yet.</div>
              ) : (
                <div className="space-y-4">
                  {experiences.map((exp) => (
                    <div key={exp.id} className="rounded-xl border bg-black/5 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{exp.title}</h3>
                          {exp.company && <p className="text-primary">{exp.company}</p>}
                          <p className="text-sm text-muted-foreground">
                            {[exp.start, exp.end].filter(Boolean).join(" - ")}
                          </p>
                          {exp.description && (
                            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                              {exp.description}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteExperience(exp.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Links */}
        <TabsContent value="social" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Social & Professional Links</CardTitle>
              <CardDescription>Add links to your professional profiles and portfolio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {/* LinkedIn */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Linkedin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <Label>LinkedIn Profile</Label>
                    <Input
                      value={socialsForm.linkedin ?? ""}
                      onChange={(e) =>
                        setSocialsForm((s: any) => ({ ...s, linkedin: e.target.value }))
                      }
                      placeholder="https://linkedin.com/in/johndoe"
                    />
                  </div>
                </div>

                {/* GitHub */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                    <Github className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <Label>GitHub Profile</Label>
                    <Input
                      value={socialsForm.github ?? ""}
                      onChange={(e) =>
                        setSocialsForm((s: any) => ({ ...s, github: e.target.value }))
                      }
                      placeholder="https://github.com/username"
                    />
                  </div>
                </div>

                {/* Portfolio / Website */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                    <GlobeIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <Label>Portfolio Website</Label>
                    <Input
                      value={socialsForm.website ?? ""}
                      onChange={(e) =>
                        setSocialsForm((s: any) => ({ ...s, website: e.target.value }))
                      }
                      placeholder="https://johndoe.dev"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Custom delete modal */}
      <ConfirmDeleteModal open={deleteOpen} onConfirm={confirmDelete} onCancel={closeDelete} />

{/* Preview modal */}
<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
  <DialogContent className="max-w-6xl p-0 bg-transparent border-none shadow-none">
    {/* A11y τίτλος (κρυφός) για να φύγουν τα warnings */}
    <DialogHeader className="sr-only">
      <DialogTitle>Profile Preview</DialogTitle>
    </DialogHeader>

    <div className="relative">
      {/* Close X μέσα στο panel, πάνω δεξιά */}
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

      {/* Σκούρο panel γύρω από το περιεχόμενο του preview */}
      <div className="rounded-2xl bg-neutral-900/85 ring-1 ring-white/10 p-6 shadow-2xl">
        <ProfilePreview />
      </div>
    </div>
  </DialogContent>
</Dialog>


      {/* ⬇️ NEW: Add Experience modal */}
      <AddExperienceModal open={expOpen} onOpenChange={setExpOpen} />
    </div>
  );
}
