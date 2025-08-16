import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "@/pages/dashboard/DashboardSidebar";
import DashboardHeader from "@/pages/dashboard/DashboardHeader";
import { Outlet, useLocation } from "react-router-dom";
import SupportWidget from "@/components/support/SupportWidget";

export default function DashboardLayout() {
  const location = useLocation();

  // 🔒 Κρύψε το global chrome ΜΟΝΟ στο admin support desk
  const hideChrome = location.pathname.startsWith("/dashboard/admin/support");

  return (
    // ✅ Επιβάλλουμε dark theme ΜΟΝΟ στο dashboard shell
    <div className="dark">
      <SidebarProvider>
        <div
          className="
            min-h-screen flex w-full
            bg-[#0b0b1b]
            [background-image:radial-gradient(1200px_600px_at_30%_0%,rgba(120,119,198,.25),transparent),radial-gradient(900px_400px_at_75%_-10%,rgba(236,72,153,.12),transparent)]
          "
        >
          {/* Sidebar */}
          {!hideChrome && (
            <div className="relative z-40">
              <DashboardSidebar />
            </div>
          )}

          {/* Content column */}
          <div className={`flex-1 flex flex-col ${hideChrome ? "" : "bg-portal"} min-h-screen`}>
            {/* Header + neon bar */}
            {!hideChrome && (
              <div className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-[#0b0b1b]/70">
                <DashboardHeader />
                <div className="h-[3px] w-full bg-gradient-to-r from-[#8b5cf6] via-[#a78bfa] to-[#ec4899]" />
              </div>
            )}

            {/* Main */}
            <main className={`flex-1 ${hideChrome ? "p-0" : "p-8 pb-24"}`}>
              <div className={hideChrome ? "p-0" : "mx-auto max-w-7xl p-6 md:p-8"}>
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>

      {/* Floating help button: όχι στο support desk */}
      {!hideChrome && <SupportWidget />}
    </div>
  );
}
