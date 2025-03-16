import {
  CheckCircle2,
  Calendar,
  BarChart3,
  Clock,
  MoreVertical,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

interface HabitCardProps {
  habit: {
    id: string;
    name: string;
    streak: number;
    completionRate: number;
    frequency: string;
    lastCompleted?: string;
    isCompleted?: boolean;
  };
  onCheckIn?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export default function HabitCard({
  habit,
  onCheckIn = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onViewDetails = () => {},
}: HabitCardProps) {
  const {
    id,
    name,
    streak,
    completionRate,
    frequency,
    lastCompleted,
    isCompleted,
  } = habit;

  // Format the last completed date if it exists
  const formattedLastCompleted = lastCompleted
    ? new Date(lastCompleted).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Never";

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg card-shine border-2 hover:border-primary/50">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(id)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(id)}>
                Edit Habit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(id)}
                className="text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardDescription>{frequency}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="flex flex-col items-center justify-center p-3 bg-primary/10 rounded-md border border-primary/20">
            <div className="flex items-center text-sm text-muted-foreground mb-1">
              <CheckCircle2 className="mr-1 h-4 w-4" />
              <span>Current Streak</span>
            </div>
            <p className="text-2xl font-bold">{streak} days</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-secondary/10 rounded-md border border-secondary/20">
            <div className="flex items-center text-sm text-muted-foreground mb-1">
              <BarChart3 className="mr-1 h-4 w-4" />
              <span>Completion Rate</span>
            </div>
            <p className="text-2xl font-bold">{completionRate}%</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="mr-1 h-4 w-4" />
            <span>Last completed: {formattedLastCompleted}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-1">
        <Button
          onClick={() => onCheckIn(id)}
          className={`w-full ${isCompleted ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gradient-to-r from-primary to-primary/90 hover:brightness-110"}`}
          disabled={isCompleted}
        >
          {isCompleted ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Completed Today
            </>
          ) : (
            <>
              <span className="relative inline-flex">
                Check In
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
              </span>
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
