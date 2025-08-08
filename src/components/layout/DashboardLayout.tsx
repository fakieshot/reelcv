import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "@/pages/dashboard/DashboardSidebar";
import DashboardHeader from "@/pages/dashboard/DashboardHeader";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar above header blur */}
        <div className="relative z-40">
          <DashboardSidebar />
        </div>

        {/* Content column */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Keep header *below* sidebar */}
          <div className="sticky top-0 z-30">
            <DashboardHeader />
          </div>

          <main className="flex-1 p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
