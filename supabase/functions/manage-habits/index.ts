import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API ANON KEY - env var exported by default
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      // Create client with Auth context of the user that called the function
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // Get the user from the auth header
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Parse the request body
    const { action, habitId, habitData, date, notes } = await req.json();

    // Handle different actions
    switch (action) {
      // Goals and Milestones actions
      case "getGoals": {
        const { data, error } = await supabaseClient
          .from("goals")
          .select("*, milestones(*), goal_habits(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "createGoal": {
        console.log("Received createGoal request with data:", habitData);
        const { name, description, targetDate, linkedHabits, xpValue } =
          habitData;

        if (!name) {
          console.log("Goal name is required");
          return new Response(
            JSON.stringify({ error: "Goal name is required" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        try {
          // Insert the new goal
          console.log("Inserting goal into database");
          const { data: goal, error: goalError } = await supabaseClient
            .from("goals")
            .insert({
              user_id: user.id,
              name,
              description: description || "",
              target_date: targetDate || null,
              status: "in_progress",
              xp_value: xpValue || 50,
            })
            .select()
            .single();

          if (goalError) {
            console.error("Error inserting goal:", goalError);
            throw goalError;
          }

          console.log("Goal created successfully:", goal);

          // Link habits if provided
          if (linkedHabits && linkedHabits.length > 0) {
            console.log("Linking habits to goal:", linkedHabits);
            const habitLinks = linkedHabits.map((habitId) => ({
              goal_id: goal.id,
              habit_id: habitId,
            }));

            const { error: linkError } = await supabaseClient
              .from("goal_habits")
              .insert(habitLinks);

            if (linkError) {
              console.error("Error linking habits:", linkError);
              throw linkError;
            }
          }

          return new Response(JSON.stringify(goal), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
          });
        } catch (error) {
          console.error("Error in createGoal:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          });
        }
      }

      case "updateGoal": {
        const {
          goalId,
          name,
          description,
          targetDate,
          status,
          linkedHabits,
          xpValue,
        } = habitData;

        if (!goalId) {
          return new Response(
            JSON.stringify({ error: "Goal ID is required" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Update the goal
        const { data: goal, error: goalError } = await supabaseClient
          .from("goals")
          .update({
            name,
            description,
            target_date: targetDate,
            status,
            xp_value: xpValue,
            updated_at: new Date().toISOString(),
          })
          .eq("id", goalId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (goalError) throw goalError;

        // Update linked habits if provided
        if (linkedHabits) {
          // First delete existing links
          const { error: deleteError } = await supabaseClient
            .from("goal_habits")
            .delete()
            .eq("goal_id", goalId);

          if (deleteError) throw deleteError;

          // Then add new links if there are any
          if (linkedHabits.length > 0) {
            const habitLinks = linkedHabits.map((habitId) => ({
              goal_id: goalId,
              habit_id: habitId,
            }));

            const { error: linkError } = await supabaseClient
              .from("goal_habits")
              .insert(habitLinks);

            if (linkError) throw linkError;
          }
        }

        return new Response(JSON.stringify(goal), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "deleteGoal": {
        const { goalId } = habitData;

        if (!goalId) {
          return new Response(
            JSON.stringify({ error: "Goal ID is required" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Delete the goal (cascades to milestones and goal_habits)
        const { error } = await supabaseClient
          .from("goals")
          .delete()
          .eq("id", goalId)
          .eq("user_id", user.id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "createMilestone": {
        const { goalId, name, description, targetDate, xpValue } = habitData;

        if (!goalId || !name) {
          return new Response(
            JSON.stringify({
              error: "Goal ID and milestone name are required",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Verify the goal belongs to the user
        const { data: goal, error: goalError } = await supabaseClient
          .from("goals")
          .select("id")
          .eq("id", goalId)
          .eq("user_id", user.id)
          .single();

        if (goalError) {
          return new Response(JSON.stringify({ error: "Goal not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }

        // Insert the milestone
        const { data: milestone, error: milestoneError } = await supabaseClient
          .from("milestones")
          .insert({
            goal_id: goalId,
            name,
            description: description || "",
            target_date: targetDate || null,
            completed: false,
            xp_value: xpValue || 20,
          })
          .select()
          .single();

        if (milestoneError) throw milestoneError;

        return new Response(JSON.stringify(milestone), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        });
      }

      case "updateMilestone": {
        const {
          milestoneId,
          name,
          description,
          targetDate,
          completed,
          xpValue,
        } = habitData;

        if (!milestoneId) {
          return new Response(
            JSON.stringify({ error: "Milestone ID is required" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Get the current milestone to check if it's being completed
        const { data: currentMilestone, error: fetchError } =
          await supabaseClient
            .from("milestones")
            .select("id, completed, xp_value, goal_id")
            .eq("id", milestoneId)
            .single();

        if (fetchError) throw fetchError;

        const updateData: any = {
          name,
          description,
          target_date: targetDate,
          xp_value: xpValue,
          updated_at: new Date().toISOString(),
        };

        // Check if milestone is being completed for the first time
        const isNewlyCompleted =
          completed === true && currentMilestone.completed === false;

        // Only update completed status if it's provided
        if (completed !== undefined) {
          updateData.completed = completed;
          if (completed) {
            updateData.completed_date = new Date().toISOString().split("T")[0];
          } else {
            updateData.completed_date = null;
          }
        }

        // Update the milestone
        const { data: milestone, error: milestoneError } = await supabaseClient
          .from("milestones")
          .update(updateData)
          .eq("id", milestoneId)
          .select()
          .single();

        if (milestoneError) throw milestoneError;

        // Award XP if the milestone is being completed for the first time
        let xpEarned = 0;
        if (isNewlyCompleted) {
          console.log(`Milestone ${milestoneId} newly completed, awarding XP`);
          const xpAmount = currentMilestone.xp_value || 20; // Default to 20 XP
          console.log(`XP amount for milestone: ${xpAmount}`);
          try {
            const result = await awardXP(
              supabaseClient,
              user.id,
              xpAmount,
              "milestone",
              milestoneId,
              `Completed milestone: ${name || milestoneId}`,
            );
            console.log("XP award result:", result);
            xpEarned = xpAmount;
          } catch (xpError) {
            console.error("Failed to award XP for milestone:", xpError);
          }

          // Check if all milestones for this goal are completed
          const { data: goalMilestones, error: goalMilestonesError } =
            await supabaseClient
              .from("milestones")
              .select("id, completed")
              .eq("goal_id", currentMilestone.goal_id);

          if (!goalMilestonesError && goalMilestones) {
            const allCompleted = goalMilestones.every(
              (m) => m.completed === true,
            );

            // If all milestones are completed, update the goal status to completed
            if (allCompleted) {
              const { data: goal, error: goalError } = await supabaseClient
                .from("goals")
                .select("id, status, xp_value")
                .eq("id", currentMilestone.goal_id)
                .single();

              if (!goalError && goal && goal.status !== "completed") {
                // Update goal status
                await supabaseClient
                  .from("goals")
                  .update({
                    status: "completed",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", currentMilestone.goal_id);

                // Award XP for completing the goal
                console.log(`Goal ${goal.id} completed, awarding XP`);
                const goalXpAmount = goal.xp_value || 50; // Default to 50 XP
                console.log(`XP amount for goal: ${goalXpAmount}`);
                try {
                  const result = await awardXP(
                    supabaseClient,
                    user.id,
                    goalXpAmount,
                    "goal",
                    goal.id,
                    `Completed goal: ${goal.name || goal.id}`,
                  );
                  console.log("XP award result for goal:", result);
                  xpEarned += goalXpAmount;
                } catch (xpError) {
                  console.error("Failed to award XP for goal:", xpError);
                }
              }
            }
          }
        }

        return new Response(
          JSON.stringify({ ...milestone, xp_earned: xpEarned }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }

      case "deleteMilestone": {
        const { milestoneId } = habitData;

        if (!milestoneId) {
          return new Response(
            JSON.stringify({ error: "Milestone ID is required" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Delete the milestone
        const { error } = await supabaseClient
          .from("milestones")
          .delete()
          .eq("id", milestoneId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Habits actions
      case "getHabits": {
        const { data, error } = await supabaseClient
          .from("habits")
          .select("*, habit_completions(*), habit_streaks(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Process the data to include today's completion status
        const today = new Date().toISOString().split("T")[0];
        const processedHabits = data.map((habit) => {
          const todayCompletion = habit.habit_completions.find(
            (completion: any) => completion.completed_date === today,
          );

          return {
            ...habit,
            isCompleted: !!todayCompletion,
            streak: habit.habit_streaks[0]?.current_streak || 0,
            longestStreak: habit.habit_streaks[0]?.longest_streak || 0,
            lastCompleted: habit.habit_streaks[0]?.last_completed_date || null,
          };
        });

        return new Response(JSON.stringify(processedHabits), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "createHabit": {
        // Validate required fields
        if (!habitData.name || !habitData.frequency) {
          return new Response(
            JSON.stringify({ error: "Name and frequency are required" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Insert the new habit
        const { data: habit, error: habitError } = await supabaseClient
          .from("habits")
          .insert({
            user_id: user.id,
            name: habitData.name,
            description: habitData.description || "",
            frequency: habitData.frequency,
            reminder_time: habitData.reminderTime || null,
            reminder_enabled: habitData.reminderEnabled || false,
            xp_value: habitData.xpValue || 10,
          })
          .select()
          .single();

        if (habitError) throw habitError;

        // Initialize streak record
        const { error: streakError } = await supabaseClient
          .from("habit_streaks")
          .insert({
            habit_id: habit.id,
            user_id: user.id,
            current_streak: 0,
            longest_streak: 0,
          });

        if (streakError) throw streakError;

        return new Response(JSON.stringify(habit), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        });
      }

      case "updateHabit": {
        if (!habitId) {
          return new Response(
            JSON.stringify({ error: "Habit ID is required" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Update the habit
        const { data, error } = await supabaseClient
          .from("habits")
          .update({
            name: habitData.name,
            description: habitData.description,
            frequency: habitData.frequency,
            reminder_time: habitData.reminderTime,
            reminder_enabled: habitData.reminderEnabled,
            xp_value: habitData.xpValue,
            updated_at: new Date().toISOString(),
          })
          .eq("id", habitId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "deleteHabit": {
        if (!habitId) {
          return new Response(
            JSON.stringify({ error: "Habit ID is required" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Delete the habit
        const { error } = await supabaseClient
          .from("habits")
          .delete()
          .eq("id", habitId)
          .eq("user_id", user.id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "checkInHabit": {
        if (!habitId || !date) {
          return new Response(
            JSON.stringify({ error: "Habit ID and date are required" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Check if the habit exists and belongs to the user
        const { data: habit, error: habitError } = await supabaseClient
          .from("habits")
          .select("id, xp_value")
          .eq("id", habitId)
          .eq("user_id", user.id)
          .single();

        if (habitError) {
          return new Response(JSON.stringify({ error: "Habit not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }

        // Insert the completion record
        const { data: completion, error: completionError } =
          await supabaseClient
            .from("habit_completions")
            .insert({
              habit_id: habitId,
              user_id: user.id,
              completed_date: date,
              notes: notes || null,
            })
            .select()
            .single();

        if (completionError) {
          // Check if it's a unique constraint violation (already completed)
          if (completionError.code === "23505") {
            return new Response(
              JSON.stringify({
                error: "Habit already completed for this date",
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 409,
              },
            );
          }
          throw completionError;
        }

        // Update the streak
        await updateStreak(supabaseClient, habitId, user.id, date);

        // Award XP for completing the habit
        console.log(`Habit ${habitId} completed, awarding XP`);
        const xpAmount = habit.xp_value || 10; // Default to 10 XP if not set
        console.log(`XP amount for habit: ${xpAmount}`);
        let xpResult;
        try {
          xpResult = await awardXP(
            supabaseClient,
            user.id,
            xpAmount,
            "habit",
            habitId,
            `Completed habit: ${habit.name || habitId}`,
          );
          console.log("XP award result for habit:", xpResult);
        } catch (xpError) {
          console.error("Failed to award XP for habit:", xpError);
        }

        return new Response(
          JSON.stringify({
            ...completion,
            xp_earned: xpAmount,
            xp_result: xpResult,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
          },
        );
      }

      case "getHabitCompletions": {
        if (!habitId) {
          return new Response(
            JSON.stringify({ error: "Habit ID is required" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Get all completions for the habit
        const { data, error } = await supabaseClient
          .from("habit_completions")
          .select("*")
          .eq("habit_id", habitId)
          .eq("user_id", user.id)
          .order("completed_date", { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper function to award XP and update user level
async function awardXP(
  supabase,
  userId,
  amount,
  sourceType,
  sourceId,
  description,
) {
  try {
    console.log(
      `Awarding ${amount} XP to user ${userId} for ${sourceType} ${sourceId}`,
    );

    // First, record the XP transaction in history
    const { data: historyData, error: historyError } = await supabase
      .from("xp_history")
      .insert({
        user_id: userId,
        amount,
        source_type: sourceType,
        source_id: sourceId,
        description,
      })
      .select();

    if (historyError) {
      console.error("Error recording XP history:", historyError);
      throw historyError;
    }

    console.log("XP history recorded successfully:", historyData);

    // Get current user level or create if it doesn't exist
    const { data: userLevel, error: levelError } = await supabase
      .from("user_levels")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (levelError && levelError.code !== "PGRST116") {
      console.error("Error fetching user level:", levelError);
      throw levelError;
    }

    // Calculate XP needed for next level (increases with each level)
    const calculateXpForNextLevel = (level) => 100 * Math.pow(1.5, level - 1);

    if (!userLevel) {
      console.log("No user level found, creating new record");
      // Create new user level record
      const newXp = amount;
      const newLevel = 1;
      const xpForNextLevel = calculateXpForNextLevel(newLevel);
      const finalLevel = newXp >= xpForNextLevel ? 2 : 1;
      const finalXp = finalLevel > 1 ? newXp - xpForNextLevel : newXp;

      const { data: insertData, error: insertError } = await supabase
        .from("user_levels")
        .insert({
          user_id: userId,
          current_level: finalLevel,
          current_xp: finalXp,
          total_xp_earned: amount,
        })
        .select();

      if (insertError) {
        console.error("Error creating user level:", insertError);
        throw insertError;
      }

      console.log("Created new user level:", insertData);

      return { levelUp: finalLevel > 1, newLevel: finalLevel };
    } else {
      console.log("Existing user level found:", userLevel);
      // Update existing user level
      let { current_level, current_xp, total_xp_earned } = userLevel;
      const newTotalXp = total_xp_earned + amount;
      let newXp = current_xp + amount;
      let newLevel = current_level;
      let levelUp = false;

      // Check if user leveled up
      while (newXp >= calculateXpForNextLevel(newLevel)) {
        newXp -= calculateXpForNextLevel(newLevel);
        newLevel++;
        levelUp = true;
      }

      console.log(
        `Updating user level: Level ${current_level} -> ${newLevel}, XP ${current_xp} -> ${newXp}, Total XP ${total_xp_earned} -> ${newTotalXp}`,
      );

      // Update user level
      const { data: updateData, error: updateError } = await supabase
        .from("user_levels")
        .update({
          current_level: newLevel,
          current_xp: newXp,
          total_xp_earned: newTotalXp,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select();

      if (updateError) {
        console.error("Error updating user level:", updateError);
        throw updateError;
      }

      console.log("Updated user level:", updateData);

      return { levelUp, newLevel };
    }
  } catch (error) {
    console.error("Error awarding XP:", error);
    throw error;
  }
}

// Helper function to update streak information
async function updateStreak(supabase, habitId, userId, completionDate) {
  try {
    // Get the habit's frequency
    const { data: habit, error: habitError } = await supabase
      .from("habits")
      .select("frequency")
      .eq("id", habitId)
      .single();

    if (habitError) throw habitError;

    // Get all completions for this habit, ordered by date
    const { data: completions, error: completionsError } = await supabase
      .from("habit_completions")
      .select("completed_date")
      .eq("habit_id", habitId)
      .order("completed_date", { ascending: true });

    if (completionsError) throw completionsError;

    // Get current streak data
    const { data: streakData, error: streakError } = await supabase
      .from("habit_streaks")
      .select("*")
      .eq("habit_id", habitId)
      .eq("user_id", userId)
      .single();

    if (streakError && streakError.code !== "PGRST116") throw streakError;

    // Calculate the current streak
    const dates = completions.map((c) => new Date(c.completed_date));
    const frequency = habit.frequency;
    const currentStreak = calculateStreak(dates, frequency);
    const longestStreak = streakData
      ? Math.max(currentStreak, streakData.longest_streak || 0)
      : currentStreak;

    // Update or insert streak record
    const { error: updateError } = await supabase.from("habit_streaks").upsert({
      habit_id: habitId,
      user_id: userId,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completed_date: completionDate,
      updated_at: new Date().toISOString(),
    });

    if (updateError) throw updateError;

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error("Error updating streak:", error);
    throw error;
  }
}

// Helper function to calculate streak based on completion dates and frequency
function calculateStreak(dates, frequency) {
  if (dates.length === 0) return 0;

  // Sort dates in descending order (newest first)
  dates.sort((a, b) => b.getTime() - a.getTime());

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mostRecentDate = dates[0];
  mostRecentDate.setHours(0, 0, 0, 0);

  // If the most recent completion is not today or yesterday, streak is just 1
  const dayDiff = Math.floor(
    (today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (dayDiff > 1) return 1;

  // Check consecutive days based on frequency
  for (let i = 1; i < dates.length; i++) {
    const currentDate = dates[i - 1];
    const prevDate = dates[i];

    currentDate.setHours(0, 0, 0, 0);
    prevDate.setHours(0, 0, 0, 0);

    const daysBetween = Math.floor(
      (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (frequency === "daily" && daysBetween === 1) {
      streak++;
    } else if (frequency === "weekdays") {
      // For weekdays, we need to check if the previous completion was the last weekday
      const isWeekday = (date) => date.getDay() !== 0 && date.getDay() !== 6;
      if (isWeekday(currentDate) && isWeekday(prevDate)) {
        // Calculate business days between
        let businessDays = 0;
        const tempDate = new Date(prevDate.getTime());
        while (tempDate < currentDate) {
          tempDate.setDate(tempDate.getDate() + 1);
          if (isWeekday(tempDate)) businessDays++;
        }
        if (businessDays === 1) streak++;
        else break;
      } else break;
    } else if (frequency === "weekends") {
      // For weekends, check if the previous completion was last weekend
      const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend(currentDate) && isWeekend(prevDate)) {
        // Check if these are consecutive weekends
        const weeksBetween = Math.floor(daysBetween / 7);
        if (weeksBetween <= 1) streak++;
        else break;
      } else break;
    } else if (frequency === "weekly") {
      // For weekly, check if the previous completion was about a week ago
      if (daysBetween >= 6 && daysBetween <= 8) streak++;
      else break;
    } else {
      // Default to daily
      if (daysBetween === 1) streak++;
      else break;
    }
  }

  return streak;
}
