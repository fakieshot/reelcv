// src/components/MyReelCV.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";

export default function MyReelCV() {
  const { toast } = useToast();
  const { profile, loading, saving, error, save } = useUserProfile();

  // local editing state
  const [form, setForm] = useState<UserProfile>({
    fullName: "",
    title: "",
    bio: "",
    location: "",
    skills: [],
    socials: {},
    visibility: "private",
  });

  // όταν έρθει από το firestore, γέμισε τη φόρμα
  useEffect(() => {
    if (profile) setForm({ ...form, ...profile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // helpers
  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addSkill = (s: string) => {
    if (!s.trim()) return;
    setForm((f) => ({ ...f, skills: Array.from(new Set([...(f.skills || []), s.trim()])) }));
  };
  const removeSkill = (s: string) =>
    setForm((f) => ({ ...f, skills: (f.skills || []).filter((x) => x !== s) }));

  const completion = useMemo(() => {
    let score = 0;
    if (form.fullName) score += 20;
    if (form.title) score += 20;
    if (form.bio) score += 20;
    if ((form.skills || []).length >= 3) score += 20;
    if (form.visibility === "public") score += 20;
    return score;
  }, [form]);

  const handleSave = async () => {
    try {
      await save(form);
      toast({ title: "Profile saved", description: "Your ReelCV profile has been updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Try again.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My ReelCV</h1>
        <div className="flex items-center gap-3">
          <Badge>{completion}% complete</Badge>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="video">Video CV</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Full Name</label>
                  <Input
                    value={form.fullName || ""}
                    onChange={(e) => update("fullName", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Job Title</label>
                  <Input
                    value={form.title || ""}
                    onChange={(e) => update("title", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Professional Bio</label>
                <Textarea
                  rows={5}
                  value={form.bio || ""}
                  onChange={(e) => update("bio", e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Location</label>
                  <Input
                    value={form.location || ""}
                    onChange={(e) => update("location", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Visibility</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.visibility || "private"}
                    onChange={(e) => update("visibility", e.target.value as "public" | "private")}
                    disabled={loading}
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="text-sm text-muted-foreground">Skills</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(form.skills || []).map((s) => (
                    <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => removeSkill(s)}>
                      {s} ×
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input id="new-skill" placeholder="Add a skill" className="max-w-xs" disabled={loading} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const el = document.getElementById("new-skill") as HTMLInputElement | null;
                      if (el) {
                        addSkill(el.value);
                        el.value = "";
                      }
                    }}
                    disabled={loading}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VIDEO TAB (placeholder: σύνδεση με reels σε επόμενο βήμα) */}
        <TabsContent value="video">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Video CV</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage your uploaded reels. (Θα συνδέσουμε με το Upload/Storage στο επόμενο βήμα.)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPERIENCE TAB (placeholder) */}
        <TabsContent value="experience">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Add your work experience / education (coming soon).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
