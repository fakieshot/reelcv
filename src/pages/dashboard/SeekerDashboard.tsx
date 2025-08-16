import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Video,
  Briefcase,
  MessageCircle,
  TrendingUp,
  Eye,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { Link } from "react-router-dom";
import useAuthUser from "@/hooks/useAuthUser";
import { useUserProfile } from "@/hooks/useUserProfile";
import useSeekerMetrics from "@/hooks/useSeekerMetrics";

// για έλεγχο ύπαρξης Video CV
import { auth } from "@/lib/firebase";
import { getFirestore, collection, getCountFromServer } from "firebase/firestore";

export default function SeekerDashboard() {
  // Mock (δεν χρησιμοποιείται πια για completion)
  const stats = {
    profileViews: 156,
    applications: 12,
    messages: 8,
    profileCompletion: 85,
  };

  const recent = [
    { id: 1, role: "Senior Frontend Developer", company: "TechCorp Inc.", ago: "2 days ago", status: "Under Review" },
    { id: 2, role: "UI/UX Designer", company: "Creative Studio", ago: "1 week ago", status: "Interview Scheduled" },
  ];

  const CardShell = ({ children }: { children: React.ReactNode }) => (
    <Card className="border-white/10 bg-white/[0.02] backdrop-blur-sm shadow-[0_8px_24px_-8px_rgba(0,0,0,.6)]">
      {children}
    </Card>
  );

  const { user } = useAuthUser();
  const { profile } = useUserProfile();

  const displayName =
    (profile?.fullName?.trim?.() ||
      user?.displayName?.trim?.() ||
      user?.email?.split("@")[0]) ?? "";

  const firstName = displayName.split(" ")[0] || displayName;

  const { profileViews, applicationsTotal, applicationsThisWeek, unreadMessages } =
    useSeekerMetrics();

  // ---------- δυναμικά flags για το checklist ----------
  // Video CV: μετράμε reels ή primaryReelId
  const [reelCount, setReelCount] = React.useState<number>(0);
  React.useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const db = getFirestore();
    const col = collection(db, "users", uid, "reels");
    getCountFromServer(col)
      .then((snap) => setReelCount(snap.data().count))
      .catch(() => setReelCount(0));
  }, [auth.currentUser?.uid]);

  const hasBasicInfo = !!(profile?.fullName && (profile as any)?.jobTitle);
  const hasVideoCV = reelCount > 0 || !!(profile as any)?.primaryReelId;
  const hasWorkExp =
    Array.isArray((profile as any)?.experience) &&
    ((profile as any).experience as any[]).length > 0;

  const socials = ((profile as any)?.socials ?? {}) as {
    linkedin?: string;
    github?: string;
    website?: string;
  };
  const hasSocialLinks = !!(socials.linkedin || socials.github || socials.website);

  // ---------- Profile Strength (Basic 50, Video 35, Work 10, Socials 5) ----------
  const profileStrength =
    (hasBasicInfo ? 50 : 0) +
    (hasVideoCV ? 35 : 0) +
    (hasWorkExp ? 10 : 0) +
    (hasSocialLinks ? 5 : 0);

  return (
    <div className="space-y-8 text-white">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="text-white/60 mt-2">
          Here’s what’s happening with your ReelCV profile and applications.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <CardShell>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-white/80">Profile Views</CardTitle>
            <Eye className="h-4 w-4 text-white/50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{profileViews}</div>
            <p className="text-xs text-emerald-400"></p>
          </CardContent>
        </CardShell>

        <CardShell>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-white/80">Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-white/50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{applicationsTotal}</div>
            <p className="text-xs text-emerald-400">+{applicationsThisWeek} this week</p>
          </CardContent>
        </CardShell>

        <CardShell>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-white/80">Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-white/50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unreadMessages}</div>
            <p className="text-xs text-yellow-400">{unreadMessages} unread</p>
          </CardContent>
        </CardShell>

        <CardShell>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-white/80">Profile Strength</CardTitle>
            <TrendingUp className="h-4 w-4 text-white/50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{profileStrength}%</div>
            <p className="text-xs text-white/50 mt-1">Complete your profile</p>
          </CardContent>
        </CardShell>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Complete Profile */}
        <CardShell>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-violet-400" />
              <span>Complete Your Profile</span>
            </CardTitle>
            <CardDescription className="text-white/60">
              Increase your visibility to employers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/80">Profile Completion</span>
                <span className="text-sm text-white/60">{profileStrength}%</span>
              </div>
              <Progress className="h-2 bg-white/10" value={profileStrength} />
            </div>

            <div className="space-y-3 text-sm">
              {/* Basic Info */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white/80">
                  {hasBasicInfo ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-amber-300" />
                  )}
                  Basic Info
                </span>
                <span className="text-white/60">{hasBasicInfo ? "Complete" : "Incomplete"}</span>
              </div>

              {/* Video CV */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white/80">
                  {hasVideoCV ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-amber-300" />
                  )}
                  Video CV
                </span>
                <span className="text-white/60">{hasVideoCV ? "Complete" : "Incomplete"}</span>
              </div>

              {/* Work Experience */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white/80">
                  {hasWorkExp ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-amber-300" />
                  )}
                  Work Experience
                </span>
                <span className="text-white/60">{hasWorkExp ? "Complete" : "Incomplete"}</span>
              </div>

              {/* Social Links */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white/80">
                  {hasSocialLinks ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Clock3 className="h-4 w-4 text-amber-300" />
                  )}
                  Social Links
                </span>
                <span className="text-white/60">{hasSocialLinks ? "Complete" : "Missing"}</span>
              </div>
            </div>

            <Link to="/dashboard/reelcv">
              <Button className="w-full bg-violet-500 hover:bg-violet-500/90 text-white shadow-[0_0_0_1px_rgba(255,255,255,.06)]">
                Complete Profile
              </Button>
            </Link>
          </CardContent>
        </CardShell>

        {/* Recent Applications */}
        <CardShell>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription className="text-white/60">Track your job application progress</CardDescription>
            </div>
            <Link to="/dashboard/jobs">
              <Button variant="outline" className="border-white/15 text-white hover:bg-white/10">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {recent.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-white/10 p-4 hover:bg-white/[0.03] transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.role}</div>
                    <div className="text-sm text-white/60">{r.company}</div>
                    <div className="text-xs text-white/50 mt-1">Applied {r.ago}</div>
                  </div>
                  <Badge className="bg-amber-300/20 text-amber-200 border-0">
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </CardShell>

        {/* Quick Actions */}
        <CardShell>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription className="text-white/60">
              Common tasks to boost your profile and applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/dashboard/upload">
                <Button variant="outline" className="w-full h-20 flex flex-col space-y-2 border-white/15 text-white hover:bg-white/10">
                  <Video className="w-6 h-6" />
                  <span>Upload Video</span>
                </Button>
              </Link>
              <Link to="/dashboard/jobs">
                <Button variant="outline" className="w-full h-20 flex flex-col space-y-2 border-white/15 text-white hover:bg-white/10">
                  <Briefcase className="w-6 h-6" />
                  <span>Browse Jobs</span>
                </Button>
              </Link>
              <Link to="/dashboard/messages">
                <Button variant="outline" className="w-full h-20 flex flex-col space-y-2 border-white/15 text-white hover:bg-white/10">
                  <MessageCircle className="w-6 h-6" />
                  <span>Messages</span>
                </Button>
              </Link>
              <Link to="/dashboard/settings">
                <Button variant="outline" className="w-full h-20 flex flex-col space-y-2 border-white/15 text-white hover:bg-white/10">
                  <TrendingUp className="w-6 h-6" />
                  <span>Settings</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </CardShell>
      </div>
    </div>
  );
}
