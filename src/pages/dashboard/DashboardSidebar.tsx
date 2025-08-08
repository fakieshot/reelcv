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
  const currentPath = location.pathname;

  // TODO: wire this to real auth/role state
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

  // style for active/hover like the mockup (pill highlight)
  const navCls = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
      "text-white/90 hover:text-white",
      isActive ? "bg-white/15 text-white" : "hover:bg-white/10",
    ].join(" ");

  return (
    <Sidebar
      // lift sidebar above header blur if any
      className="z-40 w-64 border-0 text-white"
      // gradient + force shadcn sidebar CSS variables so internals don't paint white
      style={
        {
          background:
            "linear-gradient(180deg, #6A5CFF 0%, #8C6CFF 40%, #9B7CFF 100%)",
          // override shadcn sidebar palette (we defined these in tailwind too)
          "--sidebar-background": "transparent",
          "--sidebar-foreground": "255 255 255",
          "--sidebar-primary": "255 255 255",
          "--sidebar-primary-foreground": "17 17 17",
          "--sidebar-accent": "255 255 255 / 0.10",
          "--sidebar-accent-foreground": "255 255 255",
          "--sidebar-border": "255 255 255 / 0.15",
          "--sidebar-ring": "255 255 255 / 0.20",
        } as React.CSSProperties
      }
    >
      <SidebarContent className="bg-transparent">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-2 text-xs uppercase tracking-wider text-white/70">
            {userType === "candidate" ? "Candidate Portal" : "Employer Portal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton   asChild
  className="focus-visible:ring-[#9b87f5] focus-visible:ring-offset-2">
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
