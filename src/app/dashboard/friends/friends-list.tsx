"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/utils";
import { FriendProfileCard } from "@/components/ui/friend-profile-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, RefreshCw, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function FriendsList() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friendCode, setFriendCode] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createClient();

  const fetchFriends = async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-manage-friends",
        {
          body: { action: "getFriends" },
        },
      );

      if (error) {
        console.error("Error fetching friends:", error);
        setError("Failed to load friends. Please try again.");
        return;
      }

      console.log("Friends data:", data);
      // Ensure we have the complete friend data structure
      const enrichedFriends = (data.friends || []).map((friendship) => {
        // Make sure we have a properly structured friend object
        const friendData = friendship.friend || {};

        // Create a properly structured friend object with all required fields
        const enrichedFriend = {
          id: friendship.friend_id || friendData.id || "",
          name:
            friendData.name ||
            friendship.name ||
            (friendData.email ? friendData.email.split("@")[0] : "Friend"),
          email: friendData.email || friendship.email,
          avatar_url: friendData.avatar_url || friendship.avatar_url,
          level: friendData.level || friendship.level || 1,
          xp: friendData.xp || friendship.xp || 0,
          xp_to_next_level:
            friendData.xp_to_next_level || friendship.xp_to_next_level || 100,
          achievements: Array.isArray(friendData.achievements)
            ? friendData.achievements
            : [],
        };

        console.log("Enriched friend data:", enrichedFriend);

        return {
          ...friendship,
          friend: enrichedFriend,
        };
      });
      setFriends(enrichedFriends);
    } catch (err) {
      console.error("Error in fetchFriends:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!friendCode.trim()) {
      setRequestMessage("Please enter a friend code");
      return;
    }

    try {
      setSendingRequest(true);
      setRequestMessage("");

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-manage-friends",
        {
          body: { action: "sendFriendRequest", friendCode: friendCode.trim() },
        },
      );

      if (error) {
        console.error("Error sending friend request:", error);
        setRequestMessage("Failed to send friend request. Please try again.");
        return;
      }

      setRequestMessage("Friend request sent successfully!");
      setFriendCode("");
      // Refresh friends list after sending request
      fetchFriends();
    } catch (err) {
      console.error("Error in sendFriendRequest:", err);
      setRequestMessage("An unexpected error occurred. Please try again.");
    } finally {
      setSendingRequest(false);
    }
  };

  const refreshFriends = () => {
    setRefreshing(true);
    fetchFriends();
  };

  useEffect(() => {
    fetchFriends();

    // Set up realtime subscription for friend requests
    const channel = supabase
      .channel("friends-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
        },
        () => {
          console.log("Friend request changed, refreshing friends list");
          fetchFriends();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        () => {
          console.log("User data changed, refreshing friends list");
          fetchFriends();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_achievements",
        },
        () => {
          console.log("User achievements changed, refreshing friends list");
          fetchFriends();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">My Friends</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshFriends}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        <div className="flex space-x-2">
          <Input
            placeholder="Enter friend code"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value)}
            className="max-w-xs"
          />
          <Button
            onClick={sendFriendRequest}
            disabled={sendingRequest || !friendCode.trim()}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Friend
          </Button>
        </div>

        {requestMessage && (
          <p
            className={`text-sm ${requestMessage.includes("success") ? "text-green-600" : "text-red-600"}`}
          >
            {requestMessage}
          </p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-lg bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : friends.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.map((friendship) => {
            console.log("Rendering friend:", friendship.friend);
            // Ensure we're passing a properly structured friend object with all required fields
            const friendData = friendship.friend || {};

            // Create a complete friend object with all required fields
            const completeFriend = {
              id: friendData.id || friendship.friend_id || "",
              name:
                friendData.name ||
                friendship.name ||
                (friendData.email ? friendData.email.split("@")[0] : "Friend"),
              email: friendData.email || friendship.email,
              avatar_url: friendData.avatar_url || friendship.avatar_url,
              level: friendData.level || friendship.level || 1,
              xp: friendData.xp || friendship.xp || 0,
              xp_to_next_level:
                friendData.xp_to_next_level ||
                friendship.xp_to_next_level ||
                100,
              achievements: Array.isArray(friendData.achievements)
                ? friendData.achievements
                : [],
            };

            return (
              <FriendProfileCard
                key={friendship.id || friendship.friend_id}
                friend={completeFriend}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium">No friends yet</h3>
          <p className="text-muted-foreground mt-2">
            Add friends using their friend code to see them here.
          </p>
        </div>
      )}
    </div>
  );
}
