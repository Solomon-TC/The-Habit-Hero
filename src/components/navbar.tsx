import Link from "next/link";
import { createClient } from "../../supabase/server";
import { Button } from "./ui/button";
import { CheckCircle2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import UserProfile with no SSR to avoid hook errors
const UserProfile = dynamic(() => import("./user-profile"), { ssr: false });

export default async function Navbar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="w-full border-b border-gray-200 bg-white py-2">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" prefetch className="text-xl font-bold flex items-center">
          <CheckCircle2 className="h-6 w-6 text-green-600 mr-2" />
          <span>HabitTracker</span>
        </Link>
        <div className="hidden md:flex gap-6 items-center">
          <Link
            href="/#features"
            className="text-sm font-medium text-gray-700 hover:text-green-600"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-gray-700 hover:text-green-600"
          >
            How It Works
          </Link>
          <Link
            href="/#pricing"
            className="text-sm font-medium text-gray-700 hover:text-green-600"
          >
            Pricing
          </Link>
        </div>
        <div className="flex gap-4 items-center">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <Button className="bg-green-600 hover:bg-green-700">
                  Dashboard
                </Button>
              </Link>
              <UserProfile />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-green-600"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
