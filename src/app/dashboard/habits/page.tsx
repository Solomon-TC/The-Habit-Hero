"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, BarChart3, Loader2, ArrowLeft } from "lucide-react";
import HabitCard from "@/components/ui/habit-card";
import HabitForm from "@/components/ui/habit-form";
import HabitCalendar from "@/components/ui/habit-calendar";
import HabitStats from "@/components/ui/habit-stats";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createClient } from "../../../../supabase/client";
import { useRouter } from "next/navigation";
import Confetti from "@/components/confetti";

export default function Habits() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddHabitForm, setShowAddHabitForm] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [showEditHabitForm, setShowEditHabitForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState("habits");
  const [showConfetti, setShowConfetti] = useState(false);
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
      } catch (error) {
        console.error("Authentication error:", error);
        router.push("/sign-in");
      }
    };

    checkUser();
  }, [router]);

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
    } catch (error) {
      console.error("Error fetching habits:", error);
    } finally {
      setLoading(false);
    }
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
      console.log(`Checking in habit ${habitId} from habits page`);
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

      // Show XP notification if XP was earned
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

      // Refresh user level in navbar
      window.dispatchEvent(new Event("levelUpdated"));

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

      setSelectedTab("calendar");
    }
  };

  // Create handler functions that will be passed to client components
  const handleAddHabitClick = () => setShowAddHabitForm(true);
  const handleCancelAddHabit = () => setShowAddHabitForm(false);
  const handleCancelEditHabit = () => setShowEditHabitForm(false);
  const handleBackToDashboard = () => setSelectedTab("habits");
  const handleEditHabitClick = (habit) => {
    setSelectedHabit(habit);
    setShowEditHabitForm(true);
  };

  return (
    <>
      {showConfetti && <Confetti />}
      <DashboardNavbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard")}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">My Habits</h1>
                <p className="text-muted-foreground">
                  Track and manage your daily habits
                </p>
              </div>
            </div>
            <Button
              className="bg-gradient-to-r from-primary to-primary/90 hover:brightness-110 shadow-md"
              onClick={handleAddHabitClick}
            >
              <Plus className="mr-2 h-5 w-5" />
              Add New Habit
            </Button>
          </header>

          {/* Main Content */}
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="w-full"
          >
            <TabsList className="grid w-full md:w-auto grid-cols-3 mb-8">
              <TabsTrigger value="habits" className="text-sm md:text-base">
                Habit Dashboard
              </TabsTrigger>
              <TabsTrigger value="calendar" className="text-sm md:text-base">
                <Calendar className="mr-2 h-4 w-4 hidden md:inline" />
                Calendar View
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm md:text-base">
                <BarChart3 className="mr-2 h-4 w-4 hidden md:inline" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="habits" className="space-y-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                </div>
              ) : habits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {habits.map((habit) => (
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
                </div>
              ) : (
                <div className="h-64 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 text-center">
                  <Plus className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-1">
                    Add Your First Habit
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start tracking your daily routines
                  </p>
                  <Button
                    className="bg-gradient-to-r from-primary to-primary/90 hover:brightness-110 shadow-md"
                    onClick={handleAddHabitClick}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Habit
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              {selectedHabit ? (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-2xl font-bold">{selectedHabit.name}</h2>
                    <Button variant="outline" onClick={handleBackToDashboard}>
                      Back to Dashboard
                    </Button>
                  </div>

                  <HabitCalendar
                    habitId={calendarData.habitId}
                    habitName={calendarData.habitName}
                    completedDates={calendarData.completedDates}
                  />
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg border-2 border-primary/10 shadow-sm">
                  <h2 className="text-xl font-semibold mb-4">Calendar View</h2>
                  <p className="text-muted-foreground mb-6">
                    Select a habit from the dashboard to view its calendar
                  </p>
                  <div className="h-96 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                    <p className="text-muted-foreground">No habit selected</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {selectedHabit ? (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedHabit.name} Analytics
                      </h2>
                      <p className="text-muted-foreground">
                        Track your progress and consistency
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleBackToDashboard}>
                      Back to Dashboard
                    </Button>
                  </div>

                  <HabitStats stats={statsData} />

                  <div className="bg-white p-6 rounded-lg border-2 border-primary/10 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">
                      Habit Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Frequency
                        </p>
                        <p className="text-base">{selectedHabit.frequency}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Created On
                        </p>
                        <p className="text-base">
                          {new Date(
                            selectedHabit.created_at,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedHabit.description && (
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            Description
                          </p>
                          <p className="text-base">
                            {selectedHabit.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg border-2 border-primary/10 shadow-sm">
                  <h2 className="text-xl font-semibold mb-4">Analytics</h2>
                  <p className="text-muted-foreground mb-6">
                    Select a habit from the dashboard to view analytics
                  </p>
                  <div className="h-96 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                    <p className="text-muted-foreground">No habit selected</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
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
