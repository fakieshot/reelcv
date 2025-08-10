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

export default function DashboardHeader() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const goToProfile = () => {
    // Το “Profile” στο dropdown να οδηγεί στο MyReelCV
    navigate("/dashboard/reelcv");
  };

  const goToSettings = () => {
    navigate("/dashboard/settings");
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed out" });
      navigate("/"); // αρχική σελίδα (landing)
    } catch (err: any) {
      toast({ title: "Sign out failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        {/* Left area (πχ burger για sidebar, logo κλπ) */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/90 text-white grid place-items-center">
              <User className="w-5 h-5" />
            </div>
            <span className="font-semibold">ReelCV</span>
          </Link>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="w-5 h-5" />
          </Button>

          {/* Account dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="hidden text-left md:block">
                  <div className="text-sm font-medium leading-none">John Doe</div>
                  <div className="text-xs text-muted-foreground">john@example.com</div>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={goToProfile}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={goToSettings}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
