"use client";

import Link from "next/link";
import { createClient } from "../../supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  UserCircle,
  Home,
  CheckCircle2,
  Settings,
  Bell,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardNavbar() {
  const supabase = createClient();
  const router = useRouter();
  const [userLevel, setUserLevel] = useState(1);

  useEffect(() => {
    const fetchUserLevel = async () => {
      try {
        console.log("Fetching user level");
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("user_levels")
            .select("current_level")
            .eq("user_id", user.id)
            .single();

          if (error && error.code !== "PGRST116") {
            console.error("Error fetching user level:", error);
          }

          if (data) {
            console.log("User level data:", data);
            setUserLevel(data.current_level);
          } else {
            console.log("No user level found, defaulting to level 1");
            setUserLevel(1);
          }
        }
      } catch (error) {
        console.error("Error fetching user level:", error);
      }
    };

    // Fetch on component mount
    fetchUserLevel();

    // Also fetch when level is updated
    const handleLevelUpdate = () => {
      console.log("Level update event received");
      fetchUserLevel();
    };

    window.addEventListener("levelUpdated", handleLevelUpdate);

    return () => {
      window.removeEventListener("levelUpdated", handleLevelUpdate);
    };
  }, []);

  return (
    <nav className="w-full border-b-2 border-primary/20 bg-white py-4 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            prefetch
            className="text-xl font-bold flex items-center"
          >
            <CheckCircle2 className="h-6 w-6 text-primary mr-2 animate-float" />
            <span>HabitTracker</span>
          </Link>
        </div>
        <div className="hidden md:flex gap-6 items-center">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-700 hover:text-green-600"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/goals"
            className="text-sm font-medium text-gray-700 hover:text-green-600"
          >
            Goals
          </Link>
          <Link
            href="/dashboard/friends"
            className="text-sm font-medium text-gray-700 hover:text-blue-600"
          >
            Friends
          </Link>
          <Link
            href="/dashboard?tab=calendar"
            className="text-sm font-medium text-gray-700 hover:text-green-600"
          >
            Calendar
          </Link>
          <Link
            href="/dashboard?tab=analytics"
            className="text-sm font-medium text-gray-700 hover:text-green-600"
          >
            Analytics
          </Link>
        </div>
        <div className="flex gap-4 items-center">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-green-600 rounded-full"></span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <UserCircle className="h-6 w-6" />
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-primary to-secondary text-white rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-md animate-pulse-slow">
                  {userLevel}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link href="/dashboard/profile" className="flex w-full">
                  Profile & Level
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link
                  href="/dashboard/settings"
                  className="flex w-full items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/");
                }}
                className="text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
