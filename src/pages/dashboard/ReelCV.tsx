// src/pages/dashboard/ReelCV.tsx
import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video,
  Mic,
  Plus,
  X,
  Save,
  Eye,
  Upload,
  Play,
  Linkedin,
  Github,
  Globe,
  Loader2,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function ReelCV() {
  const { toast } = useToast();

  // autosave on, 600ms
  const {
    profile,
    setProfile,
    save,
    loading,
    saving,
    error,
    isDirty,
    lastSavedAt,
  } = useUserProfile(true, 600);

  const [newSkill, setNewSkill] = useState("");

  const skills = useMemo(() => profile?.skills ?? [], [profile?.skills]);

  const addSkill = () => {
    const s = newSkill.trim();
    if (!s) return;
    if (skills.includes(s)) return;
    setProfile((p) => ({ ...(p || {}), skills: [...(p?.skills ?? []), s] }));
    setNewSkill("");
  };

  const removeSkill = (toRemove: string) => {
    setProfile((p) => ({
      ...(p || {}),
      skills: (p?.skills ?? []).filter((x) => x !== toRemove),
    }));
  };

  const onChange =
    (key: "fullName" | "title" | "bio" | "location") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.value;
      setProfile((p) => ({ ...(p || {}), [key]: val }));
    };

  const onChangeSocial =
    (key: "linkedin" | "github" | "site") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setProfile((p) => ({
        ...(p || {}),
        socials: { ...(p?.socials ?? {}), [key]: val },
      }));
    };

  const handleManualSave = async () => {
    try {
      await save();
      toast({ title: "Saved", description: "Your changes have been saved." });
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const savedLabel =
    lastSavedAt && !saving
      ? `Saved ${new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(lastSavedAt)}`
      : "";

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
          {loading && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </span>
          )}
          {!loading && savedLabel && (
            <span className="text-xs text-muted-foreground">{savedLabel}</span>
          )}

          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>

          <Button
            onClick={handleManualSave}
            disabled={!isDirty || loading || saving}
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

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
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
                  <Input
                    id="fullName"
                    value={profile?.fullName ?? ""}
                    onChange={onChange("fullName")}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={profile?.title ?? ""}
                    onChange={onChange("title")}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={profile?.bio ?? ""}
                  onChange={onChange("bio")}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profile?.location ?? ""}
                  onChange={onChange("location")}
                  disabled={loading}
                />
              </div>

              <div>
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="flex items-center space-x-1"
                    >
                      <span>{skill}</span>
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        disabled={loading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add a skill"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSkill()}
                    disabled={loading}
                  />
                  <Button onClick={addSkill} variant="outline" disabled={loading}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video CV Tab */}
        <TabsContent value="video" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Video className="w-5 h-5 text-primary" />
                  <span>Video CV</span>
                </CardTitle>
                <CardDescription>
                  Upload your main video CV (2-3 minutes recommended)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <div className="mx-auto w-16 h-16 gradient-primary rounded-full flex items-center justify-center mb-4">
                    <Video className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Current Video CV</h3>
                  <p className="text-muted-foreground mb-4">
                    john-doe-cv.mp4 • 2.3 MB • 2:15 duration
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button variant="outline" size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Replace
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mic className="w-5 h-5 text-accent" />
                  <span>Voice Introduction</span>
                </CardTitle>
                <CardDescription>
                  Add a voice introduction to personalize your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <div className="mx-auto w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    No Voice Introduction
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Add a 30-60 second voice introduction to make your profile more personal
                  </p>
                  <Button variant="outline">
                    <Mic className="w-4 h-4 mr-2" />
                    Record Introduction
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Video CV Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">📹 Recording Quality</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Use good lighting (face the light source)</li>
                    <li>• Ensure clear audio quality</li>
                    <li>• Keep the background clean and professional</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">💬 Content Guidelines</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Keep it between 1-3 minutes</li>
                    <li>• Introduce yourself and your passion</li>
                    <li>• Highlight key skills and experiences</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Work Experience</CardTitle>
                <CardDescription>
                  Add your professional experience and achievements
                </CardDescription>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Experience
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      Senior Frontend Developer
                    </h3>
                    <p className="text-primary">TechCorp Inc.</p>
                    <p className="text-sm text-muted-foreground">2021 - Present</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Led development of modern web applications using React and TypeScript.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Separator />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Links Tab */}
        <TabsContent value="social" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Social & Professional Links</CardTitle>
              <CardDescription>
                Add links to your professional profiles and portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Linkedin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <Label>LinkedIn Profile</Label>
                    <Input
                      placeholder="https://linkedin.com/in/johndoe"
                      value={profile?.socials?.linkedin ?? ""}
                      onChange={onChangeSocial("linkedin")}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                    <Github className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <Label>GitHub Profile</Label>
                    <Input
                      placeholder="https://github.com/johndoe"
                      value={profile?.socials?.github ?? ""}
                      onChange={onChangeSocial("github")}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <Label>Portfolio Website</Label>
                    <Input
                      placeholder="https://johndoe.dev"
                      value={profile?.socials?.site ?? ""}
                      onChange={onChangeSocial("site")}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
