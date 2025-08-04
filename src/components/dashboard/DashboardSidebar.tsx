import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
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
} from 'lucide-react';

const DashboardSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Mock user type - in real app, get from auth context
  const userType = 'candidate'; // or 'employer'

  const candidateItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'My ReelCV', url: '/dashboard/reelcv', icon: Video },
    { title: 'Job Listings', url: '/dashboard/jobs', icon: Briefcase },
    { title: 'Upload Center', url: '/dashboard/upload', icon: Upload },
    { title: 'Messages', url: '/dashboard/messages', icon: MessageCircle },
    { title: 'Settings', url: '/dashboard/settings', icon: Settings },
  ];

  const employerItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Job Listings', url: '/dashboard/jobs', icon: Briefcase },
    { title: 'Candidates', url: '/dashboard/candidates', icon: Users },
    { title: 'Analytics', url: '/dashboard/analytics', icon: BarChart3 },
    { title: 'Messages', url: '/dashboard/messages', icon: MessageCircle },
    { title: 'Settings', url: '/dashboard/settings', icon: Settings },
    { title: 'Admin', url: '/dashboard/admin', icon: Shield },
  ];

  const items = userType === 'candidate' ? candidateItems : employerItems;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-sidebar-accent text-sidebar-primary font-medium' : 'hover:bg-sidebar-accent/50';

  return (
    <Sidebar className="w-64">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/60 px-3 py-2">
            {userType === 'candidate' ? 'Candidate Portal' : 'Employer Portal'}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="w-5 h-5" />
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
};

export default DashboardSidebar;