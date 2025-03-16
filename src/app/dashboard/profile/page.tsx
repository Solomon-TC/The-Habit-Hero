"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "../../../../supabase/client";
import { useRouter } from "next/navigation";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Star,
  Trophy,
  UserCircle,
  Users,
} from "lucide-react";
import Confetti from "@/components/confetti";
import Link from "next/link";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState({
    current_level: 1,
    current_xp: 0,
    total_xp_earned: 0,
  });
  const [xpHistory, setXpHistory] = useState([]);
  const [stats, setStats] = useState({
    totalHabits: 0,
    totalGoals: 0,
    completedHabits: 0,
    completedGoals: 0,
    highestStreak: 0,
  });
  const [showConfetti, setShowConfetti] = useState(false);

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
        fetchUserLevel(client, user.id);
        fetchXpHistory(client, user.id);
        fetchUserStats(client, user.id);
      } catch (error) {
        console.error("Authentication error:", error);
        router.push("/sign-in");
      }
    };

    checkUser();
  }, [router]);

  const fetchUserLevel = async (client, userId) => {
    try {
      setLoading(true);
      console.log("Fetching user level data for profile page");
      const { data, error } = await client
        .from("user_levels")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user level:", error);
        throw error;
      }

      if (data) {
        console.log("User level data retrieved:", data);
        setUserLevel(data);
      } else {
        console.log("No user level found, creating default state");
        // Set default values if no data exists
        setUserLevel({
          current_level: 1,
          current_xp: 0,
          total_xp_earned: 0,
        });

        // Create user level record if it doesn't exist
        try {
          const { error: insertError } = await client
            .from("user_levels")
            .insert({
              user_id: userId,
              current_level: 1,
              current_xp: 0,
              total_xp_earned: 0,
            });

          if (insertError) {
            console.error("Error creating user level record:", insertError);
          } else {
            console.log("Created new user level record");
          }
        } catch (insertErr) {
          console.error("Exception creating user level:", insertErr);
        }
      }
    } catch (error) {
      console.error("Error fetching user level:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchXpHistory = async (client, userId) => {
    try {
      const { data, error } = await client
        .from("xp_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching XP history:", error);
        throw error;
      }

      setXpHistory(data || []);
    } catch (error) {
      console.error("Error fetching XP history:", error);
    }
  };

  const fetchUserStats = async (client, userId) => {
    try {
      // Get habits stats
      const { data: habits, error: habitsError } = await client
        .from("habits")
        .select("id")
        .eq("user_id", userId);

      // Get goals stats
      const { data: goals, error: goalsError } = await client
        .from("goals")
        .select("id, status")
        .eq("user_id", userId);

      // Get habit completions
      const { data: completions, error: completionsError } = await client
        .from("habit_completions")
        .select("habit_id")
        .eq("user_id", userId);

      // Get habit streaks
      const { data: streaks, error: streaksError } = await client
        .from("habit_streaks")
        .select("current_streak, longest_streak")
        .eq("user_id", userId);

      if (habitsError || goalsError || completionsError || streaksError) {
        throw new Error("Error fetching user stats");
      }

      // Calculate stats
      const totalHabits = habits?.length || 0;
      const totalGoals = goals?.length || 0;
      const completedHabits =
        new Set(completions?.map((c) => c.habit_id)).size || 0;
      const completedGoals =
        goals?.filter((g) => g.status === "completed").length || 0;
      const highestStreak = Math.max(
        0,
        ...(streaks?.map((s) => s.longest_streak || 0) || [0]),
      );

      setStats({
        totalHabits,
        totalGoals,
        completedHabits,
        completedGoals,
        highestStreak,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  // Calculate XP needed for next level
  const calculateXpForNextLevel = (level) =>
    Math.round(100 * Math.pow(1.5, level - 1));
  const xpForNextLevel = calculateXpForNextLevel(userLevel.current_level);
  const xpProgress = Math.round((userLevel.current_xp / xpForNextLevel) * 100);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get source type icon
  const getSourceIcon = (sourceType) => {
    switch (sourceType) {
      case "habit":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "goal":
        return <Trophy className="h-4 w-4 text-blue-500" />;
      case "milestone":
        return <Star className="h-4 w-4 text-amber-500" />;
      default:
        return <Award className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <>
      {showConfetti && <Confetti />}
      <DashboardNavbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Your Profile</h1>
              <p className="text-muted-foreground">
                View your progress and achievements
              </p>
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - User Profile */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>User Profile</CardTitle>
                    <CardDescription>
                      Your account information and progress
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserCircle className="h-16 w-16 text-gray-400" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-primary to-secondary text-white rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm border-2 border-white shadow-md animate-pulse-slow">
                          {userLevel.current_level}
                        </div>
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-lg">
                          {user?.user_metadata?.full_name || user?.email}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>

                      <div className="w-full space-y-2 pt-4">
                        <div className="flex justify-between text-sm">
                          <span>Level {userLevel.current_level}</span>
                          <span>
                            {userLevel.current_xp} / {xpForNextLevel} XP
                          </span>
                        </div>
                        <Progress value={xpProgress} className="h-2 bg-muted" />
                        <p className="text-xs text-center text-muted-foreground">
                          {xpForNextLevel - userLevel.current_xp} XP needed for
                          next level
                        </p>
                      </div>

                      <div className="w-full pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary/20 hover:shadow-md transition-all">
                            <p className="text-sm text-green-600 font-medium">
                              Total XP
                            </p>
                            <p className="text-2xl font-bold">
                              {userLevel.total_xp_earned}
                            </p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg border-2 border-secondary/20 hover:shadow-md transition-all">
                            <p className="text-sm text-blue-600 font-medium">
                              Highest Streak
                            </p>
                            <p className="text-2xl font-bold">
                              {stats.highestStreak}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Your Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span>Habits Created</span>
                        </div>
                        <span className="font-semibold">
                          {stats.totalHabits}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-blue-500" />
                          <span>Goals Created</span>
                        </div>
                        <span className="font-semibold">
                          {stats.totalGoals}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-purple-500" />
                          <span>Habits Completed</span>
                        </div>
                        <span className="font-semibold">
                          {stats.completedHabits}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-amber-500" />
                          <span>Goals Achieved</span>
                        </div>
                        <span className="font-semibold">
                          {stats.completedGoals}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-secondary" />
                          <span>Friends</span>
                        </div>
                        <Link
                          href="/dashboard/friends"
                          className="font-semibold text-secondary hover:underline"
                        >
                          View Friends
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - XP History */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>XP History</CardTitle>
                    <CardDescription>
                      Your recent XP earnings and achievements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="all">
                      <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="habits">Habits</TabsTrigger>
                        <TabsTrigger value="goals">
                          Goals & Milestones
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="all" className="space-y-4">
                        {xpHistory.length > 0 ? (
                          xpHistory.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors card-shine"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                  {getSourceIcon(entry.source_type)}
                                </div>
                                <div>
                                  <p className="font-medium text-sm capitalize">
                                    {entry.source_type} Completed
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(entry.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full">
                                +{entry.amount} XP
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>
                              No XP history yet. Complete habits and goals to
                              earn XP!
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="habits" className="space-y-4">
                        {xpHistory.filter(
                          (entry) => entry.source_type === "habit",
                        ).length > 0 ? (
                          xpHistory
                            .filter((entry) => entry.source_type === "habit")
                            .map((entry) => (
                              <div
                                key={entry.id}
                                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors card-shine"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">
                                      Habit Completed
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(entry.created_at)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full">
                                  +{entry.amount} XP
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>
                              No habit XP history yet. Complete habits to earn
                              XP!
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="goals" className="space-y-4">
                        {xpHistory.filter(
                          (entry) =>
                            entry.source_type === "goal" ||
                            entry.source_type === "milestone",
                        ).length > 0 ? (
                          xpHistory
                            .filter(
                              (entry) =>
                                entry.source_type === "goal" ||
                                entry.source_type === "milestone",
                            )
                            .map((entry) => (
                              <div
                                key={entry.id}
                                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors card-shine"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center">
                                    {entry.source_type === "goal" ? (
                                      <Trophy className="h-4 w-4 text-blue-500" />
                                    ) : (
                                      <Star className="h-4 w-4 text-amber-500" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm capitalize">
                                      {entry.source_type} Completed
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(entry.created_at)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full">
                                  +{entry.amount} XP
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>
                              No goals or milestones XP history yet. Complete
                              goals and milestones to earn XP!
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Level Progression</CardTitle>
                    <CardDescription>
                      XP requirements for each level
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(
                        (level) => {
                          const xpRequired = calculateXpForNextLevel(level);
                          const isCurrentLevel =
                            level === userLevel.current_level;
                          const isPastLevel = level < userLevel.current_level;

                          return (
                            <div
                              key={level}
                              className={`p-4 rounded-lg border-2 ${isCurrentLevel ? "bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 animate-pulse-slow" : isPastLevel ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200"}`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${isCurrentLevel ? "bg-gradient-to-br from-primary to-secondary text-white" : isPastLevel ? "bg-gray-600 text-white" : "bg-gray-200 text-gray-700"}`}
                                  >
                                    {level}
                                  </div>
                                  <span className="font-medium">
                                    Level {level}
                                  </span>
                                </div>
                                <span className="text-sm">{xpRequired} XP</span>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
