import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Switch } from "./switch";

interface MilestoneFormProps {
  goalId: string;
  goalName: string;
  initialData?: {
    id?: string;
    name: string;
    description: string;
    targetDate?: Date | string;
    completed?: boolean;
    xpValue?: number;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isEditing?: boolean;
}

export default function MilestoneForm({
  goalId,
  goalName,
  initialData = {
    name: "",
    description: "",
    completed: false,
    xpValue: 20,
  },
  onSubmit,
  onCancel,
  onDelete,
  isEditing = false,
}: MilestoneFormProps) {
  // Convert string date to Date object if needed
  const initialDate = initialData.targetDate
    ? typeof initialData.targetDate === "string"
      ? new Date(initialData.targetDate)
      : initialData.targetDate
    : undefined;

  const [formData, setFormData] = useState({
    ...initialData,
    goalId,
    targetDate: initialDate,
  });
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDateChange = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setFormData((prev) => ({ ...prev, targetDate: selectedDate }));
  };

  const handleCompletedChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, completed: checked }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Milestone name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Milestone" : "Add Milestone"}</CardTitle>
        <CardDescription>
          {isEditing
            ? "Update milestone details below"
            : `Add a milestone for your "${goalName}" goal`}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Milestone Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Complete 5K training"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add details about this milestone"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="xpValue">XP Value</Label>
            <Input
              id="xpValue"
              name="xpValue"
              type="number"
              min="1"
              max="200"
              value={formData.xpValue || 20}
              onChange={handleChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              XP earned when this milestone is completed (1-200)
            </p>
          </div>

          {isEditing && (
            <div className="flex items-center justify-between">
              <Label htmlFor="completed">Mark as Completed</Label>
              <Switch
                id="completed"
                checked={formData.completed}
                onCheckedChange={handleCompletedChange}
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                size="icon"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button type="submit">
            {isEditing ? "Update Milestone" : "Add Milestone"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
