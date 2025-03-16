"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createClient } from "../../../../supabase/client";
import { useRouter } from "next/navigation";
import GoalCard from "@/components/ui/goal-card";
import GoalForm from "@/components/ui/goal-form";
import MilestoneForm from "@/components/ui/milestone-form";

export default function Goals() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [showEditGoalForm, setShowEditGoalForm] = useState(false);
  const [showAddMilestoneForm, setShowAddMilestoneForm] = useState(false);
  const [showEditMilestoneForm, setShowEditMilestoneForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);

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

        setUser(user);
        fetchGoals();
        fetchHabits();
      } catch (error) {
        console.error("Authentication error:", error);
        router.push("/sign-in");
      }
    };

    checkUser();
  }, [router]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const fetchHabits = async () => {
    try {
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

      // Simplify habits data for the form
      const simplifiedHabits = data.map((habit) => ({
        id: habit.id,
        name: habit.name,
      }));

      setHabits(simplifiedHabits);
    } catch (error) {
      console.error("Error fetching habits:", error);
    }
  };

  const handleAddGoal = async (goalData) => {
    try {
      console.log("Creating goal with data:", goalData);
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: {
            action: "createGoal",
            habitData: {
              name: goalData.name,
              description: goalData.description,
              targetDate: goalData.targetDate
                ? goalData.targetDate.toISOString().split("T")[0]
                : null,
              linkedHabits: goalData.linkedHabits || [],
            },
          },
        },
      );

      if (error) {
        console.error("Error response from server:", error);
        throw error;
      }

      console.log("Goal created successfully:", data);
      setShowAddGoalForm(false);
      fetchGoals();
    } catch (error) {
      console.error("Error adding goal:", error);
      alert("Failed to create goal. Please check the console for details.");
    }
  };

  const handleEditGoal = async (goalData) => {
    try {
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: {
            action: "updateGoal",
            habitData: {
              goalId: selectedGoal.id,
              name: goalData.name,
              description: goalData.description,
              targetDate: goalData.targetDate
                ? goalData.targetDate.toISOString().split("T")[0]
                : null,
              status: goalData.status,
              linkedHabits: goalData.linkedHabits,
            },
          },
        },
      );

      if (error) throw error;

      setShowEditGoalForm(false);
      setSelectedGoal(null);
      fetchGoals();
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (
      !confirm(
        "Are you sure you want to delete this goal? This will also delete all milestones. This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: {
            action: "deleteGoal",
            habitData: { goalId },
          },
        },
      );

      if (error) throw error;

      fetchGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const handleAddMilestone = async (milestoneData) => {
    try {
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: {
            action: "createMilestone",
            habitData: {
              goalId: milestoneData.goalId,
              name: milestoneData.name,
              description: milestoneData.description,
              targetDate: milestoneData.targetDate
                ? milestoneData.targetDate.toISOString().split("T")[0]
                : null,
            },
          },
        },
      );

      if (error) throw error;

      setShowAddMilestoneForm(false);
      setSelectedGoal(null);
      fetchGoals();
    } catch (error) {
      console.error("Error adding milestone:", error);
    }
  };

  const handleEditMilestone = async (milestoneData) => {
    try {
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: {
            action: "updateMilestone",
            habitData: {
              milestoneId: selectedMilestone.id,
              name: milestoneData.name,
              description: milestoneData.description,
              targetDate: milestoneData.targetDate
                ? milestoneData.targetDate.toISOString().split("T")[0]
                : null,
              completed: milestoneData.completed,
            },
          },
        },
      );

      if (error) throw error;

      setShowEditMilestoneForm(false);
      setSelectedMilestone(null);
      setSelectedGoal(null);
      fetchGoals();
    } catch (error) {
      console.error("Error updating milestone:", error);
    }
  };

  const handleDeleteMilestone = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this milestone? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: {
            action: "deleteMilestone",
            habitData: { milestoneId: selectedMilestone.id },
          },
        },
      );

      if (error) throw error;

      setShowEditMilestoneForm(false);
      setSelectedMilestone(null);
      setSelectedGoal(null);
      fetchGoals();
    } catch (error) {
      console.error("Error deleting milestone:", error);
    }
  };

  const handleToggleMilestone = async (milestoneId, completed) => {
    try {
      console.log(
        `Toggling milestone ${milestoneId} to ${completed ? "completed" : "incomplete"}`,
      );
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-habits",
        {
          body: {
            action: "updateMilestone",
            habitData: {
              milestoneId,
              completed,
            },
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
        alert(`You earned ${data.xp_earned} XP!`);
      }

      // Refresh user level in navbar
      window.dispatchEvent(new Event("levelUpdated"));

      fetchGoals();
    } catch (error) {
      console.error("Error toggling milestone:", error);
      alert("Failed to update milestone. See console for details.");
    }
  };

  // Handler functions for UI interactions
  const handleAddGoalClick = () => setShowAddGoalForm(true);
  const handleCancelAddGoal = () => setShowAddGoalForm(false);
  const handleEditGoalClick = (goalId) => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      // Get linked habits
      const linkedHabits = goal.goal_habits?.map((gh) => gh.habit_id) || [];

      setSelectedGoal({
        ...goal,
        linkedHabits,
      });
      setShowEditGoalForm(true);
    }
  };
  const handleCancelEditGoal = () => {
    setShowEditGoalForm(false);
    setSelectedGoal(null);
  };

  const handleAddMilestoneClick = (goalId) => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      setSelectedGoal(goal);
      setShowAddMilestoneForm(true);
    }
  };
  const handleCancelAddMilestone = () => {
    setShowAddMilestoneForm(false);
    setSelectedGoal(null);
  };

  const handleEditMilestoneClick = (milestoneId, goalId) => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      const milestone = goal.milestones.find((m) => m.id === milestoneId);
      if (milestone) {
        setSelectedGoal(goal);
        setSelectedMilestone(milestone);
        setShowEditMilestoneForm(true);
      }
    }
  };
  const handleCancelEditMilestone = () => {
    setShowEditMilestoneForm(false);
    setSelectedMilestone(null);
    setSelectedGoal(null);
  };

  return (
    <>
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
                <h1 className="text-3xl font-bold">My Goals</h1>
                <p className="text-muted-foreground">
                  Set goals and track your progress with milestones
                </p>
              </div>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleAddGoalClick}
            >
              <Plus className="mr-2 h-5 w-5" />
              Add New Goal
            </Button>
          </header>

          {/* Main Content */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : goals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((goal) => (
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
                  onEdit={handleEditGoalClick}
                  onDelete={handleDeleteGoal}
                  onAddMilestone={handleAddMilestoneClick}
                  onEditMilestone={handleEditMilestoneClick}
                  onToggleMilestone={handleToggleMilestone}
                />
              ))}
            </div>
          ) : (
            <div className="h-64 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 text-center">
              <Plus className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-1">Add Your First Goal</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set goals to track your progress and stay motivated
              </p>
              <Button
                className="bg-gradient-to-r from-secondary to-secondary/90 hover:brightness-110 shadow-md"
                onClick={handleAddGoalClick}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Goal
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Add Goal Dialog */}
      <Dialog open={showAddGoalForm} onOpenChange={setShowAddGoalForm}>
        <DialogContent className="sm:max-w-md">
          <GoalForm
            onSubmit={handleAddGoal}
            onCancel={handleCancelAddGoal}
            habits={habits}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={showEditGoalForm} onOpenChange={setShowEditGoalForm}>
        <DialogContent className="sm:max-w-md">
          {selectedGoal && (
            <GoalForm
              initialData={{
                id: selectedGoal.id,
                name: selectedGoal.name,
                description: selectedGoal.description || "",
                targetDate: selectedGoal.target_date,
                status: selectedGoal.status,
                linkedHabits: selectedGoal.linkedHabits || [],
              }}
              habits={habits}
              onSubmit={handleEditGoal}
              onCancel={handleCancelEditGoal}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Milestone Dialog */}
      <Dialog
        open={showAddMilestoneForm}
        onOpenChange={setShowAddMilestoneForm}
      >
        <DialogContent className="sm:max-w-md">
          {selectedGoal && (
            <MilestoneForm
              goalId={selectedGoal.id}
              goalName={selectedGoal.name}
              onSubmit={handleAddMilestone}
              onCancel={handleCancelAddMilestone}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Milestone Dialog */}
      <Dialog
        open={showEditMilestoneForm}
        onOpenChange={setShowEditMilestoneForm}
      >
        <DialogContent className="sm:max-w-md">
          {selectedGoal && selectedMilestone && (
            <MilestoneForm
              goalId={selectedGoal.id}
              goalName={selectedGoal.name}
              initialData={{
                id: selectedMilestone.id,
                name: selectedMilestone.name,
                description: selectedMilestone.description || "",
                targetDate: selectedMilestone.target_date,
                completed: selectedMilestone.completed,
              }}
              onSubmit={handleEditMilestone}
              onCancel={handleCancelEditMilestone}
              onDelete={handleDeleteMilestone}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
