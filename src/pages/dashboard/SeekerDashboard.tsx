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

export default function SeekerDashboard() {
  // Mock data – κράτα την υπάρχουσα λογική σου αν έχεις
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

  return (
    <div className="space-y-8 text-white">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold">Welcome back!</h1>
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
            <div className="text-3xl font-semibold">{stats.profileViews}</div>
            <p className="text-xs text-emerald-300/80 mt-1">+12% from last month</p>
          </CardContent>
        </CardShell>

        <CardShell>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-white/80">Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-white/50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.applications}</div>
            <p className="text-xs text-white/50 mt-1">+3 this week</p>
          </CardContent>
        </CardShell>

        <CardShell>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-white/80">Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-white/50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.messages}</div>
            <p className="text-xs text-white/50 mt-1">2 unread</p>
          </CardContent>
        </CardShell>

        <CardShell>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-white/80">Profile Strength</CardTitle>
            <TrendingUp className="h-4 w-4 text-white/50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">85%</div>
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
                <span className="text-sm text-white/60">{stats.profileCompletion}%</span>
              </div>
              <Progress className="h-2 bg-white/10" value={stats.profileCompletion} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white/80">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Basic Info
                </span>
                <span className="text-white/60">Complete</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white/80">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Video CV
                </span>
                <span className="text-white/60">Complete</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white/80">
                  <Clock3 className="h-4 w-4 text-amber-300" /> Work Experience
                </span>
                <span className="text-white/60">Incomplete</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white/80">
                  <Clock3 className="h-4 w-4 text-amber-300" /> Social Links
                </span>
                <span className="text-white/60">Missing</span>
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
