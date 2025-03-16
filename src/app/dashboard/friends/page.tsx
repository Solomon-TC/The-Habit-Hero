"use client";

import { useEffect, useState } from "react";
import DashboardNavbar from "@/components/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "../../../../supabase/client";
import { useRouter } from "next/navigation";
import {
  Copy,
  Loader2,
  RefreshCw,
  UserPlus,
  Users,
  UserX,
  Check,
  X,
  UserCircle,
} from "lucide-react";
import { FriendProfileCard } from "@/components/ui/friend-profile-card";
import { Badge } from "@/components/ui/badge";
import Confetti from "@/components/confetti";

export default function Friends() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendCode, setFriendCode] = useState("");
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);
  const [addFriendCode, setAddFriendCode] = useState("");
  const [addFriendError, setAddFriendError] = useState("");
  const [addFriendSuccess, setAddFriendSuccess] = useState("");
  const [addFriendLoading, setAddFriendLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

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
      } catch (error) {
        console.error("Authentication error:", error);
        router.push("/sign-in");
      }
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchFriendCode();
      fetchFriends();
      fetchFriendRequests();

      // Set up real-time subscription for friend requests and user data
      const client = createClient();

      // Friend requests subscription
      const friendRequestsSubscription = client
        .channel("friend-requests-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "friend_requests" },
          (payload) => {
            console.log("Friend request change detected:", payload);
            fetchFriendRequests();
            fetchFriends();
          },
        )
        .subscribe();

      // Users subscription for level and XP changes
      const usersSubscription = client
        .channel("users-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "users" },
          (payload) => {
            console.log("User data change detected:", payload);
            fetchFriends(); // Refresh friend data to get updated levels/XP
          },
        )
        .subscribe();

      // User achievements subscription
      const achievementsSubscription = client
        .channel("achievements-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_achievements" },
          (payload) => {
            console.log("New achievement detected:", payload);
            fetchFriends(); // Refresh friend data to get updated achievements
          },
        )
        .subscribe();

      // Achievements table subscription
      const achievementsTableSubscription = client
        .channel("achievements-table-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "achievements" },
          (payload) => {
            console.log("Achievement data change detected:", payload);
            fetchFriends(); // Refresh friend data to get updated achievements
          },
        )
        .subscribe();

      return () => {
        friendRequestsSubscription.unsubscribe();
        usersSubscription.unsubscribe();
        achievementsSubscription.unsubscribe();
        achievementsTableSubscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchFriendCode = async () => {
    try {
      if (!user?.id) return;

      console.log("Fetching friend code for user ID:", user.id);
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-generate-friend-code",
        {},
      );

      if (error) {
        console.error("Error fetching friend code:", error);
        return;
      }

      if (data?.friendCode) {
        console.log("Received friend code:", data.friendCode);
        setFriendCode(data.friendCode);
      }
    } catch (error) {
      console.error("Error fetching friend code:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateFriendCode = async () => {
    try {
      setGeneratingCode(true);
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-generate-friend-code",
        {},
      );

      if (error) {
        console.error("Error generating friend code:", error);
        return;
      }

      console.log("Generated friend code:", data);
      setFriendCode(data.friendCode);
    } catch (error) {
      console.error("Error generating friend code:", error);
    } finally {
      setGeneratingCode(false);
    }
  };

  const fetchFriends = async () => {
    try {
      console.log("Fetching friends data...");
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-friends",
        {
          body: { action: "getFriends" },
        },
      );

      if (error) {
        console.error("Error fetching friends:", error);
        return;
      }

      console.log("Received friends data:", data?.friends);

      // Ensure we have valid data for each friend
      const processedFriends = (data?.friends || []).map((friendship) => {
        if (!friendship.friend) {
          friendship.friend = {};
        }

        // Ensure achievements is always an array
        if (!Array.isArray(friendship.friend.achievements)) {
          friendship.friend.achievements = [];
        }

        return friendship;
      });

      setFriends(processedFriends);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      setLoading(true);
      const client = createClient();
      const { data, error } = await client.functions.invoke(
        "supabase-functions-manage-friends",
        {
          body: { action: "getFriendRequests" },
        },
      );

      if (error) {
        console.error("Error fetching friend requests:", error);
        return;
      }

      console.log("Received friend requests:", data?.requests);
      setFriendRequests(data?.requests || []);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    try {
      setAddFriendLoading(true);
      setAddFriendError("");
      setAddFriendSuccess("");

      if (!addFriendCode.trim()) {
        setAddFriendError("Please enter a friend code");
        return;
      }

      console.log("Sending friend request with code:", addFriendCode);
      const client = createClient();
      const response = await client.functions.invoke(
        "supabase-functions-manage-friends",
        {
          body: { action: "sendFriendRequest", friendCode: addFriendCode },
        },
      );

      console.log("Full response:", response);
      const { data, error } = response;

      if (error) {
        console.error("Error from edge function:", error);
        // Extract error details if available
        let errorMessage = error.message || "Failed to send friend request";
        if (response.error?.details) {
          console.error("Error details:", response.error.details);
        }
        setAddFriendError(errorMessage);
        return;
      }

      setAddFriendSuccess(data?.message || "Friend request sent successfully");
      setAddFriendCode("");
      fetchFriendRequests();
      fetchFriends();

      // Show confetti if auto-accepted
      if (data?.message?.includes("automatically")) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      // Close dialog after a delay
      setTimeout(() => {
        setShowAddFriendDialog(false);
        setAddFriendSuccess("");
      }, 2000);
    } catch (error) {
      console.error("Error adding friend:", error);
      setAddFriendError("An unexpected error occurred. Please try again.");
    } finally {
      setAddFriendLoading(false);
    }
  };

  const handleRespondToFriendRequest = async (requestId, status) => {
    try {
      const client = createClient();
      const response = await client.functions.invoke(
        "supabase-functions-manage-friends",
        {
          body: {
            action: "respondToFriendRequest",
            friendRequestId: requestId,
            status,
          },
        },
      );

      console.log("Response to friend request:", response);
      const { data, error } = response;

      if (error) {
        console.error("Error responding to friend request:", error);
        // You could add a toast notification here to inform the user
        return;
      }

      fetchFriendRequests();
      fetchFriends();

      // Show confetti if accepted
      if (status === "accepted") {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (error) {
      console.error("Error responding to friend request:", error);
      // You could add a toast notification here to inform the user
    }
  };

  const handleRemoveFriend = async (friendRequestId) => {
    if (!confirm("Are you sure you want to remove this friend?")) {
      return;
    }

    try {
      const client = createClient();
      const response = await client.functions.invoke(
        "supabase-functions-manage-friends",
        {
          body: {
            action: "removeFriend",
            friendRequestId,
          },
        },
      );

      console.log("Remove friend response:", response);
      const { data, error } = response;

      if (error) {
        console.error("Error removing friend:", error);
        // You could add a toast notification here to inform the user
        return;
      }

      fetchFriends();
    } catch (error) {
      console.error("Error removing friend:", error);
      // You could add a toast notification here to inform the user
    }
  };

  const copyFriendCode = () => {
    navigator.clipboard.writeText(friendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
              <h1 className="text-3xl font-bold">Friends</h1>
              <p className="text-muted-foreground">
                Connect with friends and track habits together
              </p>
            </div>
            <Button
              className="bg-gradient-to-r from-secondary to-secondary/90 hover:brightness-110 shadow-md"
              onClick={() => setShowAddFriendDialog(true)}
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Add Friend
            </Button>
          </header>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Friend Code */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="overflow-hidden border-2 border-secondary/10 shadow-sm">
                  <CardHeader>
                    <CardTitle>Your Friend Code</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {friendCode ? (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="bg-gradient-to-br from-secondary/10 to-primary/10 p-4 rounded-lg border-2 border-secondary/20 w-full text-center">
                          <p className="text-2xl font-bold tracking-wider">
                            {friendCode}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={copyFriendCode}
                          >
                            {copiedCode ? (
                              <>
                                <Check className="mr-2 h-4 w-4" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="mr-2 h-4 w-4" /> Copy Code
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          Share this code with friends to connect with them
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-4">
                        <p className="text-muted-foreground">
                          You don't have a friend code yet
                        </p>
                        <Button
                          onClick={generateFriendCode}
                          disabled={generatingCode}
                        >
                          {generatingCode ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Generate Friend Code
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Friend Requests */}
                <Card className="overflow-hidden border-2 border-secondary/10 shadow-sm">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Friend Requests</CardTitle>
                      {friendRequests.length > 0 && (
                        <Badge className="bg-secondary">
                          {friendRequests.length}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {friendRequests.length > 0 ? (
                      <div className="space-y-4">
                        {friendRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg hover:bg-secondary/10 transition-colors card-shine"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                                {request.sender?.avatar_url ? (
                                  <img
                                    src={request.sender.avatar_url}
                                    alt={request.sender.name || "User"}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <UserCircle className="h-6 w-6 text-secondary" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {request.sender?.name ||
                                    request.sender?.email ||
                                    "User"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Wants to be your friend
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() =>
                                  handleRespondToFriendRequest(
                                    request.id,
                                    "rejected",
                                  )
                                }
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 w-8 p-0 bg-gradient-to-r from-primary to-primary/90"
                                onClick={() =>
                                  handleRespondToFriendRequest(
                                    request.id,
                                    "accepted",
                                  )
                                }
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        No pending friend requests
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Friends List */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="overflow-hidden border-2 border-secondary/10 shadow-sm">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Your Friends</CardTitle>
                      <Badge className="bg-secondary">{friends.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {friends.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {friends.map((friendship) => (
                            <div key={friendship.id} className="relative group">
                              <FriendProfileCard
                                friend={{
                                  id: friendship.friend?.id || "",
                                  name:
                                    friendship.friend?.name ||
                                    friendship.friend?.email?.split("@")[0] ||
                                    "Friend",
                                  email: friendship.friend?.email,
                                  avatar_url: friendship.friend?.avatar_url,
                                  level: friendship.friend?.level || 1,
                                  xp: friendship.friend?.xp || 0,
                                  xp_to_next_level:
                                    friendship.friend?.xp_to_next_level || 100,
                                  achievements: Array.isArray(
                                    friendship.friend?.achievements,
                                  )
                                    ? friendship.friend.achievements
                                    : [],
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() =>
                                  handleRemoveFriend(friendship.id)
                                }
                              >
                                <UserX className="h-5 w-5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center animate-pulse-slow">
                          <Users className="h-8 w-8 text-secondary" />
                        </div>
                        <h3 className="text-xl font-medium">No Friends Yet</h3>
                        <p className="text-muted-foreground text-center max-w-md">
                          Add friends using their friend code to see them here
                        </p>
                        <Button
                          className="mt-4 bg-gradient-to-r from-secondary to-secondary/90"
                          onClick={() => setShowAddFriendDialog(true)}
                        >
                          <UserPlus className="mr-2 h-5 w-5" />
                          Add Your First Friend
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Friend Activity - Future Feature */}
                {friends.length > 0 && (
                  <Card className="overflow-hidden border-2 border-secondary/10 shadow-sm">
                    <CardHeader>
                      <CardTitle>Friend Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <p className="text-muted-foreground text-center">
                          Friend activity tracking coming soon!
                        </p>
                        <p className="text-sm text-muted-foreground text-center max-w-md">
                          You'll be able to see your friends' habit streaks and
                          achievements here.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Friend Dialog */}
      <Dialog open={showAddFriendDialog} onOpenChange={setShowAddFriendDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Friend</DialogTitle>
            <DialogDescription>
              Enter your friend's code to send them a friend request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Enter friend code (e.g., ABC12345)"
              value={addFriendCode}
              onChange={(e) => setAddFriendCode(e.target.value.toUpperCase())}
              className="text-center tracking-wider"
              maxLength={10}
            />
            {addFriendError && (
              <p className="text-red-500 text-sm text-center">
                {addFriendError}
              </p>
            )}
            {addFriendSuccess && (
              <p className="text-green-500 text-sm text-center">
                {addFriendSuccess}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddFriendDialog(false);
                setAddFriendCode("");
                setAddFriendError("");
                setAddFriendSuccess("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFriend}
              disabled={addFriendLoading}
              className="bg-gradient-to-r from-secondary to-secondary/90"
            >
              {addFriendLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>Send Friend Request</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
