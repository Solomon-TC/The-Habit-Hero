"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import SettingsForm from "@/components/ui/settings-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "../../../../supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Settings, Bell, Lock, UserCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    reminderNotifications: true,
    achievementNotifications: true,
    friendActivityNotifications: false,
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        const client = createClient();
        const {
          data: { user },
        } = await client.auth.getUser();

        if (!user) {
          router.push("/sign-in");
          return;
        }

        setUser(user);
        // Here you would fetch notification settings from the database
        // For now we're using default values
      } catch (error) {
        console.error("Authentication error:", error);
        router.push("/sign-in");
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleNotificationChange = (setting) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));

    // Here you would save the updated settings to the database
    // This is a placeholder for future implementation
  };

  if (loading) {
    return (
      <>
        <DashboardNavbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardNavbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8">
          {/* Header Section */}
          <header>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </header>

          {/* Settings Tabs */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full md:w-auto grid-cols-3 mb-8">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <SettingsForm />
            </TabsContent>

            <TabsContent value="notifications">
              <div className="bg-white p-6 rounded-lg border-2 border-primary/10 shadow-sm">
                <h2 className="text-xl font-semibold mb-6">
                  Notification Preferences
                </h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about your account activity
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={() =>
                        handleNotificationChange("emailNotifications")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Habit Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when it's time to complete your habits
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.reminderNotifications}
                      onCheckedChange={() =>
                        handleNotificationChange("reminderNotifications")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Achievement Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when you earn achievements or level up
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.achievementNotifications}
                      onCheckedChange={() =>
                        handleNotificationChange("achievementNotifications")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Friend Activity</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about your friends' achievements
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.friendActivityNotifications}
                      onCheckedChange={() =>
                        handleNotificationChange("friendActivityNotifications")
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security">
              <div className="bg-white p-6 rounded-lg border-2 border-primary/10 shadow-sm">
                <h2 className="text-xl font-semibold mb-6">
                  Security Settings
                </h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Change Password
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Update your password to keep your account secure
                    </p>
                    <button
                      onClick={() => router.push("/dashboard/reset-password")}
                      className="text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      Change password
                    </button>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-2">Account Data</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Download or delete your account data
                    </p>
                    <div className="flex gap-4">
                      <button className="text-primary hover:text-primary/80 text-sm font-medium">
                        Download data
                      </button>
                      <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                        Delete account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}
