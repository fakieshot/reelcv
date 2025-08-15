import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Home,
  Video,
  Briefcase,
  Upload,
  MessageCircle,
  Settings,
  Shield,
  Users,
  BarChart3,
} from "lucide-react";

export default function DashboardSidebar() {
  const location = useLocation();
  void location;

  const userType: "candidate" | "employer" = "candidate";

  const candidateItems = [
    { title: "Dashboard", url: "/dashboard/jobseeker", icon: Home },
    { title: "My ReelCV", url: "/dashboard/reelcv", icon: Video },
    { title: "Job Listings", url: "/dashboard/jobs", icon: Briefcase },
    { title: "Upload Center", url: "/dashboard/upload", icon: Upload },
    { title: "Messages", url: "/dashboard/messages", icon: MessageCircle },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ];

  const employerItems = [
    { title: "Overview", url: "/dashboard/employer", icon: Home },
    { title: "Job Listings", url: "/dashboard/jobs", icon: Briefcase },
    { title: "Candidates", url: "/dashboard/candidates", icon: Users },
    { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    { title: "Messages", url: "/dashboard/messages", icon: MessageCircle },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
    { title: "Admin", url: "/dashboard/admin", icon: Shield },
  ];

  const items = userType === "candidate" ? candidateItems : employerItems;

  const navCls = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
      "text-white/80 hover:text-white",
      isActive
        ? "bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,.06)]"
        : "hover:bg-white/5",
    ].join(" ");

  return (
    <Sidebar
      className="
        z-40 w-64 text-white
        bg-[linear-gradient(180deg,#1b1635_0%,#0f0c22_100%)]
        shadow-[0_10px_40px_-10px_rgba(0,0,0,.6)]
        border-0
      "
      /* ✅ Κάνουμε το sidebar border ΠΛΗΡΩΣ διάφανο για να φύγει η λευκή γραμμή */
      style={
        {
          "--sidebar-background": "transparent",
          "--sidebar-foreground": "255 255 255",
          "--sidebar-primary": "255 255 255",
          "--sidebar-primary-foreground": "17 17 17",
          "--sidebar-accent": "255 255 255 / 0.08",
          "--sidebar-accent-foreground": "255 255 255",
          "--sidebar-border": "0 0% 100% / 0", // 👈 transparent
          "--sidebar-ring": "139 92 246",
        } as React.CSSProperties
      }
    >
      <SidebarContent className="bg-transparent">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-3 text-[11px] uppercase tracking-[.12em] text-white/60">
            {userType === "candidate" ? "Candidate Portal" : "Employer Portal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                  >
                    <NavLink to={item.url} end className={navCls}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
