import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";

interface HabitStatsProps {
  stats: {
    currentStreak: number;
    longestStreak: number;
    totalCompletions: number;
    completionRate: number;
    daysTracked: number;
  };
}

export default function HabitStats({ stats }: HabitStatsProps) {
  const {
    currentStreak,
    longestStreak,
    totalCompletions,
    completionRate,
    daysTracked,
  } = stats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            Current Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{currentStreak} days</div>
          <p className="text-xs text-muted-foreground mt-1">Keep it going!</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <TrendingUp className="mr-2 h-4 w-4 text-blue-500" />
            Longest Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{longestStreak} days</div>
          <p className="text-xs text-muted-foreground mt-1">
            Your personal best
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <BarChart3 className="mr-2 h-4 w-4 text-purple-500" />
            Completion Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{completionRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalCompletions} completions in {daysTracked} days
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
