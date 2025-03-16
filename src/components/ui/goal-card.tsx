import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Target,
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
import { useState } from "react";
import { Progress } from "./progress";

interface GoalCardProps {
  goal: {
    id: string;
    name: string;
    description?: string;
    targetDate?: string;
    status: string;
    milestones: Array<{
      id: string;
      name: string;
      completed: boolean;
    }>;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddMilestone?: (goalId: string) => void;
  onEditMilestone?: (milestoneId: string, goalId: string) => void;
  onToggleMilestone?: (milestoneId: string, completed: boolean) => void;
}

export default function GoalCard({
  goal,
  onEdit = () => {},
  onDelete = () => {},
  onAddMilestone = () => {},
  onEditMilestone = () => {},
  onToggleMilestone = () => {},
}: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { id, name, description, targetDate, status, milestones = [] } = goal;

  // Calculate progress percentage
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const progressPercentage =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

  // Format the target date if it exists
  const formattedTargetDate = targetDate
    ? new Date(targetDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No target date";

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg card-shine border-2 hover:border-secondary/50">
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
              <DropdownMenuItem onClick={() => onEdit(id)}>
                Edit Goal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddMilestone(id)}>
                Add Milestone
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
        <CardDescription className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="capitalize">{status.replace("_", " ")}</span>
          {targetDate && (
            <>
              <span className="mx-1">•</span>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span>{formattedTargetDate}</span>
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {description && (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        )}

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span>Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <Button
          variant="ghost"
          className="w-full mt-4 flex items-center justify-center"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Milestones
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show Milestones ({completedMilestones}/{totalMilestones})
            </>
          )}
        </Button>

        {expanded && (
          <div className="mt-2 space-y-2">
            {milestones.length > 0 ? (
              milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-6 w-6 rounded-full ${milestone.completed ? "bg-green-100 text-green-600" : "bg-muted"}`}
                      onClick={() =>
                        onToggleMilestone(milestone.id, !milestone.completed)
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <span
                      className={
                        milestone.completed
                          ? "line-through text-muted-foreground"
                          : ""
                      }
                    >
                      {milestone.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onEditMilestone(milestone.id, id)}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-2 text-sm text-muted-foreground">
                No milestones yet. Add one to track your progress.
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => onAddMilestone(id)}
            >
              Add Milestone
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
