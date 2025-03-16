"use client";

import { useEffect, useState, useRef } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Calendar,
  BarChart3,
  Loader2,
  Target,
  ArrowRight,
} from "lucide-react";
import HabitCard from "@/components/ui/habit-card";
import GoalCard from "@/components/ui/goal-card";
import HabitStats from "@/components/ui/habit-stats";
import HabitCalendar from "@/components/ui/habit-calendar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createClient } from "../../../supabase/client";
import { useRouter } from "next/navigation";
import HabitForm from "@/components/ui/habit-form";
import Confetti from "@/components/confetti";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddHabitForm, setShowAddHabitForm] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [showEditHabitForm, setShowEditHabitForm] = useState(false);
  const [userLevel, setUserLevel] = useState(1);
  const [userXp, setUserXp] = useState(0);
  const [xpForNextLevel, setXpForNextLevel] = useState(100);
  const [xpProgress, setXpProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevLevelRef = useRef(1);
  const [calendarData, setCalendarData] = useState({
    habitId: "",
    habitName: "",
    completedDates: [],
  });
  const [statsData, setStatsData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
    completionRate: 0,
    daysTracked: 0,
  });
  const [overallStats, setOverallStats] = useState({
    totalHabits: 0,
    totalGoals: 0,
    activeStreaks: 0,
    completedToday: 0,
    highestStreak: 0,
    averageCompletion: 0,
  });

  // Calculate XP needed for next level
  const calculateXpForNextLevel = (level) =>
    Math.round(100 * Math.pow(1.5, level - 1));

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      try {
        const client = createClient();
        const {
          data: { user },
        } = await client.auth.getUser();

        if (!user) {
          console.log("No user found, redirecting to sign-in");
          router.push("/sign-in");
          return;
        }

        console.log("User authenticated:", user.email);
        setUser(user);
        fetchHabits();
        fetchGoals();
        fetchUserLevel(user.id);

        // Set up realtime subscription for user level updates
        const userLevelSubscription = client
          .channel("public:user_levels")
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "user_levels",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("User level updated:", payload);
              if (payload.new) {
                const level = payload.new.current_level;
                const xp = payload.new.current_xp;
                const nextLevelXp = calculateXpForNextLevel(level);
                const progress = Math.round((xp / nextLevelXp) * 100);

                // Check if level increased
                if (level > prevLevelRef.current) {
                  setShowConfetti(true);
                  setTimeout(() => setShowConfetti(false), 3000);
                }

                prevLevelRef.current = level;
                setUserLevel(level);
                setUserXp(xp);
                setXpForNextLevel(nextLevelXp);
                setXpProgress(progress);
              }
            },
          )
          .subscribe();

        return () => {
          userLevelSubscription.unsubscribe();
        };
      } catch (error) {
        console.error("Authentication error:", error);
        router.push("/sign-in");
      }
    };

    checkUser();
  }, [router]);

  const fetchUserLevel = async (userId) => {
    try {
      const client = createClient();
      const { data, error } = await client
        .from("user_levels")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user level:", error);
      }

      if (data) {
        const level = data.current_level;
        const xp = data.current_xp;
        const nextLevelXp = calculateXpForNextLevel(level);
        const progress = Math.round((xp / nextLevelXp) * 100);

        setUserLevel(level);
        setUserXp(xp);
        setXpForNextLevel(nextLevelXp);
        setXpProgress(progress);
      } else {
        setUserLevel(1);
        setUserXp(0);
        setXpForNextLevel(100);
        setXpProgress(0);
      }
    } catch (error) {
      console.error("Error fetching user level:", error);
    }
  };

  const fetchHabits = async () => {
    try {
      setLoading(true);
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: { action: "getHabits" },
        },
      );

      if (error) {
        console.error("Error fetching habits:", error);
        throw error;
      }

      // Calculate completion rates for each habit
      const processedHabits = data.map((habit) => {
        const completions = habit.habit_completions?.length || 0;
        const daysTracked = calculateDaysTracked(habit.created_at);
        const completionRate =
          daysTracked > 0 ? Math.round((completions / daysTracked) * 100) : 0;

        return {
          ...habit,
          completionRate,
        };
      });

      setHabits(processedHabits);
      calculateOverallStats(processedHabits);
    } catch (error) {
      console.error("Error fetching habits:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoals = async () => {
    try {
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: { action: "getGoals" },
        },
      );

      if (error) {
        console.error("Error fetching goals:", error);
        throw error;
      }

      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const calculateOverallStats = (habitsData) => {
    // Calculate overall stats
    const totalHabits = habitsData.length;
    const totalGoals = goals.length;
    const completedToday = habitsData.filter((h) => h.isCompleted).length;
    const activeStreaks = habitsData.filter((h) => h.streak > 0).length;
    const highestStreak = Math.max(0, ...habitsData.map((h) => h.streak || 0));

    // Calculate average completion rate
    const totalCompletionRate = habitsData.reduce(
      (sum, habit) => sum + (habit.completionRate || 0),
      0,
    );
    const averageCompletion =
      totalHabits > 0 ? Math.round(totalCompletionRate / totalHabits) : 0;

    setOverallStats({
      totalHabits,
      totalGoals,
      activeStreaks,
      completedToday,
      highestStreak,
      averageCompletion,
    });
  };

  const calculateDaysTracked = (createdAt) => {
    const startDate = new Date(createdAt);
    const today = new Date();
    const diffTime = Math.abs(today - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1; // Minimum 1 day
  };

  const handleAddHabit = async (habitData) => {
    try {
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: { action: "createHabit", habitData },
        },
      );

      if (error) throw error;

      setShowAddHabitForm(false);
      fetchHabits();
    } catch (error) {
      console.error("Error adding habit:", error);
    }
  };

  const handleEditHabit = async (habitData) => {
    try {
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: {
            action: "updateHabit",
            habitId: selectedHabit.id,
            habitData,
          },
        },
      );

      if (error) throw error;

      setShowEditHabitForm(false);
      setSelectedHabit(null);
      fetchHabits();
    } catch (error) {
      console.error("Error updating habit:", error);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (
      !confirm(
        "Are you sure you want to delete this habit? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: { action: "deleteHabit", habitId },
        },
      );

      if (error) throw error;

      fetchHabits();
    } catch (error) {
      console.error("Error deleting habit:", error);
    }
  };

  const handleCheckIn = async (habitId) => {
    try {
      console.log(`Checking in habit ${habitId}`);
      const client = createClient();
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: {
            action: "checkInHabit",
            habitId,
            date: today,
          },
        },
      );

      if (error) {
        console.error("Error response from server:", error);
        throw error;
      }

      console.log("Server response:", data);

      // Show XP notification and confetti if XP was earned
      if (data?.xp_earned) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        // Use a more game-like notification instead of alert
        const notification = document.createElement("div");
        notification.className =
          "fixed top-20 right-4 bg-gradient-to-r from-primary to-secondary text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-float";
        notification.innerHTML = `<div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M19 17v4"/><path d="M17 19h4"/></svg> +${data.xp_earned} XP</div>`;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
          notification.classList.add("opacity-0", "transition-opacity");
          setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
      }

      // Refresh user level in navbar and dashboard
      window.dispatchEvent(new Event("levelUpdated"));
      fetchUserLevel(user.id);

      fetchHabits();
    } catch (error) {
      console.error("Error checking in habit:", error);
      alert("Failed to check in habit. See console for details.");
    }
  };

  const handleViewDetails = (habitId) => {
    const habit = habits.find((h) => h.id === habitId);
    if (habit) {
      setSelectedHabit(habit);

      // Prepare calendar data
      const completedDates = habit.habit_completions.map(
        (c) => new Date(c.completed_date),
      );
      setCalendarData({
        habitId: habit.id,
        habitName: habit.name,
        completedDates,
      });

      // Prepare stats data
      const totalCompletions = habit.habit_completions.length;
      const daysTracked = calculateDaysTracked(habit.created_at);
      const completionRate =
        daysTracked > 0
          ? Math.round((totalCompletions / daysTracked) * 100)
          : 0;

      setStatsData({
        currentStreak: habit.streak || 0,
        longestStreak: habit.longestStreak || 0,
        totalCompletions,
        completionRate,
        daysTracked,
      });
    }
  };

  // Create handler functions that will be passed to client components
  const handleAddHabitClick = () => setShowAddHabitForm(true);
  const handleCancelAddHabit = () => setShowAddHabitForm(false);
  const handleCancelEditHabit = () => setShowEditHabitForm(false);
  const handleEditHabitClick = (habit) => {
    setSelectedHabit(habit);
    setShowEditHabitForm(true);
  };

  // Get today's date in a readable format - using useEffect to avoid hydration errors
  const [today, setToday] = useState("");

  useEffect(() => {
    // Set the date only on the client side to avoid hydration mismatch
    setToday(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);

  return (
    <>
      {showConfetti && <Confetti />}
      <DashboardNavbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                {today} • Welcome back
                {user?.user_metadata?.full_name
                  ? `, ${user.user_metadata.full_name}`
                  : ""}
                !
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/goals")}
              >
                <Target className="mr-2 h-5 w-5" />
                Manage Goals
              </Button>
              <Button
                className="bg-gradient-to-r from-primary to-primary/90 hover:brightness-110 shadow-md"
                onClick={handleAddHabitClick}
              >
                <Plus className="mr-2 h-5 w-5" />
                Add New Habit
              </Button>
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content - Left Column (Stats) */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-lg border-2 border-primary/10 shadow-sm">
                  <h2 className="text-xl font-semibold mb-4">Your Progress</h2>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-4 rounded-lg mb-4 border-2 border-primary/20 animate-pulse-slow">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm text-green-600 font-medium">
                            Character Level
                          </p>
                          <p className="text-3xl font-bold">{userLevel}</p>
                        </div>
                        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-xl font-bold shadow-lg animate-float">
                          {userLevel}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-green-800">
                          <span>Progress to Level {userLevel + 1}</span>
                          <span>
                            {userXp} / {xpForNextLevel} XP
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-gradient-to-r from-primary via-secondary to-accent h-2.5 rounded-full transition-all duration-500 ease-in-out"
                            style={{ width: `${xpProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary/20 hover:shadow-md transition-all">
                        <p className="text-sm text-green-600 font-medium">
                          Habits
                        </p>
                        <p className="text-3xl font-bold">
                          {overallStats.totalHabits}
                        </p>
                      </div>
                      <div className="bg-secondary/10 p-4 rounded-lg border-2 border-secondary/20 hover:shadow-md transition-all">
                        <p className="text-sm text-blue-600 font-medium">
                          Goals
                        </p>
                        <p className="text-3xl font-bold">
                          {overallStats.totalGoals}
                        </p>
                      </div>
                      <div className="bg-[#e882e8]/10 p-4 rounded-lg border-2 border-[#e882e8]/20 hover:shadow-md transition-all">
                        <p className="text-sm text-purple-600 font-medium">
                          Highest Streak
                        </p>
                        <p className="text-3xl font-bold">
                          {overallStats.highestStreak}
                        </p>
                      </div>
                      <div className="bg-accent/10 p-4 rounded-lg border-2 border-accent/20 hover:shadow-md transition-all">
                        <p className="text-sm text-amber-600 font-medium">
                          Today's Check-ins
                        </p>
                        <p className="text-3xl font-bold">
                          {overallStats.completedToday}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-medium mb-3">
                        Today's Calendar
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        {habits.length > 0 ? (
                          <div className="space-y-2">
                            {habits.slice(0, 3).map((habit) => (
                              <div
                                key={habit.id}
                                className="flex justify-between items-center"
                              >
                                <span className="text-sm">{habit.name}</span>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${habit.isCompleted ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}
                                >
                                  {habit.isCompleted ? "Completed" : "Pending"}
                                </span>
                              </div>
                            ))}
                            {habits.length > 3 && (
                              <div className="text-center mt-2">
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="text-green-600"
                                >
                                  View all habits
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-2">
                            No habits to display
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedHabit && (
                  <div className="bg-white p-6 rounded-lg border-2 border-primary/10 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold">
                        {selectedHabit.name} Stats
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedHabit(null)}
                      >
                        Close
                      </Button>
                    </div>
                    <HabitStats stats={statsData} />
                    <div className="mt-4">
                      <HabitCalendar
                        habitId={calendarData.habitId}
                        habitName={calendarData.habitName}
                        completedDates={calendarData.completedDates}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Middle Column (Habits) */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-lg border-2 border-primary/10 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Your Habits</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600"
                      onClick={handleAddHabitClick}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>

                  {habits.length > 0 ? (
                    <div className="space-y-4">
                      {habits.slice(0, 4).map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={{
                            id: habit.id,
                            name: habit.name,
                            streak: habit.streak || 0,
                            completionRate: habit.completionRate || 0,
                            frequency: habit.frequency,
                            lastCompleted: habit.lastCompleted,
                            isCompleted: habit.isCompleted,
                          }}
                          onCheckIn={handleCheckIn}
                          onEdit={() => handleEditHabitClick(habit)}
                          onDelete={handleDeleteHabit}
                          onViewDetails={handleViewDetails}
                        />
                      ))}

                      {habits.length > 4 && (
                        <div className="text-center mt-4">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push("/dashboard/habits")}
                          >
                            View All Habits
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-48 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 text-center">
                      <Plus className="h-8 w-8 text-gray-400 mb-2" />
                      <h3 className="text-base font-medium mb-1">
                        Add Your First Habit
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Start tracking your daily routines
                      </p>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-primary to-primary/90 hover:brightness-110"
                        onClick={handleAddHabitClick}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Habit
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (Goals) */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-lg border-2 border-secondary/10 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Your Goals</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600"
                      onClick={() => router.push("/dashboard/goals")}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>

                  {goals.length > 0 ? (
                    <div className="space-y-4">
                      {goals.slice(0, 2).map((goal) => (
                        <GoalCard
                          key={goal.id}
                          goal={{
                            id: goal.id,
                            name: goal.name,
                            description: goal.description,
                            targetDate: goal.target_date,
                            status: goal.status,
                            milestones: goal.milestones || [],
                          }}
                          onEdit={() =>
                            router.push(`/dashboard/goals?edit=${goal.id}`)
                          }
                          onDelete={() => {}}
                          onAddMilestone={() =>
                            router.push(
                              `/dashboard/goals?goal=${goal.id}&addMilestone=true`,
                            )
                          }
                          onEditMilestone={() => {}}
                          onToggleMilestone={() => {}}
                        />
                      ))}

                      {goals.length > 2 && (
                        <div className="text-center mt-4">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push("/dashboard/goals")}
                          >
                            View All Goals
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-48 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 text-center">
                      <Target className="h-8 w-8 text-gray-400 mb-2" />
                      <h3 className="text-base font-medium mb-1">
                        Set Your First Goal
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Define goals to stay motivated
                      </p>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-secondary to-secondary/90 hover:brightness-110"
                        onClick={() => router.push("/dashboard/goals")}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Goal
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Habit Dialog */}
      <Dialog open={showAddHabitForm} onOpenChange={setShowAddHabitForm}>
        <DialogContent className="sm:max-w-md">
          <HabitForm
            onSubmit={handleAddHabit}
            onCancel={handleCancelAddHabit}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Habit Dialog */}
      <Dialog open={showEditHabitForm} onOpenChange={setShowEditHabitForm}>
        <DialogContent className="sm:max-w-md">
          {selectedHabit && (
            <HabitForm
              initialData={{
                id: selectedHabit.id,
                name: selectedHabit.name,
                description: selectedHabit.description || "",
                frequency: selectedHabit.frequency,
                reminderTime: selectedHabit.reminder_time,
                reminderEnabled: selectedHabit.reminder_enabled,
              }}
              onSubmit={handleEditHabit}
              onCancel={handleCancelEditHabit}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
