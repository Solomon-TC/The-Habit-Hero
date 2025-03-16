import { UserCircle, Trophy, Star, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned_at: string;
}

interface FriendProfileCardProps {
  friend: {
    id: string;
    name?: string;
    email?: string;
    avatar_url?: string;
    level?: number;
    xp?: number;
    xp_to_next_level?: number;
    achievements?: Achievement[];
  };
}

export function FriendProfileCard({ friend }: FriendProfileCardProps) {
  // Default values if props are not provided
  const {
    name = "Friend",
    email,
    avatar_url,
    level = 1,
    xp = 0,
    xp_to_next_level = 100,
    achievements = [],
  } = friend || {};

  // Calculate XP progress percentage
  const xpProgress = Math.min(Math.round((xp / xp_to_next_level) * 100), 100);

  // Get recent achievements (up to 3)
  const recentAchievements = Array.isArray(achievements)
    ? achievements.slice(0, 3)
    : [];

  // Achievement icon mapping
  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case "trophy":
        return <Trophy className="h-4 w-4" />;
      case "star":
        return <Star className="h-4 w-4" />;
      default:
        return <Award className="h-4 w-4" />;
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-secondary/10 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Profile Header */}
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center overflow-hidden">
              {avatar_url ? (
                <img
                  src={avatar_url}
                  alt={name || "Friend"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle className="h-10 w-10 text-secondary" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{name || email}</h3>
              <div className="flex items-center mt-1">
                <Badge className="bg-gradient-to-r from-primary to-secondary text-white mr-2">
                  Level {level}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {xp}/{xp_to_next_level} XP
                </span>
              </div>
            </div>
          </div>

          {/* XP Progress */}
          <div className="space-y-1">
            <Progress value={xpProgress} className="h-2" />
            <p className="text-xs text-right text-muted-foreground">
              {xpProgress}% to Level {level + 1}
            </p>
          </div>

          {/* Recent Achievements */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Achievements</h4>
            {recentAchievements.length > 0 ? (
              <div className="space-y-2">
                {recentAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center p-2 bg-secondary/5 rounded-md"
                  >
                    <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center mr-3">
                      {getAchievementIcon(achievement.icon)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No achievements yet
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
