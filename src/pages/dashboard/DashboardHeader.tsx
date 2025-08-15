// src/pages/dashboard/DashboardHeader.tsx
import { Link, useNavigate } from "react-router-dom";
import { Bell, Search, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

// ✅ Χρησιμοποιούμε το δικό σου logo
import logo from "@/assets/branding/logo.png";

export default function DashboardHeader() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const goToProfile = () => navigate("/dashboard/reelcv");
  const goToSettings = () => navigate("/dashboard/settings");

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed out" });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Sign out failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    // Πλήρως διάφανο header + blur. Όλα τα κείμενα/εικονίδια λευκά.
    <header className="w-full border-b border-white/10 bg-transparent backdrop-blur">
      <div className="mx-auto max-w-7xl h-14 px-4 flex items-center justify-between text-white">
        {/* LEFT: Logo */}
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="ReelCV" className="flex items-center gap-2 md:gap-3">
   <img
  src={logo}
  alt="ReelCV"
  className="h-[100px] w-auto -mt-[2px] select-none shrink-0"
  draggable={false}
/>


          </Link>
        </div>

        {/* RIGHT: actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <Bell className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-2 text-white/90 hover:text-white hover:bg-white/10"
              >
                <div className="h-8 w-8 rounded-full bg-white/10" />
                <div className="hidden text-left md:block">
                  <div className="text-sm font-medium leading-none">John Doe</div>
                  <div className="text-xs text-white/60">john@example.com</div>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 border-white/10 bg-[#11122a] text-white"
            >
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={goToProfile}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={goToSettings}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleSignOut}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
