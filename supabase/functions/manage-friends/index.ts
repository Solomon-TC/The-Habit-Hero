import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper function to create consistent error responses
const createErrorResponse = (message, status = 400, details = null) => {
  console.error(`Error: ${message}`, details ? JSON.stringify(details) : "");
  return new Response(
    JSON.stringify({
      error: message,
      details: details,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    },
  );
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
      return createErrorResponse("Unauthorized", 401, userError);
    }

    // Parse the request body
    const requestData = await req.json();
    const { action, friendCode, friendRequestId, status } = requestData;

    console.log("Request data:", JSON.stringify(requestData));

    // Handle different actions
    switch (action) {
      case "sendFriendRequest": {
        if (!friendCode) {
          return createErrorResponse("Friend code is required");
        }

        console.log("Searching for user with friend code:", friendCode);
        // Find the user with the given friend code
        const { data: receiverData, error: receiverError } =
          await supabaseClient
            .from("friend_codes")
            .select("user_id, code")
            .eq("code", friendCode)
            .single();

        console.log("Receiver data:", receiverData, "Error:", receiverError);

        if (receiverError || !receiverData) {
          console.log("Error finding user with friend code:", receiverError);
          return createErrorResponse(
            "User with this friend code not found",
            404,
            { friendCode, receiverError },
          );
        }

        // Check if trying to add self
        if (receiverData.user_id === user.id) {
          return createErrorResponse("Cannot send friend request to yourself");
        }

        // Check if friend request already exists
        const { data: existingRequest, error: existingError } =
          await supabaseClient
            .from("friend_requests")
            .select("*")
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${receiverData.user_id}),and(sender_id.eq.${receiverData.user_id},receiver_id.eq.${user.id})`,
            )
            .single();

        if (existingRequest) {
          if (existingRequest.status === "accepted") {
            return createErrorResponse("Already friends with this user");
          } else if (
            existingRequest.status === "pending" &&
            existingRequest.sender_id === user.id
          ) {
            return createErrorResponse(
              "Friend request already sent to this user",
            );
          } else if (
            existingRequest.status === "pending" &&
            existingRequest.receiver_id === user.id
          ) {
            // Auto-accept if the other user already sent a request
            const { data: updatedRequest, error: updateError } =
              await supabaseClient
                .from("friend_requests")
                .update({ status: "accepted", updated_at: new Date() })
                .eq("id", existingRequest.id)
                .select()
                .single();

            if (updateError) {
              return createErrorResponse(updateError.message, 500, updateError);
            }

            return new Response(
              JSON.stringify({
                message: "Friend request accepted automatically",
                request: updatedRequest,
              }),
              {
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
                status: 200,
              },
            );
          }
        }

        // Create a new friend request
        const { data: newRequest, error: insertError } = await supabaseClient
          .from("friend_requests")
          .insert({
            sender_id: user.id,
            receiver_id: receiverData.user_id,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating friend request:", insertError);
          return createErrorResponse(
            insertError.message || "Failed to create friend request",
            500,
            { insertError, friendCode, receiverId: receiverData.user_id },
          );
        }

        console.log("Successfully created friend request:", newRequest);

        return new Response(
          JSON.stringify({
            message: "Friend request sent successfully",
            request: newRequest,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
          },
        );
      }

      case "respondToFriendRequest": {
        if (!friendRequestId || !status) {
          return createErrorResponse(
            "Friend request ID and status are required",
          );
        }

        if (status !== "accepted" && status !== "rejected") {
          return createErrorResponse("Invalid status value", 400, {
            providedStatus: status,
          });
        }

        // Check if the friend request exists and belongs to the user
        const { data: requestData, error: requestError } = await supabaseClient
          .from("friend_requests")
          .select("*")
          .eq("id", friendRequestId)
          .eq("receiver_id", user.id) // Only the receiver can respond
          .eq("status", "pending") // Only pending requests can be responded to
          .single();

        if (requestError) {
          return createErrorResponse(
            "Friend request not found or not authorized to respond",
            404,
            { friendRequestId, requestError },
          );
        }

        // Update the friend request status
        const { data: updatedRequest, error: updateError } =
          await supabaseClient
            .from("friend_requests")
            .update({ status, updated_at: new Date() })
            .eq("id", friendRequestId)
            .select()
            .single();

        if (updateError) {
          return createErrorResponse(updateError.message, 500, updateError);
        }

        return new Response(
          JSON.stringify({
            message: `Friend request ${status}`,
            request: updatedRequest,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }

      case "getFriendRequests": {
        // Get all pending friend requests where the user is the receiver
        const { data: requests, error: requestsError } = await supabaseClient
          .from("friend_requests")
          .select(
            "*, sender:sender_id(id, name, email, avatar_url), receiver:receiver_id(id, name, email, avatar_url)",
          )
          .eq("receiver_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (requestsError) {
          console.error("Error fetching friend requests:", requestsError);
          return createErrorResponse(requestsError.message, 500, requestsError);
        }

        console.log("Found friend requests:", requests?.length || 0);

        // If no requests, return empty array
        if (!requests || requests.length === 0) {
          return new Response(JSON.stringify({ requests: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Get friend codes for each sender
        const senderIds = requests
          .map((request) => request.sender.id)
          .filter(Boolean);

        if (senderIds.length > 0) {
          const { data: friendCodes, error: friendCodesError } =
            await supabaseClient
              .from("friend_codes")
              .select("user_id, code")
              .in("user_id", senderIds);

          // Add friend codes to the sender objects
          if (friendCodes && friendCodes.length > 0) {
            const friendCodeMap = {};
            friendCodes.forEach((fc) => {
              friendCodeMap[fc.user_id] = fc.code;
            });

            requests.forEach((request) => {
              if (request.sender && friendCodeMap[request.sender.id]) {
                request.sender.friend_code = friendCodeMap[request.sender.id];
              }
            });
          }
        }

        return new Response(JSON.stringify({ requests }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "getFriends": {
        // Get all accepted friend requests
        const { data: friends, error: friendsError } = await supabaseClient
          .from("friends")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (friendsError) {
          return createErrorResponse(friendsError.message, 500, friendsError);
        }

        // Get user details for each friend
        const friendIds = friends.map((f) => f.friend_id);
        const { data: friendDetails, error: friendDetailsError } =
          await supabaseClient
            .from("friends_with_details")
            .select("*")
            .in("friend_id", friendIds);

        if (friendDetailsError) {
          console.error("Error fetching friend details:", friendDetailsError);
        }

        // Get friend codes for each friend
        const { data: friendCodes, error: friendCodesError } =
          await supabaseClient
            .from("friend_codes")
            .select("user_id, code")
            .in("user_id", friendIds);

        if (friendCodesError) {
          console.error("Error fetching friend codes:", friendCodesError);
        }

        // Get recent achievements for each friend (only public ones)
        const { data: friendAchievements, error: achievementsError } =
          await supabaseClient
            .from("user_achievements_with_details")
            .select("*")
            .in("user_id", friendIds)
            .eq("is_public", true)
            .order("earned_at", { ascending: false });

        if (achievementsError) {
          console.error(
            "Error fetching friend achievements:",
            achievementsError,
          );
        }

        // Create a map of friend details
        const friendDetailsMap = {};
        if (friendDetails && Array.isArray(friendDetails)) {
          friendDetails.forEach((fd) => {
            if (fd && fd.friend_id) {
              friendDetailsMap[fd.friend_id] = fd;
            }
          });
        }

        // Create a map of friend codes
        const friendCodeMap = {};
        if (friendCodes && Array.isArray(friendCodes)) {
          friendCodes.forEach((fc) => {
            if (fc && fc.user_id) {
              friendCodeMap[fc.user_id] = fc.code;
            }
          });
        }

        // Create a map of friend achievements
        const friendAchievementsMap = {};
        if (friendAchievements && Array.isArray(friendAchievements)) {
          friendAchievements.forEach((achievement) => {
            if (achievement && achievement.user_id) {
              if (!friendAchievementsMap[achievement.user_id]) {
                friendAchievementsMap[achievement.user_id] = [];
              }
              friendAchievementsMap[achievement.user_id].push({
                id: achievement.id,
                title: achievement.title,
                description: achievement.description,
                icon: achievement.icon || "award",
                earned_at: achievement.earned_at,
              });
            }
          });
        }

        // Add friend details, codes, and achievements to each friendship
        const enrichedFriends = friends.map((friendship) => {
          const friendDetail = friendDetailsMap[friendship.friend_id] || {};
          const friendId = friendship.friend_id;

          // Ensure we have all required fields with defaults
          return {
            ...friendship,
            // Include these fields at the top level for backward compatibility
            name: friendDetail.name || "Friend",
            email: friendDetail.email,
            avatar_url: friendDetail.avatar_url,
            level: friendDetail.level || 1,
            xp: friendDetail.xp || 0,
            xp_to_next_level: friendDetail.xp_to_next_level || 100,
            // Also include them in the friend object for new structure
            friend: {
              id: friendId,
              name: friendDetail.name || "Friend",
              email: friendDetail.email,
              avatar_url: friendDetail.avatar_url,
              level: friendDetail.level || 1,
              xp: friendDetail.xp || 0,
              xp_to_next_level: friendDetail.xp_to_next_level || 100,
              friend_code: friendCodeMap[friendId] || null,
              achievements: friendAchievementsMap[friendId] || [],
            },
          };
        });

        console.log(
          "Enriched friends data sample:",
          enrichedFriends.length > 0
            ? JSON.stringify(enrichedFriends[0])
            : "No friends data",
        );

        console.log("Enriched friends data:", JSON.stringify(enrichedFriends));

        return new Response(JSON.stringify({ friends: enrichedFriends }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "removeFriend": {
        if (!friendRequestId) {
          return createErrorResponse("Friend request ID is required");
        }

        // Check if the friend request exists and belongs to the user
        const { data: requestData, error: requestError } = await supabaseClient
          .from("friend_requests")
          .select("*")
          .eq("id", friendRequestId)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq("status", "accepted")
          .single();

        if (requestError) {
          return createErrorResponse(
            "Friend relationship not found or not authorized to remove",
            404,
            { friendRequestId, requestError },
          );
        }

        // Delete the friend request
        const { error: deleteError } = await supabaseClient
          .from("friend_requests")
          .delete()
          .eq("id", friendRequestId);

        if (deleteError) {
          return createErrorResponse(deleteError.message, 500, deleteError);
        }

        return new Response(
          JSON.stringify({ message: "Friend removed successfully" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }

      default:
        return createErrorResponse("Invalid action", 400, {
          providedAction: action,
        });
    }
  } catch (error) {
    console.error("Error in manage-friends function:", error);
    return createErrorResponse(
      error.message || "An unexpected error occurred",
      500,
      { error: error.toString(), stack: error.stack },
    );
  }
});
